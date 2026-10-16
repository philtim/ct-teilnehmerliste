/**
 * The chosen group in the page's own address (`?gruppe=2599`), so a reload
 * keeps it and a link to the list can be passed on.
 *
 * Built from `window.location.href`, never from a relative URL: the host page
 * sets `<base href>` to the instance root, and a relative URL would resolve
 * against that instead of the extension's page.
 */
const PARAM = 'gruppe';

/** The group id; null for none; `'invalid'` for a parameter that is no id. */
export function readGroupParam(href: string): number | null | 'invalid' {
    let value: string | null;
    try {
        value = new URL(href).searchParams.get(PARAM);
    } catch {
        return null;
    }
    if (value === null) return null;
    return /^\d{1,9}$/.test(value) ? Number(value) : 'invalid';
}

export function withGroupParam(href: string, groupId: number | null): string {
    const url = new URL(href);
    if (groupId === null) url.searchParams.delete(PARAM);
    else url.searchParams.set(PARAM, String(groupId));
    return url.toString();
}
