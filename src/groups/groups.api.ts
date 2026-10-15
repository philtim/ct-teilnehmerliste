import { apiGet, fetchFirstPage, getOriginUrl, statusOf, withRetryOn429 } from '@/shared/api';
import { loadMasterdata } from '@/shared/masterdata';
import { toGroupInfo } from '@/members/parse';
import type { GroupInfo } from '@/members/types';

/** A search shows this many; more means the search should be narrower. */
export const SEARCH_LIMIT = 50;

export type Choice = { id: number; label: string };

/**
 * Group types and group statuses with their labels, for the type filter and
 * the status shown next to each hit. Empty lists when unreadable — the search
 * still works, it just cannot filter by type or name a status.
 */
export async function loadGroupVocabulary(): Promise<{ types: Choice[]; statuses: Choice[] }> {
    const masterdata = await loadMasterdata().catch(() => null);
    const choices = (list: unknown): Choice[] =>
        (Array.isArray(list) ? list : [])
            .map((entry) => entry as { id?: unknown; name?: unknown; nameTranslated?: unknown })
            .filter((e) => typeof e.id === 'number')
            .map((e) => ({
                id: e.id as number,
                label: String(e.nameTranslated ?? e.name ?? e.id),
            }));
    const types = choices(masterdata?.groupTypes);
    return {
        types: types.length ? types : choices(await groupTypesFallback()),
        statuses: choices(masterdata?.groupStatuses),
    };
}

/** `/group/grouptypes`, for an installation whose masterdata omits them. */
async function groupTypesFallback(): Promise<unknown> {
    return withRetryOn429(() => apiGet<unknown>('/group/grouptypes')).catch(() => []);
}

/**
 * Groups the viewer can see, by name and optionally by type. ChurchTools
 * applies the viewer's permissions, so whatever comes back may be listed.
 */
export async function searchGroups(
    query: string,
    groupTypeId: number | null,
): Promise<{ groups: GroupInfo[]; total: number }> {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (groupTypeId !== null) params.append('group_type_ids[]', String(groupTypeId));
    const { items, total } = await fetchFirstPage<unknown>(`/groups?${params}`, SEARCH_LIMIT);
    const origin = getOriginUrl();
    return {
        groups: items.map((g) => toGroupInfo(g, origin)).filter((g): g is GroupInfo => g !== null),
        total,
    };
}

/**
 * The group id in what was typed: a bare id (`2599`, `#2599`) or a link to
 * the group, as copied from the address bar (`…/groups/2599/dashboard`).
 */
export function parseGroupRef(input: string): number | null {
    const trimmed = input.trim();
    const bare = /^#?(\d{1,9})$/.exec(trimmed);
    if (bare) return Number(bare[1]);
    const link = /\/groups\/(\d{1,9})(?:[/?#]|$)/.exec(trimmed);
    return link ? Number(link[1]) : null;
}

/** One group by id, or null when it does not exist or is not visible to the viewer. */
export async function findGroup(groupId: number): Promise<GroupInfo | null> {
    try {
        const raw = await withRetryOn429(() => apiGet<unknown>(`/groups/${groupId}`));
        return toGroupInfo(raw, getOriginUrl());
    } catch (e) {
        const status = statusOf(e);
        if (status === 404 || status === 403) return null;
        throw e;
    }
}

export type SearchResult = { groups: GroupInfo[]; total: number };

/**
 * What the picker shows for what was typed, or null for nothing to search.
 *
 * - A pasted link finds that one group, or nothing if this viewer cannot see
 *   it — searching the link text as a name would only produce noise.
 * - A bare number is both: the group with that id, listed first, and the
 *   groups whose name contains it ("2026").
 * - Anything else is a name search, narrowed by the type when one is chosen.
 *   A type alone lists that type's groups.
 */
export async function runSearch(
    text: string,
    groupTypeId: number | null,
    api: { findGroup: typeof findGroup; searchGroups: typeof searchGroups } = {
        findGroup,
        searchGroups,
    },
): Promise<SearchResult | null> {
    const trimmed = text.trim();
    if (!trimmed && groupTypeId === null) return null;

    const groupRef = parseGroupRef(trimmed);
    if (groupRef === null) return api.searchGroups(trimmed, groupTypeId);

    if (!/^#?\d+$/.test(trimmed)) {
        const direct = await api.findGroup(groupRef);
        return direct ? { groups: [direct], total: 1 } : { groups: [], total: 0 };
    }

    const [direct, byName] = await Promise.all([
        api.findGroup(groupRef),
        api.searchGroups(trimmed.replace(/^#/, ''), groupTypeId),
    ]);
    if (!direct || byName.groups.some((g) => g.id === direct.id)) return byName;
    return { groups: [direct, ...byName.groups], total: byName.total + 1 };
}
