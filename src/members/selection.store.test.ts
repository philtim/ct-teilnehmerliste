import { beforeEach, describe, expect, it, vi } from 'vitest';

const kv = vi.hoisted(() => ({
    getModule: vi.fn(),
    getCustomDataCategory: vi.fn(),
    createCustomDataCategory: vi.fn(),
    getCustomDataValues: vi.fn(),
    createCustomDataValue: vi.fn(),
    updateCustomDataValue: vi.fn(),
    deleteCustomDataValue: vi.fn(),
}));
vi.mock('@/shared/kv-store', () => kv);

beforeEach(() => {
    vi.resetModules();
    for (const fn of Object.values(kv)) fn.mockReset();
    kv.getModule.mockResolvedValue({ id: 15 });
});

/** A fresh module per test: the store caches the category lookup per page. */
const store = () => import('./selection.store');

describe('parseEntry', () => {
    it('reads a well-formed entry and refuses anything else', async () => {
        const { parseEntry } = await store();
        expect(parseEntry({ id: 1, groupId: 9, selected: ['a'], known: ['a', 'b'] })).toEqual({
            id: 1,
            groupId: 9,
            selected: ['a'],
            known: ['a', 'b'],
        });
        for (const value of [
            null,
            'x',
            { id: 1, groupId: '9', selected: [], known: [] },
            { id: 1, groupId: 9, selected: [1], known: [] },
            { id: 1, groupId: 9, selected: [] },
        ]) {
            expect(parseEntry(value)).toBeNull();
        }
    });
});

describe('loadSelection', () => {
    it("returns the group's entry", async () => {
        kv.getCustomDataCategory.mockResolvedValue({ id: 3 });
        kv.getCustomDataValues.mockResolvedValue([
            { id: 1, groupId: 8, selected: ['x'], known: ['x'] },
            { id: 2, groupId: 9, selected: ['a'], known: ['a'] },
        ]);
        const { loadSelection } = await store();
        expect(await loadSelection(9)).toEqual({ selected: ['a'], known: ['a'] });
    });

    it('returns nothing when there is no category, or the store cannot be read', async () => {
        kv.getCustomDataCategory.mockResolvedValue(undefined);
        expect(await (await store()).loadSelection(9)).toBeNull();
        vi.resetModules();
        kv.getModule.mockRejectedValue(new Error('403'));
        expect(await (await store()).loadSelection(9)).toBeNull();
    });
});

describe('saveSelection', () => {
    it('creates the category and the entry on first save', async () => {
        kv.getCustomDataCategory.mockResolvedValue(undefined);
        kv.createCustomDataCategory.mockResolvedValue({ id: 3 });
        kv.getCustomDataValues.mockResolvedValue([]);
        const { saveSelection } = await store();

        expect(await saveSelection(9, () => ({ selected: ['a'], known: ['a'] }))).toBe(true);

        expect(kv.createCustomDataCategory).toHaveBeenCalledOnce();
        expect(kv.createCustomDataValue).toHaveBeenCalledWith(
            {
                dataCategoryId: 3,
                value: JSON.stringify({ groupId: 9, selected: ['a'], known: ['a'] }),
            },
            15,
        );
    });

    it('updates an existing entry, building on what is stored', async () => {
        kv.getCustomDataCategory.mockResolvedValue({ id: 3 });
        kv.getCustomDataValues.mockResolvedValue([
            { id: 7, groupId: 9, selected: ['hidden'], known: ['hidden'] },
        ]);
        const build = vi.fn(() => ({ selected: ['a'], known: ['a'] }));
        const { saveSelection } = await store();

        expect(await saveSelection(9, build)).toBe(true);

        expect(build).toHaveBeenCalledWith({ selected: ['hidden'], known: ['hidden'] });
        expect(kv.updateCustomDataValue).toHaveBeenCalledWith(
            3,
            7,
            expect.objectContaining({ dataCategoryId: 3 }),
            15,
        );
        expect(kv.createCustomDataValue).not.toHaveBeenCalled();
    });

    it('resolves false when the write is refused', async () => {
        kv.getCustomDataCategory.mockResolvedValue({ id: 3 });
        kv.getCustomDataValues.mockResolvedValue([]);
        kv.createCustomDataValue.mockRejectedValue(new Error('403'));
        const { saveSelection } = await store();
        expect(await saveSelection(9, () => ({ selected: [], known: [] }))).toBe(false);
    });

    it('runs overlapping saves one after another, so the second finds the first', async () => {
        kv.getCustomDataCategory.mockResolvedValue(undefined);
        kv.createCustomDataCategory.mockResolvedValue({ id: 3 });
        const stored: unknown[] = [];
        kv.getCustomDataValues.mockImplementation(async () => [...stored]);
        kv.createCustomDataValue.mockImplementation(async ({ value }: { value: string }) => {
            stored.push({ id: 1, ...JSON.parse(value) });
        });
        const { saveSelection } = await store();

        await Promise.all([
            saveSelection(9, () => ({ selected: ['a'], known: ['a'] })),
            saveSelection(9, () => ({ selected: ['b'], known: ['b'] })),
        ]);

        expect(kv.createCustomDataCategory).toHaveBeenCalledOnce();
        expect(kv.createCustomDataValue).toHaveBeenCalledOnce();
        expect(kv.updateCustomDataValue).toHaveBeenCalledOnce();
    });
});

describe('clearSelection', () => {
    it('deletes the entry, and is content when there is none', async () => {
        kv.getCustomDataCategory.mockResolvedValue({ id: 3 });
        kv.getCustomDataValues.mockResolvedValue([{ id: 7, groupId: 9, selected: [], known: [] }]);
        const { clearSelection } = await store();
        expect(await clearSelection(9)).toBe(true);
        expect(kv.deleteCustomDataValue).toHaveBeenCalledWith(3, 7, 15);
        kv.getCustomDataValues.mockResolvedValue([]);
        expect(await clearSelection(9)).toBe(true);
        expect(kv.deleteCustomDataValue).toHaveBeenCalledOnce();
    });
});
