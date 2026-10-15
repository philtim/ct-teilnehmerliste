/**
 * Loading one group: the group, its members, the people behind them, the
 * field definitions, and the relationships family detection needs.
 *
 * Everything is read under the viewer's own permissions. What ChurchTools
 * does not return is not guessed at: a person it withholds stays on the list
 * with name and link only, a field it does not send is not offered as a
 * column, and unreadable relationships leave families to the address signal —
 * each of them said in the preview, never silently.
 */
import {
    apiGet,
    fetchAllPages,
    getOriginUrl,
    mapWithConcurrency,
    statusOf,
    withRetryOn429,
} from '@/shared/api';
import { memberEdges, resolveRelationshipTypes } from '@/families/relationships';
import type { RelationshipRow, RelationshipTypeRow } from '@/families/relationships';
import { roleNamesOf, toGroupFieldDefs, toGroupInfo, toMember, toPersonFieldDefs } from './parse';
import type { FieldDef, GroupData, Member } from './types';
import { loadMasterdata } from '@/shared/masterdata';
import type { Masterdata } from '@/shared/masterdata';

/** `/persons?ids[]=` answers at most this many per request, whatever `limit` says. */
const PERSON_BATCH = 50;

/** Thrown when the group itself cannot be read; the view names the reason. */
export class GroupLoadError extends Error {
    readonly reason: 'notFound' | 'forbidden' | 'failed';

    constructor(reason: GroupLoadError['reason'], cause?: unknown) {
        super(reason, { cause });
        this.name = 'GroupLoadError';
        this.reason = reason;
    }
}

export async function loadGroup(groupId: number): Promise<GroupData> {
    const origin = getOriginUrl();

    let rawGroup: unknown;
    try {
        rawGroup = await withRetryOn429(() => apiGet<unknown>(`/groups/${groupId}`));
    } catch (e) {
        const status = statusOf(e);
        throw new GroupLoadError(
            status === 404 ? 'notFound' : status === 403 ? 'forbidden' : 'failed',
            e,
        );
    }
    const group = toGroupInfo(rawGroup, origin);
    if (!group) throw new GroupLoadError('notFound');

    // Read once, used twice: relationship types, and the labels of built-in
    // person fields. Null when unreadable — both uses degrade on their own.
    const masterdata = loadMasterdata().catch(() => null);

    const [rawMembers, rawMemberFields, fieldCatalog] = await Promise.all([
        fetchAllPages<unknown>(`/groups/${groupId}/members`, 200).catch((e: unknown) => {
            throw new GroupLoadError(statusOf(e) === 403 ? 'forbidden' : 'failed', e);
        }),
        // Without the definitions the values are opaque ids; the list still
        // works, just without the group's own columns.
        withRetryOn429(() => apiGet<unknown>(`/groups/${groupId}/memberfields`)).catch(() => []),
        loadPersonFieldDefs(masterdata),
    ]);

    const personIds = [
        ...new Set(
            rawMembers
                .map((m) => (m as { personId?: unknown }).personId)
                .filter((id): id is number => typeof id === 'number'),
        ),
    ];
    const [persons, relationships] = await Promise.all([
        loadPersons(personIds),
        loadRelationships(new Set(personIds), masterdata),
    ]);

    const roleNames = roleNamesOf(rawGroup);
    // A person holds one membership per group; guard anyway, since a
    // duplicate row would be a duplicate line in the list.
    const byPerson = new Map<number, Member>();
    for (const raw of rawMembers) {
        const personId = (raw as { personId?: unknown }).personId;
        const member = toMember(
            raw,
            typeof personId === 'number' ? persons.get(personId) : undefined,
            roleNames,
            origin,
        );
        if (member && !byPerson.has(member.personId)) byPerson.set(member.personId, member);
    }
    const members = [...byPerson.values()];

    return {
        group,
        members,
        groupFields: toGroupFieldDefs(rawMemberFields),
        personFields: offeredPersonFields(fieldCatalog, [...persons.values()]),
        relationships: relationships.edges,
        relationshipProblem: relationships.problem,
        loadedAt: new Date(),
    };
}

/** The installation's person fields; none when the definitions are unreadable. */
async function loadPersonFieldDefs(masterdata: Promise<Masterdata | null>): Promise<FieldDef[]> {
    try {
        const fields = await withRetryOn429(() => apiGet<unknown>('/fields'));
        return toPersonFieldDefs(fields, await masterdata);
    } catch {
        return [];
    }
}

/**
 * Only the fields ChurchTools actually sent for at least one listed person.
 * A field the viewer may not see is absent from every person, and offering
 * it would only ever produce an empty column.
 */
function offeredPersonFields(defs: FieldDef[], persons: Record<string, unknown>[]): FieldDef[] {
    return defs.filter((d) => persons.some((p) => d.key in p));
}

/** Full person records by id, in batches. A failed batch fails the load. */
async function loadPersons(personIds: number[]): Promise<Map<number, Record<string, unknown>>> {
    const batches: number[][] = [];
    for (let i = 0; i < personIds.length; i += PERSON_BATCH) {
        batches.push(personIds.slice(i, i + PERSON_BATCH));
    }
    const pages = await mapWithConcurrency(batches, 4, (ids) =>
        withRetryOn429(() =>
            apiGet<Record<string, unknown>[]>(
                `/persons?${ids.map((id) => `ids[]=${id}`).join('&')}&limit=${PERSON_BATCH * 2}`,
            ),
        ),
    );
    const byId = new Map<number, Record<string, unknown>>();
    for (const page of pages) {
        for (const person of page ?? []) {
            if (typeof person.id === 'number') byId.set(person.id, person);
        }
    }
    return byId;
}

/**
 * The relationship edges among the members.
 *
 * `GET /persons/relationships` takes no person filter, so this is one request
 * for the whole installation rather than one per person — measured on a live
 * installation with ~6,000 rows: 0.7 s and 116 KB gzipped, against 15 s and a
 * rate limit for the per-person route. Nothing is rendered from the response;
 * everything but the edges touching a member is dropped here.
 */
async function loadRelationships(
    memberIds: ReadonlySet<number>,
    masterdataRequest: Promise<Masterdata | null>,
): Promise<{
    edges: GroupData['relationships'];
    problem: GroupData['relationshipProblem'];
}> {
    try {
        const [masterdata, rows] = await Promise.all([
            masterdataRequest,
            withRetryOn429(() => apiGet<RelationshipRow[]>('/persons/relationships')),
        ]);
        if (masterdata === null) throw new Error('masterdata unreadable');
        const types = resolveRelationshipTypes(
            Array.isArray(masterdata.relationshipTypes)
                ? (masterdata.relationshipTypes as RelationshipTypeRow[])
                : [],
        );
        return {
            edges: memberEdges(rows ?? [], types, memberIds),
            problem: types.parentChild === null ? 'noParentChildType' : null,
        };
    } catch {
        return { edges: [], problem: 'unreadable' };
    }
}
