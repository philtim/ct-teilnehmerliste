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
 *
 * A link to another ChurchTools instance is no reference to a group here:
 * the same id names an unrelated group at this one. Pass `origin` to refuse it.
 */
export function parseGroupRef(input: string, origin?: string): number | null {
    const trimmed = input.trim();
    const bare = /^#?(\d{1,9})$/.exec(trimmed);
    if (bare) return Number(bare[1]);
    const link = /(?:^|\/)groups\/(\d{1,9})(?:[/?#]|$)/.exec(trimmed);
    if (!link) return null;
    // Anything before the path names a host — with or without a scheme, as
    // copied from an address bar. Only the host is compared: http or https
    // is the same instance.
    const before = trimmed.slice(0, link.index).replace(/\/+$/, '');
    if (origin && before) {
        try {
            const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
                ? trimmed
                : `https://${trimmed}`;
            if (new URL(withScheme).host !== new URL(origin).host) return null;
        } catch {
            return null;
        }
    }
    return Number(link[1]);
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

/** ChurchTools refuses a name search shorter than this with HTTP 400. */
export const MIN_QUERY = 2;

export type SearchResult = { groups: GroupInfo[]; total: number; tooShort?: boolean };

const NONE: SearchResult = { groups: [], total: 0 };

/**
 * What the picker shows for what was typed, or null for nothing to search.
 *
 * - A pasted link finds that one group, or nothing if this viewer cannot see
 *   it — searching the link text as a name would only produce noise. A link
 *   to another instance finds nothing.
 * - A bare number is both: the group with that id, listed first, and the
 *   groups whose name contains it ("2026"). The id match ignores the type
 *   filter — asking for a group by its id is asking for that group. Either
 *   half may fail and the other still shows; a single digit is too short
 *   for a name search, so it is the id lookup alone.
 * - Anything else is a name search, narrowed by the type when one is chosen.
 *   A type alone lists that type's groups. A single character is not
 *   searched: ChurchTools refuses it, and "try again" would never help.
 */
export async function runSearch(
    text: string,
    groupTypeId: number | null,
    api: { findGroup: typeof findGroup; searchGroups: typeof searchGroups } = {
        findGroup,
        searchGroups,
    },
    /** This instance's origin; a link to any other finds nothing. */
    origin?: string,
): Promise<SearchResult | null> {
    const trimmed = text.trim();
    if (!trimmed && groupTypeId === null) return null;

    const groupRef = parseGroupRef(trimmed, origin);
    if (groupRef === null) {
        // A group link, but to another instance.
        if (parseGroupRef(trimmed) !== null) return NONE;
        if (trimmed.length > 0 && trimmed.length < MIN_QUERY) return { ...NONE, tooShort: true };
        return api.searchGroups(trimmed, groupTypeId);
    }

    if (!/^#?\d+$/.test(trimmed)) {
        const direct = await api.findGroup(groupRef);
        return direct ? { groups: [direct], total: 1 } : NONE;
    }

    const name = trimmed.replace(/^#/, '');
    const [byId, byName] = await Promise.allSettled([
        api.findGroup(groupRef),
        name.length < MIN_QUERY ? NONE : api.searchGroups(name, groupTypeId),
    ]);
    const direct = byId.status === 'fulfilled' ? byId.value : null;
    // A single digit has no name search to fall back on: a failed lookup is
    // a failure, not "no such group".
    if (byId.status === 'rejected' && name.length < MIN_QUERY) throw byId.reason;
    if (byName.status === 'rejected') {
        // The name search failed: the id match alone is still an answer.
        if (direct) return { groups: [direct], total: 1 };
        throw byName.reason;
    }
    const named = byName.value;
    if (!direct || named.groups.some((g) => g.id === direct.id)) return named;
    return { groups: [direct, ...named.groups], total: named.total + 1 };
}
