import { describe, expect, it, vi } from 'vitest';
import { parseGroupRef, runSearch } from './groups.api';

describe('parseGroupRef', () => {
    it('reads a bare id, with or without #', () => {
        expect(parseGroupRef('2599')).toBe(2599);
        expect(parseGroupRef(' #2599 ')).toBe(2599);
    });

    it('reads a link copied from the address bar', () => {
        expect(parseGroupRef('https://gemeinde.church.tools/groups/2599/dashboard')).toBe(2599);
        expect(parseGroupRef('https://gemeinde.church.tools/groups/2599')).toBe(2599);
        expect(parseGroupRef('gemeinde.church.tools/groups/12?tab=members')).toBe(12);
    });

    it('treats a name as a name, even one with a number in it', () => {
        expect(parseGroupRef('Sommercamp 2026')).toBeNull();
        expect(parseGroupRef('https://gemeinde.church.tools/persons/2599/')).toBeNull();
        expect(parseGroupRef('')).toBeNull();
    });
});

describe('runSearch', () => {
    const group = (id: number, name = `G${id}`) => ({
        id,
        name,
        groupTypeId: 3,
        groupStatusId: 1,
        frontendUrl: `https://x/groups/${id}`,
    });
    const api = (
        byId: Record<number, ReturnType<typeof group>>,
        byName: ReturnType<typeof group>[],
    ) => ({
        findGroup: vi.fn(async (id: number) => byId[id] ?? null),
        searchGroups: vi.fn(async () => ({ groups: byName, total: byName.length })),
    });

    it('searches nothing for nothing', async () => {
        expect(await runSearch('  ', null, api({}, []))).toBeNull();
    });

    it('lists a type on its own', async () => {
        const a = api({}, [group(1)]);
        expect(await runSearch('', 3, a)).toEqual({ groups: [group(1)], total: 1 });
        expect(a.searchGroups).toHaveBeenCalledWith('', 3);
    });

    it('finds the linked group, or nothing, without a name search', async () => {
        const a = api({ 12: group(12) }, [group(99)]);
        expect(await runSearch('https://x/groups/12/dashboard', null, a)).toEqual({
            groups: [group(12)],
            total: 1,
        });
        expect(await runSearch('https://x/groups/13', null, a)).toEqual({ groups: [], total: 0 });
        expect(a.searchGroups).not.toHaveBeenCalled();
    });

    it('lists the group with that id first, then the name matches', async () => {
        const a = api({ 2026: group(2026, 'Kasse') }, [group(5, 'Camp 2026')]);
        expect(await runSearch('2026', null, a)).toEqual({
            groups: [group(2026, 'Kasse'), group(5, 'Camp 2026')],
            total: 2,
        });
    });

    it('does not list a group twice when its id is also in its name', async () => {
        const a = api({ 5: group(5) }, [group(5)]);
        expect(await runSearch('#5', null, a)).toEqual({ groups: [group(5)], total: 1 });
    });

    it('searches a name as a name', async () => {
        const a = api({}, [group(1, 'Freizeit')]);
        await runSearch('Freizeit', 3, a);
        expect(a.searchGroups).toHaveBeenCalledWith('Freizeit', 3);
        expect(a.findGroup).not.toHaveBeenCalled();
    });
});
