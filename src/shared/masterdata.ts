import { apiGet, withRetryOn429 } from '@/shared/api';

/**
 * `/person/masterdata`, read once per page: relationship types, group types
 * and statuses, and the labels of built-in person fields all come from it.
 * A failed read is not cached, so the next group tries again.
 */
export type Masterdata = Record<string, unknown>;

let request: Promise<Masterdata> | null = null;

export function loadMasterdata(): Promise<Masterdata> {
    request ??= withRetryOn429(() => apiGet<Masterdata>('/person/masterdata')).catch(
        (e: unknown) => {
            request = null;
            throw e;
        },
    );
    return request;
}
