import type { Family, FamilyPerson, Relationship } from './types';

/**
 * Family detection from two independent signals, because neither alone is
 * good enough on real ChurchTools data. Taken over from the RR dashboard
 * (`philtim/ct-rr-organigram`, `src/beitraege/families.ts`), where both
 * failure modes were found on a live installation:
 *
 *  1. Relationships — a shared parent, or a direct link (siblings, a married
 *     couple, a parent who is on the list too). Survives differing spellings,
 *     but is only as good as the data entry: twelve sibling pairs there had no
 *     relationship recorded at all.
 *
 *  2. Same address *and* same surname. Catches those twelve, and the surname
 *     test is what keeps it honest: address alone merges unrelated families
 *     in a shared building — one house number there holds two of them.
 *
 * Union of both signals, under one household rule: **two people at different
 * known addresses are never one family**, whatever links them. A family is a
 * household — a sibling who lives with the other parent, or a married
 * daughter, is a relative and still a household of their own. A relationship
 * to someone without an address still counts, since there is no address to
 * contradict it.
 *
 * The surname condition is not optional: without it, every flat in a shared
 * building would be one family.
 */
export function groupFamilies(
    participants: FamilyPerson[],
    relationships: Relationship[],
): Family[] {
    const homes = new Map(participants.map((p) => [p.personId, homeOf(p)]));
    const parent = new Map<number, number>();

    const find = (x: number): number => {
        let root = x;
        while (parent.get(root) !== root) root = parent.get(root) ?? root;
        // Path compression, so repeated lookups stay flat.
        let cur = x;
        while (parent.get(cur) !== root) {
            const next = parent.get(cur) ?? root;
            parent.set(cur, root);
            cur = next;
        }
        return root;
    };
    const union = (a: number, b: number) => {
        if (!homes.has(a) || !homes.has(b)) return;
        const ha = homes.get(a);
        const hb = homes.get(b);
        if (ha !== null && hb !== null && ha !== hb) return; // the household rule
        const ra = find(a);
        const rb = find(b);
        if (ra !== rb) parent.set(ra, rb);
    };

    for (const p of participants) parent.set(p.personId, p.personId);

    // Signal 1a: a direct link, when both ends are on the list.
    // Signal 1b: everyone sharing a parent is a sibling. Every pair is offered,
    // not just each to the first: with the household rule a link can be
    // refused, and the first child may be the one who lives elsewhere.
    const childrenByParent = new Map<number, number[]>();
    for (const rel of relationships) {
        if (!homes.has(rel.personId)) continue;
        if (rel.kind === 'link') {
            union(rel.personId, rel.relativeId);
            continue;
        }
        const siblings = childrenByParent.get(rel.relativeId) ?? [];
        siblings.push(rel.personId);
        childrenByParent.set(rel.relativeId, siblings);
    }
    for (const siblings of childrenByParent.values()) {
        for (let i = 0; i < siblings.length; i++) {
            for (let j = i + 1; j < siblings.length; j++) union(siblings[i], siblings[j]);
        }
    }

    // Signal 2: same normalized address AND same normalized surname.
    const byAddress = new Map<string, number[]>();
    for (const p of participants) {
        const home = homes.get(p.personId);
        if (!home) continue; // No address is no evidence — never merge on blanks.
        const key = `${home}|${normalizeText(p.lastName)}`;
        const bucket = byAddress.get(key) ?? [];
        bucket.push(p.personId);
        byAddress.set(key, bucket);
    }
    for (const bucket of byAddress.values()) {
        for (let i = 1; i < bucket.length; i++) union(bucket[0], bucket[i]);
    }

    const clusters = new Map<number, number[]>();
    for (const p of participants) {
        const root = find(p.personId);
        const members = clusters.get(root) ?? [];
        members.push(p.personId);
        clusters.set(root, members);
    }

    // Unordered and unnumbered: the list orders and numbers the families
    // (`buildList`), so there is one family id, the one people see.
    return [...clusters.values()]
        .flatMap((members) => splitByHome(members, homes))
        .map((personIds) => ({ personIds }));
}

/**
 * The household rule, for the one case `union` cannot see: a person without
 * an address linked to relatives at two different addresses joins the two
 * clusters through themselves. Each address then becomes its own family, and
 * the person who bridged them stands alone — the cautious direction: a
 * missing link is easier to spot on the list than a wrong one.
 */
function splitByHome(members: number[], homes: ReadonlyMap<number, string | null>): number[][] {
    const known = new Set(members.map((id) => homes.get(id)).filter((h) => h !== null));
    if (known.size <= 1) return [members];
    const byHome = new Map<string, number[]>();
    const alone: number[][] = [];
    for (const id of members) {
        const home = homes.get(id);
        if (home === null || home === undefined) {
            alone.push([id]);
            continue;
        }
        byHome.set(home, [...(byHome.get(home) ?? []), id]);
    }
    return [...byHome.values(), ...alone];
}

/** Postcode and normalized street, or null when there is no street to compare. */
function homeOf(p: FamilyPerson): string | null {
    const street = normalizeStreet(p.street);
    return street ? `${normalizeText(p.zip)}|${street}` : null;
}

/** Lowercased, whitespace-collapsed. */
export function normalizeText(value: string | null | undefined): string {
    return (value ?? '').trim().toLocaleLowerCase('de').replace(/\s+/g, ' ');
}

/**
 * Street names differ by spelling far more often than by substance:
 * "Weiler Str. 78", "Weilerstraße 78" and "Weilerstraße78" are the same door.
 * Fold the common German variants together and drop all whitespace — the
 * data has house numbers both with and without a space before them. House
 * numbers themselves are left alone, because 12 and 12/1 are genuinely
 * different addresses — on the installation this comes from, they hold two
 * sets of cousins.
 */
export function normalizeStreet(value: string | null | undefined): string {
    const base = normalizeText(value);
    if (!base) return '';
    return (
        base
            // "straße" / "strasse" → "str"
            .replace(/stra(ß|ss)e/g, 'str')
            // Drop the abbreviation dot. Not anchored on a word boundary: in
            // "paulinenstr." the "str" is preceded by a word character, so
            // \bstr would never match and the dot would survive.
            .replace(/str\./g, 'str')
            // "weiler str 78" → "weilerstr78", "goethestr 35" → "goethestr35".
            .replace(/\s+/g, '')
    );
}
