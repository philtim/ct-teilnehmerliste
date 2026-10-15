import { describe, expect, it } from 'vitest';
import { groupFamilies, normalizeStreet } from './families';
import type { Relationship, FamilyPerson } from './types';

/**
 * Fixtures are synthetic. The rules under test are structural — who shares a
 * parent, an address, a surname — so invented people exercise them exactly as
 * real ones would, and no real name or address belongs in a public repository.
 *
 * The scenarios are not invented, though: each mirrors a case found on a live
 * installation (taken over from the RR dashboard's tests).
 */
function person(
    personId: number,
    lastName: string,
    opts: Partial<FamilyPerson> = {},
): FamilyPerson {
    return {
        personId,
        firstName: `Kind${personId}`,
        lastName,
        street: 'Musterweg 1',
        zip: '70000',
        city: 'Musterstadt',
        ...opts,
    };
}

/** Family keys are an implementation detail; compare membership sets. */
function membership(participants: FamilyPerson[], relationships: Relationship[]): number[][] {
    return groupFamilies(participants, relationships)
        .map((f) => [...f.personIds].sort((a, b) => a - b))
        .sort((a, b) => a[0] - b[0]);
}

describe('groupFamilies — relationship signal', () => {
    it('merges children who share a parent', () => {
        const people = [
            person(1, 'Bauer', { street: 'Ahornweg 3' }),
            person(2, 'Bauer', { street: 'Ahornweg 3' }),
        ];
        const rels: Relationship[] = [
            { personId: 1, relativeId: 900, kind: 'parent' },
            { personId: 2, relativeId: 900, kind: 'parent' },
        ];
        expect(membership(people, rels)).toEqual([[1, 2]]);
    });

    it('merges on an explicit link', () => {
        const people = [
            person(1, 'Bauer', { street: 'Ahornweg 3' }),
            person(2, 'Brandt', { street: 'Ahornweg 3' }),
        ];
        expect(membership(people, [{ personId: 1, relativeId: 2, kind: 'link' }])).toEqual([
            [1, 2],
        ]);
    });

    it('separates siblings who share a parent but live at different addresses', () => {
        // A family is a household; a sibling who has moved out, or lives with
        // the other parent, is a household of their own.
        const people = [
            person(1, 'Vogel', { street: 'Johannesstr. 17', zip: '70000' }),
            person(2, 'Vogel', { street: 'Schlossbergstraße 3', zip: '70000' }),
        ];
        const rels: Relationship[] = [
            { personId: 1, relativeId: 900, kind: 'parent' },
            { personId: 2, relativeId: 900, kind: 'parent' },
        ];
        expect(membership(people, rels)).toEqual([[1], [2]]);
    });

    it('separates an explicit link across different addresses', () => {
        const people = [
            person(1, 'Bauer', { street: 'Ahornweg 3' }),
            person(2, 'Bauer', { street: 'Birkenweg 9' }),
        ];
        expect(membership(people, [{ personId: 1, relativeId: 2, kind: 'link' }])).toEqual([
            [1],
            [2],
        ]);
    });

    it('keeps a married daughter with her own household, not her parents', () => {
        // Live case: the daughter is recorded as her parents' child and as
        // her husband's spouse. Through her, the chain parent's other child →
        // daughter → husband (same address, same married name) used to fold
        // two households into one family.
        const people = [
            person(1, 'Kern', { street: 'Talweg 30' }), // younger child at home
            person(2, 'Lang', { street: 'Rathausgasse 5' }), // married daughter
            person(3, 'Lang', { street: 'Rathausgasse 5' }), // her husband
        ];
        const rels: Relationship[] = [
            { personId: 1, relativeId: 900, kind: 'parent' },
            { personId: 2, relativeId: 900, kind: 'parent' },
        ];
        expect(membership(people, rels)).toEqual([[1], [2, 3]]);
    });

    it('still links a sibling without an address through the relationship', () => {
        // No address is nothing to contradict the record.
        const people = [
            person(1, 'Bauer', { street: 'Ahornweg 3' }),
            person(2, 'Bauer', { street: null }),
        ];
        const rels: Relationship[] = [
            { personId: 1, relativeId: 900, kind: 'parent' },
            { personId: 2, relativeId: 900, kind: 'parent' },
        ];
        expect(membership(people, rels)).toEqual([[1, 2]]);
    });

    it('does not let an address-less sibling join two households', () => {
        // 2 has no address and shares a parent with both 1 and 3, who live
        // apart. Each household stays itself; the bridge stands alone.
        const people = [
            person(1, 'Bauer', { street: 'Ahornweg 3' }),
            person(2, 'Bauer', { street: null }),
            person(3, 'Bauer', { street: 'Birkenweg 9' }),
        ];
        const rels: Relationship[] = [
            { personId: 1, relativeId: 900, kind: 'parent' },
            { personId: 2, relativeId: 900, kind: 'parent' },
            { personId: 3, relativeId: 900, kind: 'parent' },
        ];
        expect(membership(people, rels)).toEqual([[1], [2], [3]]);
    });

    it('merges the siblings at home when the first-listed one lives elsewhere', () => {
        const people = [
            person(1, 'Krause', { street: 'Weit weg 1' }),
            person(2, 'Kraus', { street: 'Lindenweg 4' }),
            person(3, 'Krauss', { street: 'Lindenweg 4' }),
        ];
        const rels: Relationship[] = [
            { personId: 1, relativeId: 900, kind: 'parent' },
            { personId: 2, relativeId: 900, kind: 'parent' },
            { personId: 3, relativeId: 900, kind: 'parent' },
        ];
        expect(membership(people, rels)).toEqual([[1], [2, 3]]);
    });

    it('ignores a relationship whose other end is not on the list', () => {
        // A relative who is not on the list must not appear in it as a
        // phantom family member.
        const people = [person(1, 'Bauer', { street: 'Ahornweg 3' })];
        expect(membership(people, [{ personId: 1, relativeId: 77, kind: 'link' }])).toEqual([[1]]);
    });

    it('merges three children sharing one of two parents', () => {
        const people = [
            person(1, 'Krause', { street: 'Lindenweg 4' }),
            person(2, 'Krause', { street: 'Lindenweg 4' }),
            person(3, 'Krause', { street: 'Lindenweg 4' }),
        ];
        const rels: Relationship[] = [
            { personId: 1, relativeId: 900, kind: 'parent' },
            { personId: 1, relativeId: 901, kind: 'parent' },
            { personId: 2, relativeId: 901, kind: 'parent' },
            { personId: 3, relativeId: 900, kind: 'parent' },
        ];
        expect(membership(people, rels)).toEqual([[1, 2, 3]]);
    });
});

describe('groupFamilies — address signal', () => {
    it('merges same address and same surname when no relationship is recorded', () => {
        // Twelve sibling pairs on one live installation look exactly like this.
        const people = [
            person(1, 'Roy', { street: 'Haldenstr. 26', zip: '72213' }),
            person(2, 'Roy', { street: 'Haldenstr. 26', zip: '72213' }),
        ];
        expect(membership(people, [])).toEqual([[1, 2]]);
    });

    it('does NOT merge same address with different surnames', () => {
        // Hauptstr. 67/1 in 72227 houses two unrelated families. Merging them
        // would wrongly exempt a child.
        const people = [
            person(1, 'Kurz', { street: 'Markgrafenweg 23', zip: '72213' }),
            person(2, 'Sailer', { street: 'Markgrafenweg 23', zip: '72213' }),
        ];
        expect(membership(people, [])).toEqual([[1], [2]]);
    });

    it('folds German street spelling variants together', () => {
        const people = [
            person(1, 'Dieterle', { street: 'Weiler Str. 78', zip: '72285' }),
            person(2, 'Dieterle', { street: 'Weilerstraße 78', zip: '72285' }),
            person(3, 'Dieterle', { street: 'Weilerstrasse 78', zip: '72285' }),
        ];
        expect(membership(people, [])).toEqual([[1, 2, 3]]);
    });

    it('ignores the space before the house number', () => {
        // Live case: "Gartenstraße3" and "Gartenstraße 3", "Goethestr.35" and
        // "Goethestraße 35" — the same doors.
        const people = [
            person(1, 'Schmid', { street: 'Gartenstraße3', zip: '71296' }),
            person(2, 'Schmid', { street: 'Gartenstraße 3', zip: '71296' }),
            person(3, 'Wolf', { street: 'Goethestr.35', zip: '75395' }),
            person(4, 'Wolf', { street: 'Goethestraße 35', zip: '75395' }),
        ];
        expect(membership(people, [])).toEqual([
            [1, 2],
            [3, 4],
        ]);
    });

    it('treats differing house numbers as different addresses', () => {
        // Hanfgartenweg 12 and 12/1 are two cousin families, not one.
        const people = [
            person(1, 'Gauss', { street: 'Hanfgartenweg 12', zip: '72227' }),
            person(2, 'Gauss', { street: 'Hanfgartenweg 12/1', zip: '72227' }),
        ];
        expect(membership(people, [])).toEqual([[1], [2]]);
    });

    it('does not merge on a missing street, even with equal surname and zip', () => {
        const people = [
            person(1, 'Ohne', { street: null, zip: '72213' }),
            person(2, 'Ohne', { street: '', zip: '72213' }),
        ];
        expect(membership(people, [])).toEqual([[1], [2]]);
    });

    it('does not merge same surname at different zips', () => {
        const people = [
            person(1, 'Mueller', { street: 'Klosterweg 16', zip: '72280' }),
            person(2, 'Mueller', { street: 'Klosterweg 16', zip: '72226' }),
        ];
        expect(membership(people, [])).toEqual([[1], [2]]);
    });
});

describe('groupFamilies — combination and determinism', () => {
    it('combines both signals within one address, but never across two', () => {
        const people = [
            person(1, 'Henne', { street: 'Paulinenstr. 6' }),
            person(2, 'Henne', { street: 'Paulinenstr. 6' }),
            person(3, 'Henne', { street: 'Weit weg 1', zip: '99999' }),
        ];
        const rels: Relationship[] = [
            { personId: 1, relativeId: 900, kind: 'parent' },
            { personId: 3, relativeId: 900, kind: 'parent' },
        ];
        expect(membership(people, rels)).toEqual([[1, 2], [3]]);
    });

    it('assigns stable keys regardless of input order', () => {
        const a = person(5, 'Alpha', { street: 'A-Weg 1' });
        const b = person(2, 'Beta', { street: 'B-Weg 2' });
        const forward = groupFamilies([a, b], []);
        const reversed = groupFamilies([b, a], []);
        expect(forward).toEqual(reversed);
        expect(forward.map((f) => f.key)).toEqual(['F001', 'F002']);
        expect(forward[0].personIds).toEqual([2]);
    });

    it('returns every participant exactly once', () => {
        const people = [
            person(1, 'Eins', { street: 'X 1' }),
            person(2, 'Eins', { street: 'X 1' }),
            person(3, 'Zwei', { street: 'Y 2' }),
            person(4, 'Drei', { street: null }),
        ];
        const families = groupFamilies(people, []);
        const seen = families.flatMap((f) => f.personIds).sort((x, y) => x - y);
        expect(seen).toEqual([1, 2, 3, 4]);
    });
});

describe('normalizeStreet', () => {
    it.each([
        ['Weiler Str. 78', 'Weilerstraße 78'],
        ['Besenfelder Str. 5a', 'Besenfelder Straße 5a'],
        ['Alte Str. 8', 'Alte Straße 8'],
        ['  Paulinenstr.  6 ', 'Paulinenstraße 6'],
        ['Gartenstraße3', 'Gartenstraße 3'],
        ['Goethestr.35', 'Goethestraße 35'],
    ])('treats %s and %s as the same street', (a, b) => {
        expect(normalizeStreet(a)).toBe(normalizeStreet(b));
    });

    it('keeps genuinely different streets apart', () => {
        expect(normalizeStreet('Hanfgartenweg 12')).not.toBe(normalizeStreet('Hanfgartenweg 12/1'));
        expect(normalizeStreet('Höhenstr. 19')).not.toBe(normalizeStreet('Höhenstr. 22'));
    });

    it('maps blank input to the empty string', () => {
        expect(normalizeStreet(null)).toBe('');
        expect(normalizeStreet('   ')).toBe('');
    });
});

describe('groupFamilies — people on the list who are not children', () => {
    it('keeps a parent on the list with their child at the same address', () => {
        // A camp with helping parents: different surname after a remarriage,
        // so only the relationship joins them.
        const people = [
            person(1, 'Bauer', { street: 'Ahornweg 3' }),
            person(2, 'Krämer', { street: 'Ahornweg 3' }),
        ];
        const rels: Relationship[] = [
            { personId: 1, relativeId: 2, kind: 'parent' },
            { personId: 1, relativeId: 2, kind: 'link' },
        ];
        expect(membership(people, rels)).toEqual([[1, 2]]);
    });

    it('keeps a parent at another address apart, as any relative', () => {
        const people = [
            person(1, 'Bauer', { street: 'Ahornweg 3' }),
            person(2, 'Bauer', { street: 'Birkenweg 9' }),
        ];
        expect(membership(people, [{ personId: 1, relativeId: 2, kind: 'link' }])).toEqual([
            [1],
            [2],
        ]);
    });
});
