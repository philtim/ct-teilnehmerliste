/**
 * The shapes the list is built from: what ChurchTools returns, reduced to
 * what the preview and the workbook need.
 */
import type { Relationship } from '@/families/types';

/** A group as the picker and the list header show it. */
export type GroupInfo = {
    id: number;
    name: string;
    groupTypeId: number | null;
    groupStatusId: number | null;
    frontendUrl: string;
};

/** A field option as ChurchTools lists it: the stored id and its label. */
export type FieldOption = { id: string; label: string };

/** The field types the list knows how to render; everything else reads as text. */
export type FieldKind = 'text' | 'select' | 'multiselect' | 'checkbox' | 'date' | 'number';

/**
 * A field definition, from either source:
 * - `group`: a group member field of the chosen group (`/groups/{id}/memberfields`),
 *   keyed by its numeric id, its value on the membership;
 * - `person`: a person field of the installation (`/fields`), keyed by its
 *   API key, its value on the person.
 */
export type FieldDef = {
    source: 'group' | 'person';
    key: string;
    label: string;
    kind: FieldKind;
    options: FieldOption[];
};

/** Membership status as ChurchTools names it; the copy translates it. */
export type MemberStatus = string;

/** One member of the chosen group, with everything any column can show. */
export type Member = {
    personId: number;
    firstName: string;
    lastName: string;
    street: string | null;
    zip: string | null;
    city: string | null;
    /** Default address first, then in ChurchTools' order. */
    emails: string[];
    /** ChurchTools' own link to the person's profile. */
    frontendUrl: string;
    roleName: string;
    status: MemberStatus;
    /** ISO `yyyy-mm-dd`, or null. */
    memberSince: string | null;
    comment: string | null;
    /** Raw group member field values, by field id. */
    groupFields: Record<string, unknown>;
    /** Raw person fields as `/persons` returned them; empty when unreadable. */
    person: Record<string, unknown>;
    /** False when ChurchTools did not return the person's details to this viewer. */
    personLoaded: boolean;
};

/** Everything one load of a group produces. */
export type GroupData = {
    group: GroupInfo;
    members: Member[];
    groupFields: FieldDef[];
    personFields: FieldDef[];
    /** Edges for family detection, already reduced to the members. */
    relationships: Relationship[];
    /** Why family detection may be incomplete, for the hint above the list. */
    relationshipProblem: 'unreadable' | 'noParentChildType' | null;
    loadedAt: Date;
};
