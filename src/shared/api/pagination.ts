import { apiGet } from './client';

/**
 * Fetch all pages of a paginated endpoint with safety guards.
 * Stops on empty page, on `maxPages`, or when the same first-item
 * signature reappears (defensive against pagination loops).
 *
 * Pass per-endpoint limits explicitly — different endpoints cap at
 * different sizes (e.g. `/groups`: 200, `/events`: 100, `/services`: not paginated).
 */
export async function fetchAllPages<T extends { id?: number | string }>(
    url: string,
    options: { limit?: number; maxPages?: number } = {},
): Promise<T[]> {
    const limit = options.limit ?? 100;
    const maxPages = options.maxPages ?? 100;

    const results: T[] = [];
    let firstIdSignature: string | null = null;

    for (let page = 1; page <= maxPages; page++) {
        const sep = url.includes('?') ? '&' : '?';
        const pageUrl = `${url}${sep}page=${page}&limit=${limit}`;
        const items = await apiGet<T[]>(pageUrl);

        if (!items || items.length === 0) break;

        const sig = items[0]?.id != null ? String(items[0].id) : null;
        if (sig !== null && sig === firstIdSignature) break;
        firstIdSignature = sig;

        results.push(...items);
        if (items.length < limit) break;
    }

    return results;
}
