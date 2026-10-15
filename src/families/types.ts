/** What family detection needs to know about a person — nothing more. */
export type FamilyPerson = {
    personId: number;
    firstName: string;
    lastName: string;
    street: string | null;
    zip: string | null;
    city: string | null;
};

/** A household among the listed people. Only members of the list are in it. */
export type Family = {
    key: string;
    personIds: number[];
};

/**
 * A ChurchTools relationship, reduced to what family detection needs.
 *
 * - `parent`: `relativeId` is a parent of `personId`. The parent need not be
 *   on the list; two children sharing one are a family through them.
 * - `link`: the two belong to one household directly — siblings, a married
 *   couple, or a parent and child who are both on the list.
 */
export type Relationship = {
    personId: number;
    relativeId: number;
    kind: 'parent' | 'link';
};
