import type { Relationship } from './types';

/** A relationship type as `/person/masterdata` lists it. */
export type RelationshipTypeRow = {
    id?: number;
    /** A built-in type's fixed translation key; free text for a custom one. */
    name?: string;
    nameTranslated?: string;
    degreeNameA?: string;
};

/** One row of `/persons/relationships`. */
export type RelationshipRow = {
    personAId?: number;
    personBId?: number;
    relationshipType?: { id?: number };
};

export type RelationshipTypeIds = {
    parentChild: number | null;
    sibling: number | null;
    couple: number | null;
};

/**
 * Which relationship types mean parent/child, sibling and married couple at
 * this installation.
 *
 * The ids differ between installations, so they are looked up rather than
 * written down. ChurchTools' built-in types carry a fixed translation key in
 * `name` — `relationship.parent-child`, `relationship.couple` — which says what
 * a type *is* whatever its id. A sibling type is not built in everywhere, and
 * one added by hand has whatever name its admin typed, so the German name is
 * accepted for it as well as the built-in key.
 *
 * Every type is optional here. Without one, families rest on the other
 * signals, and the preview says so (`missingTypes`).
 */
export function resolveRelationshipTypes(types: RelationshipTypeRow[]): RelationshipTypeIds {
    const find = (matches: (t: RelationshipTypeRow) => boolean) =>
        types.find((t) => typeof t.id === 'number' && matches(t))?.id ?? null;
    const isNamed = (t: RelationshipTypeRow, word: string) =>
        [t.name, t.nameTranslated].some((n) => n?.trim().toLocaleLowerCase('de') === word);

    return {
        parentChild: find((t) => t.name === 'relationship.parent-child'),
        sibling: find(
            (t) =>
                /^relationship\.siblings?$/.test(t.name ?? '') ||
                t.degreeNameA === 'relationship.part.sibling' ||
                isNamed(t, 'geschwister'),
        ),
        couple: find(
            (t) =>
                t.name === 'relationship.couple' ||
                t.degreeNameA === 'relationship.part.spouse' ||
                isNamed(t, 'ehepaar'),
        ),
    };
}

/**
 * The relationship rows reduced to the edges that touch someone on the list.
 *
 * Edge direction, the one thing worth getting right here (confirmed on a live
 * installation): for parent/child, `personA` is the **parent** and `personB`
 * the **child**.
 *
 * - A child on the list gets a `parent` edge, whether or not the parent is on
 *   the list — two children sharing a parent are one family through them.
 * - A parent and child who are *both* on the list are linked directly: a
 *   camp with helping parents, a congregation's family weekend.
 * - Siblings and married couples are linked directly when both are on the
 *   list. One edge per row is enough; a link has no direction.
 */
export function memberEdges(
    rows: RelationshipRow[],
    types: RelationshipTypeIds,
    memberIds: ReadonlySet<number>,
): Relationship[] {
    const edges: Relationship[] = [];
    for (const row of rows) {
        const a = row.personAId;
        const b = row.personBId;
        const typeId = row.relationshipType?.id;
        if (typeof a !== 'number' || typeof b !== 'number' || typeof typeId !== 'number') continue;

        if (typeId === types.parentChild) {
            if (!memberIds.has(b)) continue;
            edges.push({ personId: b, relativeId: a, kind: 'parent' });
            if (memberIds.has(a)) edges.push({ personId: b, relativeId: a, kind: 'link' });
        } else if (typeId === types.sibling || typeId === types.couple) {
            if (memberIds.has(a) && memberIds.has(b)) {
                edges.push({ personId: a, relativeId: b, kind: 'link' });
            }
        }
    }
    return edges;
}

/** Which of the three types this installation does not have — for the preview's hint. */
export function missingTypes(types: RelationshipTypeIds): (keyof RelationshipTypeIds)[] {
    return (Object.keys(types) as (keyof RelationshipTypeIds)[]).filter((k) => types[k] === null);
}
