export function safeParseJSON<T>(json: string | null | undefined, fallback: T): T {
    if (!json) return fallback;
    try {
        return JSON.parse(json) as T;
    } catch (err) {
        console.warn('Failed to parse JSON:', err);
        return fallback;
    }
}
