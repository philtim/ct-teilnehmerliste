import { describe, expect, it } from 'vitest';
import { buildCatalog, COLUMN_ID, resolveColumns } from './columns';
import { buildList } from './rows';
import { buildSheets, exportFileName, toExcel } from './workbook';
import { FEE, member } from './fixtures';

const group = {
    id: 9,
    name: 'Freizeit',
    groupTypeId: 3,
    groupStatusId: 1,
    frontendUrl: 'https://gemeinde.church.tools/groups/9',
};
const meta = {
    group,
    loadedAt: new Date(2026, 9, 15, 18, 30),
    version: '1.0.0',
    commit: 'abc1234',
};

describe('buildSheets', () => {
    const members = [
        member(1, { lastName: 'Zander', groupFields: { '3226': '2032' } }),
        member(2, { lastName: 'Zander', groupFields: { '3226': '2035' } }),
        member(3, { lastName: 'Albers', street: 'Anderer Weg 9' }),
    ];
    const catalog = buildCatalog([FEE], []);
    const selected = new Set([COLUMN_ID.id, COLUMN_ID.lastName, 'group:3226', COLUMN_ID.family]);
    const list = buildList(members, []);
    const columns = resolveColumns(catalog, selected, members);
    const keys = new Map(list.rows.map((r) => [r.member.personId, r.familyKey]));
    const [sheet, info] = buildSheets(
        list,
        columns,
        { familyKeyOf: (id) => keys.get(id) ?? '' },
        meta,
    );

    it('writes a header and one row per listed person, in list order', () => {
        expect(sheet.sheet).toBe('Mitglieder');
        expect(sheet.data[0].map((c) => (c as { value: string }).value)).toEqual([
            'ID',
            'Nachname',
            'Beitrag',
            'Familien-ID',
        ]);
        expect(sheet.data).toHaveLength(4);
        expect(sheet.stickyRowsCount).toBe(1);
        expect(sheet.columns).toHaveLength(4);
    });

    it('links the id to the profile and marks families of several', () => {
        // Row 1 is the header, row 2 Albers (F001), then the Zanders (F002).
        const zander = sheet.data[2];
        expect(zander[0]).toMatchObject({
            type: 'Formula',
            value: 'HYPERLINK("https://gemeinde.church.tools/persons/1/",1)',
        });
        expect(zander[2]).toEqual({ value: 190, type: Number });
        expect(zander[3]).toMatchObject({ value: 'F002', backgroundColor: '#FFF2CC' });
        const albers = sheet.data[1];
        expect(albers[3]).toEqual({ value: 'F001', type: String });
    });

    it('says where the list came from', () => {
        expect(info.sheet).toBe('Info');
        const values = info.data.map((row) => (row[1] as { value: unknown }).value);
        expect(values).toContain('Freizeit');
        expect(values).toContain(group.frontendUrl);
        expect(values).toContain('Teilnehmerliste 1.0.0 (abc1234)');
        expect(values).toContain(3);
    });
});

describe('toExcel', () => {
    it('writes dates as dates and leaves empty cells empty', () => {
        expect(toExcel({ kind: 'date', value: '2026-03-12' })).toEqual({
            value: new Date(Date.UTC(2026, 2, 12)),
            type: Date,
            format: 'dd.mm.yyyy',
        });
        expect(toExcel(null)).toEqual({ value: undefined, type: String });
    });

    it('escapes quotes in a link', () => {
        expect(toExcel({ kind: 'link', value: 1, href: 'https://x/"a"' }).value).toBe(
            'HYPERLINK("https://x/""a""",1)',
        );
    });
});

describe('exportFileName', () => {
    it('names the group and the day, without characters a file name cannot hold', () => {
        expect(exportFileName('Camp: 2026/27 "Exodus"', new Date(2026, 9, 5))).toBe(
            'Teilnehmerliste – Camp 2026 27 Exodus – 2026-10-05.xlsx',
        );
        expect(exportFileName('  ', new Date(2026, 0, 1))).toBe(
            'Teilnehmerliste – Gruppe – 2026-01-01.xlsx',
        );
    });
});
