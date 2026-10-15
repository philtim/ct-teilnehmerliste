import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
    apiGet: vi.fn(),
    fetchAllPages: vi.fn(),
}));
vi.mock('@/shared/api', async (importOriginal) => {
    const real = await importOriginal<typeof import('@/shared/api')>();
    return {
        ...real,
        apiGet: api.apiGet,
        fetchAllPages: api.fetchAllPages,
        getOriginUrl: () => 'https://gemeinde.church.tools',
    };
});
const masterdata = vi.hoisted(() => ({ loadMasterdata: vi.fn() }));
vi.mock('@/shared/masterdata', () => masterdata);

import { GroupLoadError, loadGroup } from './members.api';

const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });

const GROUP = { id: 9, name: 'Freizeit', information: { groupTypeId: 3 }, roles: [] };
const MASTERDATA = {
    relationshipTypes: [{ id: 1, name: 'relationship.parent-child' }],
};
const member = (personId: number) => ({
    personId,
    groupTypeRoleId: 1,
    groupMemberStatus: 'active',
    person: { domainAttributes: { firstName: `V${personId}`, lastName: 'N' } },
});

/** Routes `apiGet` by path; any path not listed fails as a 500. */
function routes(table: Record<string, unknown | (() => unknown)>) {
    api.apiGet.mockImplementation(async (path: string) => {
        const key = Object.keys(table).find((k) => path.startsWith(k));
        if (key === undefined) throw httpError(500);
        const value = table[key];
        return typeof value === 'function' ? (value as (p: string) => unknown)(path) : value;
    });
}

/** `/persons?ids[]=…` answers with exactly the requested people. */
const personsFor = (path: string) =>
    [...path.matchAll(/ids\[\]=(\d+)/g)].map((m) => ({ id: Number(m[1]), street: 'Weg 1' }));

beforeEach(() => {
    api.apiGet.mockReset();
    api.fetchAllPages.mockReset();
    masterdata.loadMasterdata.mockReset().mockResolvedValue(MASTERDATA);
});

describe('loadGroup', () => {
    it.each([
        [404, 'notFound'],
        [403, 'forbidden'],
        [500, 'failed'],
    ])('names a group read failing with %i as %s', async (status, reason) => {
        api.apiGet.mockRejectedValue(httpError(status));
        await expect(loadGroup(9)).rejects.toMatchObject({ reason });
        await expect(loadGroup(9)).rejects.toBeInstanceOf(GroupLoadError);
    });

    it('fails the load when the member list fails, rather than showing a short one', async () => {
        routes({ '/groups/9': GROUP });
        api.fetchAllPages.mockRejectedValue(httpError(403));
        await expect(loadGroup(9)).rejects.toMatchObject({ reason: 'forbidden' });
    });

    it('reads people in batches of 50, with a limit, and drops duplicate memberships', async () => {
        const members = Array.from({ length: 120 }, (_, i) => member(i + 1));
        routes({
            '/groups/9/memberfields': [],
            '/groups/9': GROUP,
            '/persons/relationships': [],
            '/persons?': personsFor,
            '/fields': [],
        });
        api.fetchAllPages.mockResolvedValue([...members, member(1)]);

        const data = await loadGroup(9);

        const personCalls = api.apiGet.mock.calls
            .map(([path]) => path as string)
            .filter((p) => p.startsWith('/persons?'));
        expect(personCalls).toHaveLength(3);
        expect(personCalls.every((p) => p.includes('limit='))).toBe(true);
        expect(personCalls.map((p) => p.match(/ids\[\]/g)?.length)).toEqual([50, 50, 20]);
        expect(data.members).toHaveLength(120);
        expect(data.members.every((m) => m.personLoaded && m.street === 'Weg 1')).toBe(true);
    });

    it('degrades, and says so, when fields and relationships are unreadable', async () => {
        routes({
            '/groups/9/memberfields': undefined,
            '/groups/9': GROUP,
            '/persons?': personsFor,
        });
        api.apiGet.mockImplementation(async (path: string) => {
            if (path === '/groups/9') return GROUP;
            if (path.startsWith('/persons?')) return personsFor(path);
            throw httpError(500);
        });
        api.fetchAllPages.mockResolvedValue([member(1)]);

        const data = await loadGroup(9);

        expect(data.members).toHaveLength(1);
        expect(data.fieldsUnreadable).toEqual({ group: true, person: true });
        expect(data.relationshipProblem).toBe('unreadable');
        expect(data.groupFields).toEqual([]);
    });

    it('reports a missing parent/child type, and keeps a member whose person was withheld', async () => {
        masterdata.loadMasterdata.mockResolvedValue({ relationshipTypes: [] });
        routes({
            '/groups/9/memberfields': [],
            '/groups/9': GROUP,
            '/persons/relationships': [],
            '/persons?': [],
            '/fields': [],
        });
        api.fetchAllPages.mockResolvedValue([member(1)]);

        const data = await loadGroup(9);

        expect(data.relationshipProblem).toBe('noParentChildType');
        expect(data.members[0]).toMatchObject({ firstName: 'V1', personLoaded: false });
        expect(data.fieldsUnreadable).toEqual({ group: false, person: false });
    });
});
