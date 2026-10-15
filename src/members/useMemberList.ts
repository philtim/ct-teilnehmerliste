import { computed, ref, shallowRef, watch } from 'vue';
import type { Ref } from 'vue';
import { buildCatalog, COLUMN_ID, resolveColumns, selectionFor, toStored } from './columns';
import type { CellContext } from './columns';
import { GroupLoadError, loadGroup } from './members.api';
import { buildList } from './rows';
import { loadSelection, saveSelection } from './selection.store';
import type { GroupData } from './types';
import { buildSheets, exportFileName } from './workbook';

export type LoadState =
    | { phase: 'idle' }
    | { phase: 'loading' }
    | { phase: 'error'; reason: GroupLoadError['reason'] }
    | { phase: 'ready'; data: GroupData };

export type SaveState = 'idle' | 'saving' | 'saved' | 'failed';
export type DownloadState = { phase: 'idle' | 'working' } | { phase: 'error' };

/** Membership statuses that are on unless someone ticks them on. */
const OFF_BY_DEFAULT = new Set(['to_delete']);
/** Wait this long after the last tick before storing the choice. */
const SAVE_DELAY_MS = 800;

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

    /** What the preview has to say about the data before anyone relies on it. */
    const hints = computed(() => {
        const members = visibleMembers.value;
        return {
            notLoaded: members.filter((m) => !m.personLoaded).length,
            withoutAddress: members.filter((m) => m.personLoaded && !m.street).length,
            relationshipProblem: data.value?.relationshipProblem ?? null,
        };
    });

    let loadToken = 0;
    let saveTimer: ReturnType<typeof setTimeout> | undefined;

    async function load(id: number) {
        const token = ++loadToken;
        clearTimeout(saveTimer);
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
                loadToken++;
                state.value = { phase: 'idle' };
            } else {
                void load(id);
            }
        },
        { immediate: true },
    );

    function setColumn(id: string, on: boolean) {
        const next = new Set(selected.value);
        if (on) next.add(id);
        else next.delete(id);
        selected.value = next;
        scheduleSave();
    }

    function setColumns(ids: string[], on: boolean) {
        const next = new Set(selected.value);
        for (const id of ids) {
            if (on) next.add(id);
            else next.delete(id);
        }
        selected.value = next;
        scheduleSave();
    }

    function resetColumns() {
        selected.value = selectionFor(catalog.value, null);
        scheduleSave();
    }

    function setStatus(status: string, on: boolean) {
        const next = new Set(statuses.value);
        if (on) next.add(status);
        else next.delete(status);
        statuses.value = next;
    }

    function scheduleSave() {
        const current = data.value;
        if (!current) return;
        clearTimeout(saveTimer);
        saveState.value = 'saving';
        const token = loadToken;
        saveTimer = setTimeout(async () => {
            const ok = await saveSelection(
                current.group.id,
                toStored(catalog.value, selected.value),
            );
            if (token === loadToken) saveState.value = ok ? 'saved' : 'failed';
        }, SAVE_DELAY_MS);
    }

    async function downloadExcel() {
        const current = data.value;
        if (!current || download.value.phase === 'working') return;
        download.value = { phase: 'working' };
        try {
            // The writer is loaded on first use only (ADR-008).
            const { downloadWorkbook } = await import('./xlsx');
            const sheets = buildSheets(list.value, columns.value, cellContext.value, {
                group: current.group,
                loadedAt: current.loadedAt,
                version: __APP_VERSION__,
                commit: __APP_COMMIT__,
            });
            await downloadWorkbook(sheets, exportFileName(current.group.name, new Date()));
            download.value = { phase: 'idle' };
        } catch (e) {
            console.error('[teilnehmerliste] download failed:', e);
            download.value = { phase: 'error' };
        }
    }

    const hasNameColumn = computed(
        () => selected.value.has(COLUMN_ID.lastName) || selected.value.has(COLUMN_ID.firstName),
    );

    return {
        state,
        catalog,
        selected,
        statuses,
        statusCounts,
        list,
        columns,
        cellContext,
        hints,
        saveState,
        download,
        hasNameColumn,
        reload: () => groupId.value !== null && load(groupId.value),
        setColumn,
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
