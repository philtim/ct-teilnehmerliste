import { describe, expect, it } from 'vitest';
import { memberEdges, missingTypes, resolveRelationshipTypes } from './relationships';

describe('resolveRelationshipTypes', () => {
    it('finds parent/child and couple by their built-in keys, whatever their ids', () => {
        // A typical list: no sibling type at all.
        const types = [
            { id: 7, name: 'relationship.parent-child', nameTranslated: 'Elternteil/Kind' },
            { id: 2, name: 'relationship.couple', nameTranslated: 'Ehepaar' },
            { id: 5, name: 'noduplicate.name', nameTranslated: 'Keine Dublette' },
        ];
        expect(resolveRelationshipTypes(types)).toEqual({
            parentChild: 7,
            sibling: null,
            couple: 2,
        });
    });

    it('finds a sibling type by built-in key or by its German name', () => {
        expect(resolveRelationshipTypes([{ id: 3, name: 'relationship.siblings' }]).sibling).toBe(
            3,
        );
        expect(
            resolveRelationshipTypes([{ id: 4, degreeNameA: 'relationship.part.sibling' }]).sibling,
        ).toBe(4);
        expect(resolveRelationshipTypes([{ id: 9, name: ' Geschwister ' }]).sibling).toBe(9);
    });

    it('finds a type by its translated name, and skips a row without an id', () => {
        expect(
            resolveRelationshipTypes([
                { name: 'relationship.parent-child' },
                { id: 7, name: 'relationship.parent-child' },
                { id: 8, name: 'custom.x', nameTranslated: 'Geschwister' },
                { id: 11, name: 'custom.y', nameTranslated: 'Ehepaar' },
            ]),
        ).toEqual({ parentChild: 7, sibling: 8, couple: 11 });
    });

    it('does not mistake a type named in passing for one of them', () => {
        expect(
            resolveRelationshipTypes([
                { id: 1, name: 'Elternteil/Kind (Pflege)' },
                { id: 2, name: 'Geschwisterkind-Pate' },
                { id: 3, name: 'relationship.siblings-in-law' },
                { id: 4, name: 'Ehepaar-Paten' },
            ]),
        ).toEqual({ parentChild: null, sibling: null, couple: null });
    });
});

describe('memberEdges', () => {
    const types = { parentChild: 7, sibling: 3, couple: 2 };
    const members = new Set([10, 11]);

    it('reads parent/child as A = parent, B = child, with the parent off the list', () => {
        expect(
            memberEdges(
                [{ personAId: 99, personBId: 10, relationshipType: { id: 7 } }],
                types,
                members,
            ),
        ).toEqual([{ personId: 10, relativeId: 99, kind: 'parent' }]);
    });

    it('links a parent and child who are both on the list', () => {
        expect(
            memberEdges(
                [{ personAId: 11, personBId: 10, relationshipType: { id: 7 } }],
                types,
                members,
            ),
        ).toEqual([
            { personId: 10, relativeId: 11, kind: 'parent' },
            { personId: 10, relativeId: 11, kind: 'link' },
        ]);
    });

    it('ignores a parent on the list whose child is not', () => {
        expect(
            memberEdges(
                [{ personAId: 10, personBId: 99, relationshipType: { id: 7 } }],
                types,
                members,
            ),
        ).toEqual([]);
    });

    it('links siblings and a married couple when both are on the list', () => {
        expect(
            memberEdges(
                [
                    { personAId: 10, personBId: 11, relationshipType: { id: 3 } },
                    { personAId: 11, personBId: 10, relationshipType: { id: 2 } },
                    { personAId: 10, personBId: 99, relationshipType: { id: 2 } },
                ],
                types,
                members,
            ),
        ).toEqual([
            { personId: 10, relativeId: 11, kind: 'link' },
            { personId: 11, relativeId: 10, kind: 'link' },
        ]);
    });

    it('drops other types, edges not touching the list, and incomplete rows', () => {
        expect(
            memberEdges(
                [
                    { personAId: 10, personBId: 11, relationshipType: { id: 4 } },
                    { personAId: 50, personBId: 51, relationshipType: { id: 7 } },
                    { personAId: 10, relationshipType: { id: 3 } },
                    { personAId: 99, personBId: 10 },
                ],
                types,
                members,
            ),
        ).toEqual([]);
    });

    it('reads nothing as a type the installation does not have', () => {
        expect(
            memberEdges(
                [{ personAId: 10, personBId: 11, relationshipType: { id: 3 } }],
                { parentChild: 7, sibling: null, couple: null },
                members,
            ),
        ).toEqual([]);
    });
});

describe('missingTypes', () => {
    it('names the types the installation lacks', () => {
        expect(missingTypes({ parentChild: 7, sibling: null, couple: 2 })).toEqual(['sibling']);
    });
});
