import { COPY } from '@/shared/copy';
import { API_TIMEOUT_MS } from '@/shared/constants';
import { ct, withTimeout } from './client';
import { withRetryOn429 } from './retry';

/**
 * Every page of a paginated endpoint.
 *
 * Reading one page silently truncates anything larger, and a member list that
 * is quietly too short looks exactly like a correct one. That is the failure
 * this extension treats as worse than an error, so this throws when a page
 * fails, and throws at the page cap rather than returning a short list.
 *
 * It stops at the last page the server reports (`meta.pagination.lastPage`),
 * not at the first short page: a short page only means "the end" if the server
 * honoured the requested `limit`, and the pagination block says so without
 * that assumption. The short-page rule remains the fallback for a response
 * without a pagination block.
 *
 * Pass the limit explicitly — endpoints cap at different sizes.
 */
const MAX_PAGES = 100;

type RawPage<T> = { data?: { data?: T[]; meta?: { pagination?: { lastPage?: number } } } };

export async function fetchAllPages<T>(url: string, limit: number): Promise<T[]> {
    const separator = url.includes('?') ? '&' : '?';
    const rows: T[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
        const pageUrl = `${url}${separator}limit=${limit}&page=${page}`;
        const response = await withRetryOn429(() =>
            withTimeout(
                ct.get<RawPage<T>>(pageUrl, {}, { rawResponse: true }),
                API_TIMEOUT_MS,
                pageUrl,
            ),
        );
        const batch = response?.data?.data ?? [];
        const lastPage = response?.data?.meta?.pagination?.lastPage;
        rows.push(...batch);
        if (batch.length === 0) return rows;
        if (lastPage !== undefined ? page >= lastPage : batch.length < limit) return rows;
    }
    throw new Error(COPY.listTruncated(url, MAX_PAGES * limit));
}

type RawCountedPage<T> = { data?: { data?: T[]; meta?: { pagination?: { total?: number } } } };

/**
 * The first page of a paginated endpoint and how many there are in all —
 * for a search, where the first page is the answer and the total says
 * whether to ask for a narrower search.
 */
export async function fetchFirstPage<T>(
    url: string,
    limit: number,
): Promise<{ items: T[]; total: number }> {
    const separator = url.includes('?') ? '&' : '?';
    const pageUrl = `${url}${separator}limit=${limit}&page=1`;
    const response = await withRetryOn429(() =>
        withTimeout(
            ct.get<RawCountedPage<T>>(pageUrl, {}, { rawResponse: true }),
            API_TIMEOUT_MS,
            pageUrl,
        ),
    );
    const items = response?.data?.data ?? [];
    return { items, total: response?.data?.meta?.pagination?.total ?? items.length };
}
