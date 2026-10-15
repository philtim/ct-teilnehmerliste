import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import type { Ref } from 'vue';
import { COPY } from '@/shared/copy';
import { buildCatalog, resolveColumns, selectionFor, toStored } from './columns';
import type { CellContext } from './columns';
import { GroupLoadError, loadGroup } from './members.api';
import { buildList } from './rows';
import { clearSelection, loadSelection, saveSelection } from './selection.store';
import type { GroupData } from './types';
import { buildSheets, exportFileName } from './workbook';

export type LoadState =
    | { phase: 'idle' }
    | { phase: 'loading' }
    | { phase: 'error'; reason: GroupLoadError['reason'] }
    | { phase: 'ready'; data: GroupData };

export type SaveState = 'idle' | 'saving' | 'saved' | 'failed';
export type DownloadState = { phase: 'idle' | 'working' } | { phase: 'error' };

/** Membership statuses that are off unless someone ticks them on. */
const OFF_BY_DEFAULT = new Set(['to_delete']);
/** Wait this long after the last tick before storing the choice. */
export const SAVE_DELAY_MS = 800;

/**
 * One group's list: load, filter, columns, families, download.
 *
 * The data is held in a `shallowRef` and never mutated — the computed values
 * below derive from it, so a filter or a ticked column rebuilds the list from
 * the same snapshot rather than asking ChurchTools again.
 */
export function useMemberList(groupId: Ref<number | null>) {
    const state = shallowRef<LoadState>({ phase: 'idle' });
    const selected = ref<Set<string>>(new Set());
    const statuses = ref<Set<string>>(new Set());
    const saveState = ref<SaveState>('idle');
    const download = ref<DownloadState>({ phase: 'idle' });

    const data = computed(() => (state.value.phase === 'ready' ? state.value.data : null));
    const catalog = computed(() =>
        data.value ? buildCatalog(data.value.groupFields, data.value.personFields) : [],
    );

    /** The statuses present in the group, in a fixed order, with their counts. */
    const statusCounts = computed(() => {
        const counts = new Map<string, number>();
        for (const m of data.value?.members ?? []) {
            counts.set(m.status, (counts.get(m.status) ?? 0) + 1);
        }
        return [...counts.entries()].sort(([a], [b]) => statusRank(a) - statusRank(b));
    });

    const visibleMembers = computed(() =>
        (data.value?.members ?? []).filter((m) => statuses.value.has(m.status)),
    );
    const list = computed(() => buildList(visibleMembers.value, data.value?.relationships ?? []));
    const columns = computed(() =>
        resolveColumns(catalog.value, selected.value, visibleMembers.value),
    );
    const cellContext = computed<CellContext>(() => {
        const keys = new Map(list.value.rows.map((r) => [r.member.personId, r.familyKey]));
        return { familyKeyOf: (id) => keys.get(id) ?? '' };
    });

    /**
     * What the preview has to say about the data before anyone relies on it —
     * as sentences, for the preview and for the file's Info sheet alike.
     */
    const hintTexts = computed(() => {
        const current = data.value;
        if (!current) return [];
        const members = visibleMembers.value;
        const notLoaded = members.filter((m) => !m.personLoaded).length;
        const withoutAddress = members.filter((m) => m.personLoaded && !m.street).length;
        return [
            current.fieldsUnreadable.group && COPY.hintGroupFieldsUnreadable,
            current.fieldsUnreadable.person && COPY.hintPersonFieldsUnreadable,
            current.relationshipProblem && COPY.relationshipProblem[current.relationshipProblem],
            notLoaded > 0 && COPY.hintNotLoaded(notLoaded),
            withoutAddress > 0 && COPY.hintWithoutAddress(withoutAddress),
        ].filter((t): t is string => typeof t === 'string');
    });

    /** Statuses left out of the list, with how many members each leaves out. */
    const excludedStatuses = computed(() =>
        statusCounts.value
            .filter(([status]) => !statuses.value.has(status))
            .map(([status, count]) => COPY.excludedStatus(COPY.memberStatus(status), count)),
    );

    let loadToken = 0;

    /**
     * The choice is stored a moment after the last tick, so ten ticks are one
     * write. A pending write is never dropped: loading another group, or the
     * view going away, sends it at once.
     */
    let saveTimer: ReturnType<typeof setTimeout> | undefined;
    let pendingSave: (() => Promise<void>) | null = null;

    function flushSave() {
        clearTimeout(saveTimer);
        const run = pendingSave;
        pendingSave = null;
        if (run) void run();
    }
    onScopeDispose(flushSave);

    async function load(id: number) {
        flushSave();
        const token = ++loadToken;
        state.value = { phase: 'loading' };
        saveState.value = 'idle';
        download.value = { phase: 'idle' };
        try {
            const [loaded, stored] = await Promise.all([loadGroup(id), loadSelection(id)]);
            if (token !== loadToken) return;
            selected.value = selectionFor(
                buildCatalog(loaded.groupFields, loaded.personFields),
                stored,
            );
            statuses.value = new Set(
                loaded.members.map((m) => m.status).filter((s) => !OFF_BY_DEFAULT.has(s)),
            );
            state.value = { phase: 'ready', data: loaded };
        } catch (e) {
            if (token !== loadToken) return;
            const reason = e instanceof GroupLoadError ? e.reason : 'failed';
            state.value = { phase: 'error', reason };
            console.error('[teilnehmerliste] load failed:', e);
        }
    }

    watch(
        groupId,
        (id) => {
            if (id === null) {
                flushSave();
                loadToken++;
                state.value = { phase: 'idle' };
            } else {
                void load(id);
            }
        },
        { immediate: true },
    );

    function setColumns(ids: string[], on: boolean) {
        const next = new Set(selected.value);
        for (const id of ids) {
            if (on) next.add(id);
            else next.delete(id);
        }
        selected.value = next;
        scheduleSave('store');
    }

    /**
     * Back to the defaults — by forgetting the stored choice rather than
     * storing the defaults as one, so a later change of defaults applies.
     */
    function resetColumns() {
        selected.value = selectionFor(catalog.value, null);
        scheduleSave('clear');
    }

    function setStatus(status: string, on: boolean) {
        const next = new Set(statuses.value);
        if (on) next.add(status);
        else next.delete(status);
        statuses.value = next;
    }

    function scheduleSave(kind: 'store' | 'clear') {
        const current = data.value;
        if (!current) return;
        clearTimeout(saveTimer);
        saveState.value = 'saving';
        const token = loadToken;
        const id = current.group.id;
        // Taken now: by the time the write runs, another group may be loaded.
        const catalogNow = catalog.value;
        const selectedNow = new Set(selected.value);
        pendingSave = async () => {
            const ok =
                kind === 'clear'
                    ? await clearSelection(id)
                    : await saveSelection(id, (previous) =>
                          toStored(catalogNow, selectedNow, previous),
                      );
            if (token === loadToken) saveState.value = ok ? 'saved' : 'failed';
        };
        saveTimer = setTimeout(flushSave, SAVE_DELAY_MS);
    }

    async function downloadExcel() {
        const current = data.value;
        if (!current || download.value.phase === 'working') return;
        download.value = { phase: 'working' };
        try {
            // Everything the file shows is taken now, before the writer loads:
            // a reload in the meantime must not put another state under this name.
            const sheets = buildSheets(list.value, columns.value, cellContext.value, {
                group: current.group,
                loadedAt: current.loadedAt,
                excludedStatuses: excludedStatuses.value,
                notes: hintTexts.value,
                version: __APP_VERSION__,
                commit: __APP_COMMIT__,
            });
            const fileName = exportFileName(current.group.name, new Date());
            // The writer is loaded on first use only (ADR-008).
            const { downloadWorkbook } = await import('./xlsx');
            await downloadWorkbook(sheets, fileName);
            download.value = { phase: 'idle' };
        } catch (e) {
            console.error('[teilnehmerliste] download failed:', e);
            download.value = { phase: 'error' };
        }
    }

    return {
        state,
        catalog,
        selected,
        statuses,
        statusCounts,
        list,
        columns,
        cellContext,
        hintTexts,
        saveState,
        download,
        reload: () => groupId.value !== null && load(groupId.value),
        setColumn: (id: string, on: boolean) => setColumns([id], on),
        setColumns,
        resetColumns,
        setStatus,
        downloadExcel,
    };
}

const STATUS_ORDER = ['active', 'requested', 'waiting', 'to_delete'];
function statusRank(status: string): number {
    const i = STATUS_ORDER.indexOf(status);
    return i === -1 ? STATUS_ORDER.length : i;
}
