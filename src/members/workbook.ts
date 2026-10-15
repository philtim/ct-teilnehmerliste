/**
 * The Excel file: the list exactly as the preview shows it, plus a short
 * sheet saying where it came from.
 *
 * Pure — it builds the sheet data; `xlsx.ts` writes it. The file's own text
 * (sheet names, the Info sheet) lives here rather than in the copy, because it
 * is a document of its own.
 */
import type { CellObject, Sheet } from 'write-excel-file/browser';
import { COLUMN_ID } from './columns';
import type { CellContext, OutputColumn, Cell } from './columns';
import type { MemberList } from './rows';
import type { GroupInfo } from './types';

type FileContent = File | Blob | ArrayBuffer;
export type ExportSheet = Sheet<FileContent>;

export type ExportMeta = {
    group: GroupInfo;
    /** When the data was read — not when the file was written. */
    loadedAt: Date;
    /** Statuses filtered out of the list, as sentences ("zu löschen: 2 Personen"). */
    excludedStatuses: string[];
    /** The preview's hints about the data, so the file carries them too. */
    notes: string[];
    /** Extension version and commit, so a questioned list leads back to code. */
    version: string;
    commit: string;
};

const SHEET_LIST = 'Mitglieder';
const SHEET_INFO = 'Info';

const HEADER_FILL = '#E8EAED';
/** Marks a family of two or more, as the office's earlier lists did. */
const FAMILY_FILL = '#FFF2CC';
const LINK_COLOR = '#1155CC';
const DATE_FORMAT = 'dd.mm.yyyy';

export function buildSheets(
    list: MemberList,
    columns: OutputColumn[],
    ctx: CellContext,
    meta: ExportMeta,
): ExportSheet[] {
    return [listSheet(list, columns, ctx), infoSheet(list, meta)];
}

function listSheet(list: MemberList, columns: OutputColumn[], ctx: CellContext): ExportSheet {
    const header = columns.map((column) => ({
        value: column.header,
        type: String,
        fontWeight: 'bold' as const,
        backgroundColor: HEADER_FILL,
        wrap: true,
        alignVertical: 'bottom' as const,
    }));
    const data: ExportSheet['data'] = [header];
    for (const row of list.rows) {
        data.push(
            columns.map((column) => {
                const cell = toExcel(column.cell(row.member, ctx));
                return column.key === COLUMN_ID.family && row.familySize > 1
                    ? { ...cell, backgroundColor: FAMILY_FILL }
                    : cell;
            }),
        );
    }
    return {
        sheet: SHEET_LIST,
        data,
        columns: columns.map((column) => ({ width: column.width })),
        stickyRowsCount: 1,
    };
}

/** One cell in `write-excel-file`'s terms. Empty cells stay empty, not "". */
export function toExcel(cell: Cell): CellObject {
    if (cell === null) return { value: undefined, type: String };
    switch (cell.kind) {
        case 'text':
            return { value: cell.value, type: String };
        case 'number':
            return { value: cell.value, type: Number };
        case 'date':
            return { value: isoToDate(cell.value), type: Date, format: DATE_FORMAT };
        case 'link':
            // A formula rather than a plain hyperlink, so the cell shows the id
            // and sorts and filters as one.
            return {
                value: `HYPERLINK("${cell.href.replace(/"/g, '""')}",${cell.value})`,
                type: 'Formula' as const,
                textColor: LINK_COLOR,
                textDecoration: { underline: true as const },
            };
    }
}

/** Midnight UTC, which is the calendar day Excel shows whatever the time zone. */
function isoToDate(iso: string): Date {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
}

function infoSheet(list: MemberList, meta: ExportMeta): ExportSheet {
    const row = (label: string, value: string | number) => [
        { value: label, type: String, fontWeight: 'bold' as const },
        typeof value === 'number' ? { value, type: Number } : { value, type: String, wrap: true },
    ];
    return {
        sheet: SHEET_INFO,
        columns: [{ width: 28 }, { width: 80 }],
        data: [
            row('Gruppe', meta.group.name),
            row('Link zur Gruppe', meta.group.frontendUrl),
            row('Stand der Daten', formatDateTime(meta.loadedAt)),
            row('Personen', list.rows.length),
            row('Familien', list.familyCount),
            row('davon mit mehreren Personen', list.multiFamilyCount),
            row(
                'Nicht auf der Liste',
                meta.excludedStatuses.length
                    ? meta.excludedStatuses.join('; ')
                    : 'Alle Mitglieder der Gruppe, die du sehen darfst.',
            ),
            ...meta.notes.map((note, i) => row(i === 0 ? 'Hinweise' : '', note)),
            row(
                'Familien-ID',
                'Personen mit derselben Familien-ID wohnen zusammen. Erkannt aus den in ' +
                    'ChurchTools hinterlegten Beziehungen (Eltern/Kind, Geschwister, Ehepaar) ' +
                    'und aus gleicher Adresse mit gleichem Nachnamen. Personen an ' +
                    'verschiedenen Adressen sind nie eine Familie. Gelb markiert: Familien ' +
                    'mit mehr als einer Person auf dieser Liste.',
            ),
            row('Erstellt mit', `Teilnehmerliste ${meta.version} (${meta.commit})`),
        ],
    };
}

function formatDateTime(date: Date): string {
    return date.toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * `Teilnehmerliste – Sommercamp 2026 – 2026-10-15.xlsx`: the group, so two
 * downloads are told apart, and the day, so two days are.
 */
export function exportFileName(groupName: string, date: Date): string {
    const safe = groupName
        .replace(/[\\/:*?"<>|]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    // By code point, so an emoji at the cut is not split in half.
    const short = Array.from(safe).slice(0, 80).join('').trim();
    const day = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
    ].join('-');
    return `Teilnehmerliste – ${short || 'Gruppe'} – ${day}.xlsx`;
}
