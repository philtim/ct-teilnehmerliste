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
