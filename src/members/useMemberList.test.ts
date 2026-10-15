import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import type { GroupData } from './types';
import { member } from './test-fixtures';

const loader = vi.hoisted(() => ({ loadGroup: vi.fn() }));
vi.mock('./members.api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('./members.api')>()),
    loadGroup: loader.loadGroup,
}));
const store = vi.hoisted(() => ({
    loadSelection: vi.fn(),
    saveSelection: vi.fn(),
    clearSelection: vi.fn(),
}));
vi.mock('./selection.store', () => store);
const writer = vi.hoisted(() => ({ downloadWorkbook: vi.fn() }));
vi.mock('./xlsx', () => writer);

vi.stubGlobal('__APP_VERSION__', '1.0.0');
vi.stubGlobal('__APP_COMMIT__', 'abc1234');

import { SAVE_DELAY_MS, useMemberList } from './useMemberList';

const group = (id: number) => ({
    id,
    name: `Gruppe ${id}`,
    groupTypeId: 3,
    groupStatusId: 1,
    frontendUrl: `https://x/groups/${id}`,
});
const data = (id: number, members = [member(1)]): GroupData => ({
    group: group(id),
    members,
    groupFields: [],
    personFields: [],
    fieldsUnreadable: { group: false, person: false },
    relationships: [],
    relationshipProblem: null,
    loadedAt: new Date(2026, 9, 15),
});

/** A promise to resolve by hand, for ordering two loads. */
function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((r) => (resolve = r));
    return { promise, resolve };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

function setup(initial: number | null) {
    const id = ref<number | null>(initial);
    const scope = effectScope();
    const list = scope.run(() => useMemberList(id))!;
    return { id, scope, list };
}

beforeEach(() => {
    for (const fn of [...Object.values(loader), ...Object.values(store), writer.downloadWorkbook]) {
        fn.mockReset();
    }
    store.loadSelection.mockResolvedValue(null);
    store.saveSelection.mockResolvedValue(true);
    store.clearSelection.mockResolvedValue(true);
});
afterEach(() => vi.useRealTimers());

describe('useMemberList', () => {
    it('ignores a load that finished after a newer one was started', async () => {
        const first = deferred<GroupData>();
        const second = deferred<GroupData>();
        loader.loadGroup.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
        const { id, list } = setup(1);
        id.value = 2;
        await nextTick();

        second.resolve(data(2));
        await flush();
        first.resolve(data(1));
        await flush();

        expect(list.state.value.phase).toBe('ready');
        expect(list.state.value.phase === 'ready' && list.state.value.data.group.id).toBe(2);
    });

    it('leaves members marked for deletion off the list by default', async () => {
        loader.loadGroup.mockResolvedValue(
            data(1, [
                member(1),
                member(2, { status: 'to_delete' }),
                member(3, { status: 'waiting' }),
            ]),
        );
        const { list } = setup(1);
        await flush();
        expect([...list.statuses.value].sort()).toEqual(['active', 'waiting']);
        expect(list.list.value.rows.map((r) => r.member.personId).sort()).toEqual([1, 3]);
    });

    it('stores the choice once after a burst of ticks, and reports it', async () => {
        loader.loadGroup.mockResolvedValue(data(1));
        const { list } = setup(1);
        await flush();
        vi.useFakeTimers();

        list.setColumn('base:zip', false);
        list.setColumn('base:city', false);
        expect(list.saveState.value).toBe('saving');
        await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS);

        expect(store.saveSelection).toHaveBeenCalledOnce();
        const build = store.saveSelection.mock.calls[0][1];
        expect(build(null).selected).not.toContain('base:zip');
        expect(list.saveState.value).toBe('saved');
    });

    it('sends a pending save before loading another group', async () => {
        loader.loadGroup.mockResolvedValue(data(1));
        const { id, list } = setup(1);
        await flush();
        list.setColumn('base:zip', false);
        id.value = 2;
        await nextTick();
        expect(store.saveSelection).toHaveBeenCalledWith(1, expect.any(Function));
    });

    it('resets by forgetting the stored choice', async () => {
        loader.loadGroup.mockResolvedValue(data(1));
        const { list, scope } = setup(1);
        await flush();
        list.setColumn('base:zip', false);
        list.resetColumns();
        scope.stop();
        expect(store.clearSelection).toHaveBeenCalledWith(1);
        expect(store.saveSelection).not.toHaveBeenCalled();
        expect(list.selected.value.has('base:zip')).toBe(true);
    });

    it('names the file after the group and reports a failed download', async () => {
        loader.loadGroup.mockResolvedValue(data(1));
        const { list } = setup(1);
        await flush();

        await list.downloadExcel();
        expect(writer.downloadWorkbook.mock.calls[0][1]).toMatch(/^Teilnehmerliste – Gruppe 1 – /);
        expect(list.download.value.phase).toBe('idle');

        writer.downloadWorkbook.mockRejectedValueOnce(new Error('boom'));
        await list.downloadExcel();
        expect(list.download.value.phase).toBe('error');
    });

    it('shows a load error by its reason', async () => {
        const { GroupLoadError } = await import('./members.api');
        loader.loadGroup.mockRejectedValue(new GroupLoadError('forbidden'));
        const { list } = setup(1);
        await flush();
        expect(list.state.value).toEqual({ phase: 'error', reason: 'forbidden' });
    });
});
