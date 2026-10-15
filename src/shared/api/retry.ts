/**
 * Retry a request that came back HTTP 429, with increasing delays.
 *
 * Loading a large group asks for its members, every person's details and the
 * relationship list in quick succession. ChurchTools answers that, but
 * rate-limits a second run straight after — observed on the live instance
 * with the RR dashboard, which this extension descends from. Without this, a
 * reload shows "could not be loaded" and nobody knows that waiting is the fix.
 *
 * Only 429 is retried. Every other failure is a real failure and is raised
 * straight away rather than hidden behind three slow attempts.
 */
export async function withRetryOn429<T>(call: () => Promise<T>, attempts = 3): Promise<T> {
    for (let attempt = 1; ; attempt++) {
        try {
            return await call();
        } catch (e) {
            if (attempt >= attempts || statusOf(e) !== 429) throw e;
            await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        }
    }
}

/** The HTTP status of a failed request, from either shape the client throws. */
export function statusOf(e: unknown): number | undefined {
    if (typeof e === 'object' && e !== null) {
        const maybe = e as { response?: { status?: number }; status?: number };
        return maybe.response?.status ?? maybe.status;
    }
    return undefined;
}
