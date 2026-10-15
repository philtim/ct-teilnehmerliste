import { describe, expect, it } from 'vitest';
import {
    buildCatalog,
    COLUMN_ID,
    displayOf,
    fieldCell,
    resolveColumns,
    selectionFor,
    toStored,
} from './columns';
import type { CellContext } from './columns';
import { ACCOUNT_NO, EMERGENCY, FEE, member, PAID, SWIM, VEGETARIAN } from './test-fixtures';

const ctx: CellContext = { familyKeyOf: (id) => `F${id}` };
const catalog = buildCatalog([FEE, PAID, EMERGENCY], [ACCOUNT_NO]);

describe('buildCatalog', () => {
    it('orders person, further person fields, membership, group fields, family', () => {
        expect(catalog.map((c) => c.id)).toEqual([
            COLUMN_ID.id,
            COLUMN_ID.lastName,
            COLUMN_ID.firstName,
            COLUMN_ID.street,
            COLUMN_ID.zip,
            COLUMN_ID.city,
            COLUMN_ID.emails,
            'person:optigemId',
            COLUMN_ID.role,
            COLUMN_ID.status,
            COLUMN_ID.since,
            COLUMN_ID.comment,
            'group:3226',
            'group:3223',
            'group:3229',
            COLUMN_ID.family,
        ]);
    });

    it('turns further person fields and the comment off by default, everything else on', () => {
        const off = catalog.filter((c) => !c.defaultOn).map((c) => c.id);
        expect(off).toEqual(['person:optigemId', COLUMN_ID.comment]);
    });
});

describe('selectionFor', () => {
    it('uses the defaults without a remembered choice', () => {
        expect(selectionFor(catalog, null).has('person:optigemId')).toBe(false);
        expect(selectionFor(catalog, null).has('group:3226')).toBe(true);
    });

    it('restores a remembered choice and gives a column added since its default', () => {
        const stored = toStored(catalog, new Set([COLUMN_ID.lastName, 'person:optigemId']));
        const withNewField = buildCatalog([FEE, PAID, EMERGENCY, VEGETARIAN], [ACCOUNT_NO]);
        const selected = selectionFor(withNewField, stored);
        expect(selected.has(COLUMN_ID.lastName)).toBe(true);
        expect(selected.has('person:optigemId')).toBe(true);
        expect(selected.has(COLUMN_ID.firstName)).toBe(false);
        expect(selected.has('group:3259')).toBe(true);
    });

    it('keeps the choice for columns this viewer cannot see when saving', () => {
        // Someone with more rights ticked a person field this viewer lacks.
        const previous = { selected: ['person:iban'], known: ['person:iban', COLUMN_ID.zip] };
        const stored = toStored(catalog, new Set([COLUMN_ID.zip]), previous);
        expect(stored.selected).toEqual([COLUMN_ID.zip, 'person:iban']);
        expect(stored.known).toContain('person:iban');
        expect(stored.known.filter((id) => id === COLUMN_ID.zip)).toHaveLength(1);
    });

    it('ignores remembered ids that no longer exist', () => {
        const selected = selectionFor(catalog, { selected: ['group:999'], known: ['group:999'] });
        expect(selected.has('group:999')).toBe(false);
    });
});

describe('resolveColumns', () => {
    it('expands the e-mail column to the most addresses anyone has, up to three', () => {
        const members = [
            member(1, { emails: ['a@x.de'] }),
            member(2, { emails: ['b@x.de', 'c@x.de', 'd@x.de', 'e@x.de'] }),
        ];
        const columns = resolveColumns(catalog, new Set([COLUMN_ID.emails]), members);
        expect(columns.map((c) => c.header)).toEqual(['E-Mail 1', 'E-Mail 2', 'E-Mail 3']);
        expect(columns.map((c) => displayOf(c.cell(members[0], ctx)))).toEqual(['a@x.de', '', '']);
    });

    it('keeps one plain e-mail column when nobody has more than one', () => {
        const columns = resolveColumns(catalog, new Set([COLUMN_ID.emails]), [member(1)]);
        expect(columns.map((c) => c.header)).toEqual(['E-Mail']);
    });

    it('writes a field whose values are all plain numbers as numbers', () => {
        const members = [
            member(1, { groupFields: { '3226': '2032', '3223': '60' } }),
            member(2, { groupFields: { '3226': '2035', '3223': '12,50' } }),
            member(3, { groupFields: {} }),
        ];
        const columns = resolveColumns(catalog, new Set(['group:3226', 'group:3223']), members);
        expect(columns.map((c) => c.cell(members[0], ctx))).toEqual([
            { kind: 'number', value: 190 },
            { kind: 'number', value: 60 },
        ]);
        expect(columns[1].cell(members[1], ctx)).toEqual({ kind: 'number', value: 12.5 });
        expect(columns[1].cell(members[2], ctx)).toBeNull();
    });

    it('keeps a German thousands value as text rather than misreading it', () => {
        const members = [
            member(1, { groupFields: { '3223': '1.250' } }),
            member(2, { groupFields: { '3223': '60' } }),
        ];
        const [col] = resolveColumns(catalog, new Set(['group:3223']), members);
        expect(col.cell(members[0], ctx)).toEqual({ kind: 'text', value: '1.250' });
    });

    it('reads a decimal point with one or two digits as a decimal', () => {
        const members = [member(1, { groupFields: { '3223': '12.5' } })];
        const [col] = resolveColumns(catalog, new Set(['group:3223']), members);
        expect(col.cell(members[0], ctx)).toEqual({ kind: 'number', value: 12.5 });
    });

    it('keeps phone numbers and mixed values as text', () => {
        const members = [
            member(1, { groupFields: { '3229': '015122040175', '3223': '60' } }),
            member(2, { groupFields: { '3223': 'bar bezahlt' } }),
        ];
        const columns = resolveColumns(catalog, new Set(['group:3229', 'group:3223']), members);
        expect(columns.map((c) => c.cell(members[0], ctx)?.kind)).toEqual(['text', 'text']);
    });

    it('never treats a base column as a number, so postcodes keep their leading zero', () => {
        const m = member(1, { zip: '01067' });
        const [zip] = resolveColumns(catalog, new Set([COLUMN_ID.zip]), [m]);
        expect(zip.cell(m, ctx)).toEqual({ kind: 'text', value: '01067' });
    });

    it('fills the base, membership and family columns', () => {
        const m = member(7, { status: 'waiting', comment: 'x' });
        const selected = new Set([
            COLUMN_ID.id,
            COLUMN_ID.status,
            COLUMN_ID.since,
            COLUMN_ID.family,
        ]);
        const cells = resolveColumns(catalog, selected, [m]).map((c) => c.cell(m, ctx));
        expect(cells).toEqual([
            { kind: 'link', value: 7, href: m.frontendUrl },
            { kind: 'text', value: 'Warteliste' },
            { kind: 'date', value: '2026-03-12' },
            { kind: 'text', value: 'F7' },
        ]);
    });

    it('reads a person field from the person record', () => {
        const m = member(1, { person: { optigemId: '0042' } });
        const [col] = resolveColumns(catalog, new Set(['person:optigemId']), [m]);
        expect(col.cell(m, ctx)).toEqual({ kind: 'text', value: '0042' });
    });
});

describe('fieldCell', () => {
    it('renders options, ticks, multiple choices, dates and numbers', () => {
        expect(fieldCell(FEE, '2035')).toEqual({ kind: 'text', value: '175' });
        expect(fieldCell(FEE, '9999')).toEqual({ kind: 'text', value: '9999' });
        expect(fieldCell(VEGETARIAN, '1')).toEqual({ kind: 'text', value: 'ja' });
        expect(fieldCell(VEGETARIAN, '0')).toEqual({ kind: 'text', value: 'nein' });
        expect(fieldCell(SWIM, ['2110', '2113'])).toEqual({
            kind: 'text',
            value: 'Schwimmbad, Baggersee',
        });
        expect(fieldCell({ ...PAID, kind: 'date' }, '2026-08-01')).toEqual({
            kind: 'date',
            value: '2026-08-01',
        });
        expect(fieldCell({ ...PAID, kind: 'number' }, '3,5')).toEqual({
            kind: 'number',
            value: 3.5,
        });
    });

    it('leaves an unset value empty', () => {
        expect(fieldCell(VEGETARIAN, null)).toBeNull();
        expect(fieldCell(PAID, '')).toBeNull();
        expect(fieldCell(PAID, '   ')).toBeNull();
    });
});

describe('displayOf', () => {
    it('shows German dates and numbers', () => {
        expect(displayOf({ kind: 'date', value: '2026-03-12' })).toBe('12.03.2026');
        expect(displayOf({ kind: 'number', value: 1234.5 })).toBe('1234,5');
        // As Excel shows a General-format number: no thousands separator.
        expect(displayOf({ kind: 'number', value: 2026 })).toBe('2026');
        expect(displayOf({ kind: 'number', value: 12.3456 })).toBe('12,3456');
        expect(displayOf(null)).toBe('');
    });
});
