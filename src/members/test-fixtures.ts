/**
 * Synthetic people for the tests. No real name or address belongs in a
 * public repository; the shapes mirror what ChurchTools returns.
 */
import type { FieldDef, Member } from './types';

export function member(personId: number, opts: Partial<Member> = {}): Member {
    return {
        personId,
        firstName: `Vorname${personId}`,
        lastName: 'Muster',
        street: 'Musterweg 1',
        zip: '70000',
        city: 'Musterstadt',
        emails: [],
        frontendUrl: `https://gemeinde.church.tools/persons/${personId}/`,
        roleName: 'Teilnehmer',
        status: 'active',
        memberSince: '2026-03-12',
        comment: null,
        groupFields: {},
        person: {},
        personLoaded: true,
        ...opts,
    };
}

export const FEE: FieldDef = {
    source: 'group',
    key: '3226',
    label: 'Beitrag',
    kind: 'select',
    options: [
        { id: '2032', label: '190' },
        { id: '2035', label: '175' },
    ],
};
export const PAID: FieldDef = {
    source: 'group',
    key: '3223',
    label: 'Bezahlt',
    kind: 'text',
    options: [],
};
export const EMERGENCY: FieldDef = {
    source: 'group',
    key: '3229',
    label: 'Notfallnummer',
    kind: 'text',
    options: [],
};
export const VEGETARIAN: FieldDef = {
    source: 'group',
    key: '3259',
    label: 'Vegetarisch',
    kind: 'checkbox',
    options: [],
};
export const SWIM: FieldDef = {
    source: 'group',
    key: '3256',
    label: 'Schwimmerlaubnis',
    kind: 'multiselect',
    options: [
        { id: '2110', label: 'Schwimmbad' },
        { id: '2113', label: 'Baggersee' },
    ],
};
export const ACCOUNT_NO: FieldDef = {
    source: 'person',
    key: 'optigemId',
    label: 'Optigem-Nr',
    kind: 'text',
    options: [],
};
