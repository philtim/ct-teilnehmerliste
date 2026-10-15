import { describe, expect, it } from 'vitest';
import {
    emailsOf,
    isoDate,
    roleNamesOf,
    toGroupFieldDefs,
    toGroupInfo,
    toMember,
    toPersonFieldDefs,
} from './parse';

const ORIGIN = 'https://gemeinde.church.tools';

describe('toGroupInfo', () => {
    it('reads id, name, type and status', () => {
        expect(
            toGroupInfo(
                { id: 7, name: ' Freizeit ', information: { groupTypeId: 3, groupStatusId: 4 } },
                ORIGIN,
            ),
        ).toEqual({
            id: 7,
            name: 'Freizeit',
            groupTypeId: 3,
            groupStatusId: 4,
            frontendUrl: `${ORIGIN}/groups/7`,
        });
    });

    it('refuses a group without an id', () => {
        expect(toGroupInfo({ name: 'x' }, ORIGIN)).toBeNull();
    });
});

describe('roleNamesOf', () => {
    it('maps groupTypeRoleId to the translated name', () => {
        const names = roleNamesOf({
            roles: [
                { groupTypeRoleId: 23, name: 'Leiter', nameTranslated: 'Leitung' },
                { groupTypeRoleId: 24, name: 'Teilnehmer' },
                { name: 'ohne id' },
            ],
        });
        expect([...names]).toEqual([
            [23, 'Leitung'],
            [24, 'Teilnehmer'],
        ]);
    });
});

describe('toGroupFieldDefs', () => {
    it('keeps the group fields with their options and leaves the person fields out', () => {
        const defs = toGroupFieldDefs([
            { type: 'person', field: { id: 4, name: 'street' } },
            {
                type: 'group',
                field: {
                    id: 3226,
                    name: 'Beitrag',
                    fieldTypeCode: 'select',
                    options: [{ id: '2032', name: '190' }],
                },
            },
            { type: 'group', field: { id: 3241, name: 'Bild', fieldTypeCode: 'radioselect' } },
            { type: 'group', field: { id: 9, name: 'Neu', fieldTypeCode: 'something-new' } },
        ]);
        expect(defs).toEqual([
            {
                source: 'group',
                key: '3226',
                label: 'Beitrag',
                kind: 'select',
                options: [{ id: '2032', label: '190' }],
            },
            { source: 'group', key: '3241', label: 'Bild', kind: 'select', options: [] },
            { source: 'group', key: '9', label: 'Neu', kind: 'text', options: [] },
        ]);
    });
});

describe('toPersonFieldDefs', () => {
    const field = (key: string, extra: Record<string, unknown> = {}) => ({
        key,
        nameTranslated: key,
        fieldCategoryCode: 'f_address',
        fieldTypeCode: 'text',
        isActive: 1,
        hideInFrontend: false,
        ...extra,
    });

    it('offers person data fields that are not already base columns', () => {
        const defs = toPersonFieldDefs(
            [
                field('firstName'),
                field('email'),
                field('mobile'),
                field('guid', { hideInFrontend: true }),
                field('isSystemUser', { isActive: 0 }),
                field('privacy', { fieldCategoryCode: 'f_datasecurity' }),
                field('Groups', { fieldCategoryCode: 'f_group' }),
                field('dateOfBaptism', { fieldCategoryCode: 'f_church', fieldTypeCode: 'date' }),
            ],
            {},
        );
        expect(defs.map((d) => [d.key, d.kind])).toEqual([
            ['mobile', 'text'],
            ['dateOfBaptism', 'date'],
        ]);
    });

    it('labels built-in options from the masterdata, then from ChurchTools keys', () => {
        const [sex, family] = toPersonFieldDefs(
            [
                field('sexId', {
                    fieldTypeCode: 'select',
                    options: [
                        { id: '1', name: 'sex.male' },
                        { id: '2', name: 'sex.female' },
                    ],
                }),
                field('familyStatusId', {
                    fieldCategoryCode: 'f_church',
                    fieldTypeCode: 'select',
                    options: [
                        { id: '2', name: 'familystatus.married' },
                        { id: '9', name: 'Eigene Option' },
                    ],
                }),
            ],
            { sexes: [{ id: 1, name: 'sex.male', nameTranslated: 'männlich' }] },
        );
        expect(sex.options).toEqual([
            { id: '1', label: 'männlich' },
            { id: '2', label: 'sex.female' },
        ]);
        expect(family.options).toEqual([
            { id: '2', label: 'verheiratet' },
            { id: '9', label: 'Eigene Option' },
        ]);
    });
});

describe('emailsOf', () => {
    it('puts the default address first and drops duplicates and blanks', () => {
        expect(
            emailsOf({
                email: 'b@x.de',
                emails: [
                    { email: 'a@x.de', isDefault: false },
                    { email: 'b@x.de', isDefault: true },
                    { email: ' ' },
                ],
            }),
        ).toEqual(['b@x.de', 'a@x.de']);
    });

    it('uses the single e-mail field when there is no list', () => {
        expect(emailsOf({ email: 'c@x.de' })).toEqual(['c@x.de']);
        expect(emailsOf({})).toEqual([]);
    });
});

describe('toMember', () => {
    const raw = {
        personId: 5,
        groupTypeRoleId: 23,
        groupMemberStatus: 'waiting',
        memberStartDate: '2026-03-12',
        comment: ' kommt später ',
        person: {
            domainIdentifier: '5',
            frontendUrl: `${ORIGIN}/persons/5`,
            domainAttributes: { firstName: 'Ida', lastName: 'Beispiel' },
        },
        fields: [
            { id: 3226, value: '2032' },
            { id: 3256, value: ['2110'] },
        ],
    };
    const roles = new Map([[23, 'Leitung']]);

    it('joins the membership with its person', () => {
        const m = toMember(
            raw,
            {
                id: 5,
                firstName: 'Ida',
                lastName: 'Beispiel',
                street: 'Weg 2',
                zip: '70001',
                city: 'Ort',
                email: 'i@x.de',
                optigemId: '42',
            },
            roles,
            ORIGIN,
        );
        expect(m).toMatchObject({
            personId: 5,
            street: 'Weg 2',
            emails: ['i@x.de'],
            roleName: 'Leitung',
            status: 'waiting',
            memberSince: '2026-03-12',
            comment: 'kommt später',
            groupFields: { '3226': '2032', '3256': ['2110'] },
            personLoaded: true,
            frontendUrl: `${ORIGIN}/persons/5`,
        });
        expect(m?.person.optigemId).toBe('42');
    });

    it('keeps a member whose details were withheld, with name and link only', () => {
        const m = toMember(raw, undefined, roles, ORIGIN);
        expect(m).toMatchObject({
            firstName: 'Ida',
            lastName: 'Beispiel',
            street: null,
            emails: [],
            person: {},
            personLoaded: false,
        });
    });

    it('does not take another person record for this member', () => {
        expect(toMember(raw, { id: 6, street: 'Fremd 1' }, roles, ORIGIN)?.street).toBeNull();
    });

    it('builds the profile link when the membership carries none', () => {
        const m = toMember({ personId: 8 }, undefined, roles, ORIGIN);
        expect(m?.frontendUrl).toBe(`${ORIGIN}/persons/8/`);
        expect(m?.roleName).toBe('');
    });
});

describe('isoDate', () => {
    it('keeps the day of a date or a datetime', () => {
        expect(isoDate('2026-03-12')).toBe('2026-03-12');
        expect(isoDate('2026-03-12T11:06:00Z')).toBe('2026-03-12');
        expect(isoDate('12.03.2026')).toBeNull();
        expect(isoDate(null)).toBeNull();
    });
});
