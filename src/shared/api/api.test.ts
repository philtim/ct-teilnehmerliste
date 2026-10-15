import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@churchtools/churchtools-client', () => ({ churchtoolsClient: client }));

import { fetchAllPages, mapWithConcurrency, statusOf, withRetryOn429 } from './index';

const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });

beforeEach(() => {
    client.get.mockReset();
    vi.useRealTimers();
});

/** A page as the client returns it with `rawResponse`. */
const page = <T>(data: T[], lastPage?: number) => ({
    data: { data, meta: lastPage === undefined ? undefined : { pagination: { lastPage } } },
});

describe('fetchAllPages', () => {
    it('reads up to the last page the server reports, even past a short page', async () => {
        // A server that caps `limit` below what was asked returns short pages
        // that are not the end — the pagination block says how many follow.
        client.get
            .mockResolvedValueOnce(page([1], 3))
            .mockResolvedValueOnce(page([2], 3))
            .mockResolvedValueOnce(page([3], 3));
        await expect(fetchAllPages('/x', 200)).resolves.toEqual([1, 2, 3]);
        expect(client.get).toHaveBeenCalledTimes(3);
    });

    it('stops at the reported last page without asking for another', async () => {
        client.get.mockResolvedValueOnce(page([1, 2], 1));
        await expect(fetchAllPages('/x', 2)).resolves.toEqual([1, 2]);
        expect(client.get).toHaveBeenCalledOnce();
    });

    it('reads pages until a short one', async () => {
        client.get
            .mockResolvedValueOnce(page([1, 2]))
            .mockResolvedValueOnce(page([3, 2]))
            .mockResolvedValueOnce(page([4]));
        await expect(fetchAllPages('/x?a=1', 2)).resolves.toEqual([1, 2, 3, 2, 4]);
        expect(client.get.mock.calls[0][0]).toBe('/x?a=1&limit=2&page=1');
        expect(client.get.mock.calls[2][0]).toBe('/x?a=1&limit=2&page=3');
    });

    it('stops on an empty page', async () => {
        client.get.mockResolvedValueOnce(page([1, 2])).mockResolvedValueOnce(page([]));
        await expect(fetchAllPages('/x', 2)).resolves.toEqual([1, 2]);
        expect(client.get.mock.calls[0][0]).toBe('/x?limit=2&page=1');
    });

    it('throws at the page cap instead of returning a truncated list', async () => {
        client.get.mockResolvedValue(page([1]));
        await expect(fetchAllPages('/x', 1)).rejects.toThrow(/unvollständig/);
    });

    it('retries a rate-limited page rather than failing the list', async () => {
        vi.useFakeTimers();
        client.get
            .mockResolvedValueOnce(page([1], 2))
            .mockRejectedValueOnce(httpError(429))
            .mockResolvedValueOnce(page([2], 2));
        const result = fetchAllPages('/x', 1);
        await vi.runAllTimersAsync();
        await expect(result).resolves.toEqual([1, 2]);
    });

    it('throws when a page fails', async () => {
        client.get.mockResolvedValueOnce(page([1])).mockRejectedValueOnce(httpError(500));
        await expect(fetchAllPages('/x', 1)).rejects.toThrow('HTTP 500');
    });
});

describe('withRetryOn429', () => {
    it('retries a 429 and returns the eventual answer', async () => {
        vi.useFakeTimers();
        const call = vi.fn().mockRejectedValueOnce(httpError(429)).mockResolvedValueOnce('ok');
        const result = withRetryOn429(call);
        await vi.runAllTimersAsync();
        await expect(result).resolves.toBe('ok');
        expect(call).toHaveBeenCalledTimes(2);
    });

    it('raises every other failure at once', async () => {
        const call = vi.fn().mockRejectedValue(httpError(500));
        await expect(withRetryOn429(call)).rejects.toThrow('HTTP 500');
        expect(call).toHaveBeenCalledOnce();
    });

    it('gives up after the last attempt', async () => {
        vi.useFakeTimers();
        const call = vi.fn().mockRejectedValue(httpError(429));
        const result = withRetryOn429(call, 3);
        const settled = expect(result).rejects.toThrow('HTTP 429');
        await vi.runAllTimersAsync();
        await settled;
        expect(call).toHaveBeenCalledTimes(3);
    });
});

describe('mapWithConcurrency', () => {
    it('keeps the input order and never exceeds the limit', async () => {
        let inFlight = 0;
        let peak = 0;
        const result = await mapWithConcurrency([5, 1, 3, 2, 4], 2, async (n) => {
            inFlight += 1;
            peak = Math.max(peak, inFlight);
            await new Promise((r) => setTimeout(r, n));
            inFlight -= 1;
            return n * 10;
        });
        expect(result).toEqual([50, 10, 30, 20, 40]);
        expect(peak).toBe(2);
    });
});

describe('statusOf', () => {
    // The client is axios-based: a failed request rejects with the status on
    // `response.status`; the retry rule depends on reading it.
    it('reads the status from an axios-style error and from a plain one', () => {
        expect(statusOf({ response: { status: 404 } })).toBe(404);
        expect(statusOf(httpError(429))).toBe(429);
        expect(statusOf(new Error('network'))).toBeUndefined();
        expect(statusOf(null)).toBeUndefined();
    });
});
