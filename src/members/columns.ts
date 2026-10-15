/**
 * The column catalogue: every column the list can show for a group, and how
 * each one turns a member into a cell. The preview and the workbook both read
 * from here, so what is ticked is exactly what is downloaded.
 */
import { COPY } from '@/shared/copy';
import type { FieldDef, Member } from './types';

/** One cell, typed so the workbook can write numbers and dates as such. */
export type Cell =
    | { kind: 'text'; value: string }
    | { kind: 'number'; value: number }
    /** ISO `yyyy-mm-dd`. */
    | { kind: 'date'; value: string }
    /** The person id, linking to their profile. */
    | { kind: 'link'; value: number; href: string }
    | null;

export type Section = 'person' | 'personExtra' | 'membership' | 'group' | 'family';

/** What a cell needs beyond the member itself. */
export type CellContext = { familyKeyOf: (personId: number) => string };

/** A column as the picker lists it. */
export type CatalogColumn = {
    /** Stable across loads — what the remembered selection stores. */
    id: string;
    label: string;
    section: Section;
    defaultOn: boolean;
    /** Excel width in characters. */
    width: number;
    /** A field-backed column: its definition, for type-aware rendering. */
    field?: FieldDef;
};

/** A column as the table and the workbook render it. */
export type OutputColumn = {
    /** Unique within one output, also for the expanded e-mail columns. */
    key: string;
    header: string;
    width: number;
    cell: (member: Member, ctx: CellContext) => Cell;
};

export const COLUMN_ID = {
    id: 'base:id',
    lastName: 'base:lastName',
    firstName: 'base:firstName',
    street: 'base:street',
    zip: 'base:zip',
    city: 'base:city',
    emails: 'base:emails',
    role: 'member:role',
    status: 'member:status',
    since: 'member:since',
    comment: 'member:comment',
    family: 'family:key',
} as const;

/**
 * The full catalogue for one group, in output order: person, further person
 * fields, membership, the group's own fields, family. That is the order of
 * the list the office used before this extension existed, so it is the order
 * people look for things in.
 */
export function buildCatalog(groupFields: FieldDef[], personFields: FieldDef[]): CatalogColumn[] {
    const base = (
        id: string,
        label: string,
        section: Section,
        width: number,
        defaultOn = true,
    ): CatalogColumn => ({ id, label, section, width, defaultOn });

    return [
        base(COLUMN_ID.id, COPY.colId, 'person', 8),
        base(COLUMN_ID.lastName, COPY.colLastName, 'person', 16),
        base(COLUMN_ID.firstName, COPY.colFirstName, 'person', 14),
        base(COLUMN_ID.street, COPY.colStreet, 'person', 24),
        base(COLUMN_ID.zip, COPY.colZip, 'person', 8),
        base(COLUMN_ID.city, COPY.colCity, 'person', 16),
        base(COLUMN_ID.emails, COPY.colEmails, 'person', 30),
        ...personFields.map((field) => ({
            id: `person:${field.key}`,
            label: field.label,
            section: 'personExtra' as const,
            defaultOn: false,
            width: widthFor(field),
            field,
        })),
        base(COLUMN_ID.role, COPY.colRole, 'membership', 14),
        base(COLUMN_ID.status, COPY.colStatus, 'membership', 12),
        base(COLUMN_ID.since, COPY.colSince, 'membership', 12),
        base(COLUMN_ID.comment, COPY.colComment, 'membership', 24, false),
        ...groupFields.map((field) => ({
            id: `group:${field.key}`,
            label: field.label,
            section: 'group' as const,
            defaultOn: true,
            width: widthFor(field),
            field,
        })),
        base(COLUMN_ID.family, COPY.colFamily, 'family', 11),
    ];
}

function widthFor(field: FieldDef): number {
    if (field.kind === 'date') return 12;
    if (field.kind === 'checkbox' || field.kind === 'number')
        return Math.max(8, field.label.length);
    return Math.min(30, Math.max(12, field.label.length + 2));
}

/** The remembered choice for one group. `known` lets a new field get its default. */
export type StoredSelection = { selected: string[]; known: string[] };

/**
 * Which columns are on: the remembered choice where there is one, the
 * default for every column it does not know — a field added to the group
 * since, say.
 */
export function selectionFor(
    catalog: CatalogColumn[],
    stored: StoredSelection | null,
): Set<string> {
    const selected = new Set(stored?.selected ?? []);
    const known = new Set(stored?.known ?? []);
    return new Set(
        catalog
            .filter((c) => (known.has(c.id) ? selected.has(c.id) : c.defaultOn))
            .map((c) => c.id),
    );
}

export function toStored(catalog: CatalogColumn[], selected: ReadonlySet<string>): StoredSelection {
    return {
        selected: catalog.filter((c) => selected.has(c.id)).map((c) => c.id),
        known: catalog.map((c) => c.id),
    };
}

/** At most this many e-mail columns, however many addresses someone has. */
const MAX_EMAIL_COLUMNS = 3;

/**
 * The ticked columns, expanded for output. The e-mail column becomes as many
 * columns as the listed members need (one at least, three at most), and a
 * field column whose every value is a plain number is written as numbers, so
 * Excel can add them up.
 */
export function resolveColumns(
    catalog: CatalogColumn[],
    selected: ReadonlySet<string>,
    members: Member[],
): OutputColumn[] {
    const out: OutputColumn[] = [];
    for (const column of catalog) {
        if (!selected.has(column.id)) continue;
        if (column.id === COLUMN_ID.emails) {
            const count = Math.min(
                MAX_EMAIL_COLUMNS,
                Math.max(1, ...members.map((m) => m.emails.length)),
            );
            for (let i = 0; i < count; i++) {
                out.push({
                    key: `${column.id}:${i}`,
                    header: COPY.colEmailN(i + 1, count),
                    width: column.width,
                    cell: (m) => textCell(m.emails[i]),
                });
            }
            continue;
        }
        const cell = cellFor(column);
        const numeric = column.field && isNumericColumn(members, cell);
        out.push({
            key: column.id,
            header: column.label,
            width: column.width,
            cell: numeric ? (m, ctx) => asNumberCell(cell(m, ctx)) : cell,
        });
    }
    return out;
}

function cellFor(column: CatalogColumn): (m: Member, ctx: CellContext) => Cell {
    switch (column.id) {
        case COLUMN_ID.id:
            return (m) => ({ kind: 'link', value: m.personId, href: m.frontendUrl });
        case COLUMN_ID.lastName:
            return (m) => textCell(m.lastName);
        case COLUMN_ID.firstName:
            return (m) => textCell(m.firstName);
        case COLUMN_ID.street:
            return (m) => textCell(m.street);
        case COLUMN_ID.zip:
            return (m) => textCell(m.zip);
        case COLUMN_ID.city:
            return (m) => textCell(m.city);
        case COLUMN_ID.role:
            return (m) => textCell(m.roleName);
        case COLUMN_ID.status:
            return (m) => textCell(COPY.memberStatus(m.status));
        case COLUMN_ID.since:
            return (m) => (m.memberSince ? { kind: 'date', value: m.memberSince } : null);
        case COLUMN_ID.comment:
            return (m) => textCell(m.comment);
        case COLUMN_ID.family:
            return (m, ctx) => textCell(ctx.familyKeyOf(m.personId));
    }
    const field = column.field;
    if (!field) return () => null;
    return field.source === 'group'
        ? (m) => fieldCell(field, m.groupFields[field.key])
        : (m) => fieldCell(field, m.person[field.key]);
}

/** A field value as a cell: option ids become their labels, ticks become ja/nein. */
export function fieldCell(field: FieldDef, raw: unknown): Cell {
    if (raw === null || raw === undefined || raw === '') return null;
    const label = (id: unknown) =>
        field.options.find((o) => o.id === String(id))?.label ?? String(id);

    switch (field.kind) {
        case 'select':
            return textCell(label(raw));
        case 'multiselect': {
            const values = Array.isArray(raw) ? raw : [raw];
            return textCell(values.map(label).join(', '));
        }
        case 'checkbox':
            return textCell(isTicked(raw) ? COPY.yes : COPY.no);
        case 'date': {
            const iso = typeof raw === 'string' ? /^(\d{4}-\d{2}-\d{2})/.exec(raw)?.[1] : undefined;
            return iso ? { kind: 'date', value: iso } : textCell(String(raw));
        }
        case 'number': {
            const n = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.'));
            return Number.isFinite(n) ? { kind: 'number', value: n } : textCell(String(raw));
        }
        default:
            return textCell(typeof raw === 'string' ? raw : JSON.stringify(raw));
    }
}

function isTicked(raw: unknown): boolean {
    return raw === true || raw === 1 || raw === '1' || raw === 'true';
}

function textCell(value: string | null | undefined): Cell {
    const trimmed = value?.trim();
    return trimmed ? { kind: 'text', value: trimmed } : null;
}

/**
 * A plain decimal: no leading zero (a phone number, a postcode), no more than
 * nine digits before the separator (an account number), at most one comma or
 * point.
 */
const PLAIN_NUMBER = /^-?(0|[1-9]\d{0,8})([.,]\d+)?$/;

function isNumericColumn(members: Member[], cell: (m: Member, ctx: CellContext) => Cell): boolean {
    const ctx: CellContext = { familyKeyOf: () => '' };
    let seen = false;
    for (const m of members) {
        const c = cell(m, ctx);
        if (c === null || c.kind === 'number') {
            seen ||= c !== null;
            continue;
        }
        if (c.kind !== 'text' || !PLAIN_NUMBER.test(c.value)) return false;
        seen = true;
    }
    return seen;
}

function asNumberCell(c: Cell): Cell {
    if (c === null || c.kind !== 'text') return c;
    return { kind: 'number', value: Number(c.value.replace(',', '.')) };
}

/** A cell as the preview shows it — German number and date formats. */
export function displayOf(c: Cell): string {
    if (c === null) return '';
    switch (c.kind) {
        case 'text':
            return c.value;
        case 'number':
            return c.value.toLocaleString('de-DE');
        case 'date': {
            const [y, m, d] = c.value.split('-');
            return `${d}.${m}.${y}`;
        }
        case 'link':
            return String(c.value);
    }
}
