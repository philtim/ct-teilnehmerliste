/**
 * The single seam between this codebase and `@churchtools/churchtools-client`.
 * Everything else imports from `@/shared/api` (the barrel) — an ESLint rule
 * forbids `@churchtools/churchtools-client` outside this folder.
 *
 * Why a wrapper at all? The official client handles auth, sessions, CSRF,
 * and base-URL switching. It does NOT enforce timeouts or unify error shapes.
 * This module fills exactly those gaps and nothing else.
 */
import { churchtoolsClient } from '@churchtools/churchtools-client';
import { API_TIMEOUT_MS } from '@/shared/constants';
import { ChurchToolsApiError } from './errors';

/** Re-exported raw client. Use `apiGet/apiPost/...` for timeout + error normalization. */
export const ct = churchtoolsClient;

declare const window: Window &
    typeof globalThis & {
        settings?: { base_url?: string };
    };

/** Initialize the client. Call once at boot from `main.ts`. */
export function initApi(baseUrl: string): void {
    ct.setBaseUrl(baseUrl);
}

/**
 * Origin of the host instance. The host injects `window.settings.base_url`
 * (which may carry a trailing path segment when mounted inside a route);
 * we normalize to a clean origin so callers can build links freely.
 */
export function getOriginUrl(): string {
    const raw = window.settings?.base_url ?? import.meta.env.VITE_BASE_URL ?? '';
    try {
        return new URL(raw, window.location.href).origin;
    } catch {
        return raw.replace(/\/+$/, '');
    }
}

/**
 * Race a promise against a timeout. The underlying HTTP request keeps running
 * (we cannot cancel axios requests through the official client), but the UI
 * gets a deterministic ChurchToolsApiError instead of hanging indefinitely.
 */
export async function withTimeout<T>(p: Promise<T>, ms: number, endpoint: string): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timer = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
            () => reject(new ChurchToolsApiError(endpoint, 0, `Timeout after ${ms}ms`)),
            ms,
        );
    });
    try {
        return await Promise.race([p, timer]);
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
}

function extractStatus(e: unknown): number | undefined {
    if (typeof e === 'object' && e !== null) {
        const maybe = e as { response?: { status?: number }; status?: number };
        return maybe.response?.status ?? maybe.status;
    }
    return undefined;
}

function normalizeError(endpoint: string, e: unknown): ChurchToolsApiError {
    if (e instanceof ChurchToolsApiError) return e;
    const status = extractStatus(e) ?? 0;
    const message = e instanceof Error ? e.message : String(e);
    return new ChurchToolsApiError(endpoint, status, message);
}

export async function apiGet<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    try {
        return await withTimeout(ct.get<T>(endpoint, params), API_TIMEOUT_MS, endpoint);
    } catch (e) {
        throw normalizeError(endpoint, e);
    }
}

/** The official client types `data` as `Record<string, any>` (see `Params`). */
type Params = Record<string, unknown>;

export async function apiPost<T>(endpoint: string, data?: Params): Promise<T> {
    try {
        return await withTimeout(ct.post<T>(endpoint, data), API_TIMEOUT_MS, endpoint);
    } catch (e) {
        throw normalizeError(endpoint, e);
    }
}

export async function apiPut<T>(endpoint: string, data: Params): Promise<T> {
    try {
        return await withTimeout(ct.put<T>(endpoint, data), API_TIMEOUT_MS, endpoint);
    } catch (e) {
        throw normalizeError(endpoint, e);
    }
}

export async function apiDelete<T>(endpoint: string, data?: Params): Promise<T> {
    try {
        return await withTimeout(ct.deleteApi<T>(endpoint, data), API_TIMEOUT_MS, endpoint);
    } catch (e) {
        throw normalizeError(endpoint, e);
    }
}
