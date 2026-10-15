/**
 * Raw ChurchTools responses → the list's own shapes. Pure, so every quirk of
 * the API that the list depends on is pinned down by a test.
 */
import { COPY } from '@/shared/copy';
import type { FieldDef, FieldKind, FieldOption, GroupInfo, Member } from './types';

type Raw = Record<string, unknown>;

const asRecord = (value: unknown): Raw =>
    typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Raw) : {};
const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const asNumber = (value: unknown): number | null =>
    typeof value === 'number' && Number.isFinite(value) ? value : null;

/** A trimmed string, or null for anything blank or not a string. */
export function text(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
}

export function toGroupInfo(raw: unknown, origin: string): GroupInfo | null {
    const g = asRecord(raw);
    const id = asNumber(g.id);
    if (id === null) return null;
    const info = asRecord(g.information);
    return {
        id,
        name: text(g.name) ?? `#${id}`,
        groupTypeId: asNumber(info.groupTypeId),
        groupStatusId: asNumber(info.groupStatusId),
        frontendUrl: `${origin}/groups/${id}`,
    };
}

/** Role names by `groupTypeRoleId`, from the group's own `roles`. */
export function roleNamesOf(rawGroup: unknown): Map<number, string> {
    const names = new Map<number, string>();
    for (const r of asArray(asRecord(rawGroup).roles)) {
        const role = asRecord(r);
        const id = asNumber(role.groupTypeRoleId);
        const name = text(role.nameTranslated) ?? text(role.name);
        if (id !== null && name) names.set(id, name);
    }
    return names;
}

const KINDS: Record<string, FieldKind> = {
    text: 'text',
    textarea: 'text',
    select: 'select',
    radioselect: 'select',
    multiselect: 'multiselect',
    checkbox: 'checkbox',
    date: 'date',
    datetime: 'date',
    number: 'number',
};

/**
 * The chosen group's own member fields. `/groups/{id}/memberfields` also
 * lists the person fields the group's sign-up form asks for (`type: 'person'`);
 * those are person data and come from `/persons`, so they are left out here.
 */
export function toGroupFieldDefs(raw: unknown): FieldDef[] {
    const defs: FieldDef[] = [];
    for (const entry of asArray(raw)) {
        const e = asRecord(entry);
        if (e.type !== 'group') continue;
        const field = asRecord(e.field);
        const id = asNumber(field.id);
        const label = text(field.name);
        if (id === null || !label) continue;
        defs.push({
            source: 'group',
            key: String(id),
            label,
            kind: KINDS[String(field.fieldTypeCode)] ?? 'text',
            options: optionsOf(field.options, (o) => text(o.name)),
        });
    }
    return defs;
}

/**
 * Person fields shown elsewhere in the list, or not person data a list is for:
 * the base columns already carry these.
 */
const BASE_PERSON_KEYS = new Set(['firstName', 'lastName', 'street', 'zip', 'city', 'email']);

/** The categories of `/fields` that hold person data — not group or privacy bookkeeping. */
const PERSON_CATEGORIES = new Set(['f_address', 'f_church', 'f_category', 'f_dep']);

/**
 * Masterdata lists that translate a built-in select field's options. Their
 * option names in `/fields` are translation keys (`sex.male`), the masterdata
 * carries the translation. These are ChurchTools' own field keys, the same at
 * every installation.
 */
const MASTERDATA_LIST: Record<string, string> = {
    sexId: 'sexes',
    statusId: 'statuses',
    campusId: 'campuses',
    departmentIds: 'departments',
};

/**
 * The installation's person fields (`/fields`) that can become an optional
 * column: active, visible in ChurchTools' own UI, person data, and not
 * already a base column.
 */
export function toPersonFieldDefs(rawFields: unknown, rawMasterdata: unknown): FieldDef[] {
    const masterdata = asRecord(rawMasterdata);
    const defs: FieldDef[] = [];
    for (const entry of asArray(rawFields)) {
        const f = asRecord(entry);
        const key = text(f.key);
        const label = text(f.nameTranslated) ?? text(f.name);
        if (!key || !label || BASE_PERSON_KEYS.has(key)) continue;
        if (!PERSON_CATEGORIES.has(String(f.fieldCategoryCode))) continue;
        if (f.isActive === false || f.isActive === 0 || f.hideInFrontend === true) continue;

        const translations = translationsOf(masterdata[MASTERDATA_LIST[key] ?? '']);
        defs.push({
            source: 'person',
            key,
            label,
            kind: KINDS[String(f.fieldTypeCode)] ?? 'text',
            options: optionsOf(f.options, (o) => {
                const id = String(o.id);
                const name = text(o.nameTranslated) ?? text(o.name);
                return translations.get(id) ?? (name ? (COPY.builtInLabel[name] ?? name) : null);
            }),
        });
    }
    return defs;
}

function translationsOf(list: unknown): Map<string, string> {
    const map = new Map<string, string>();
    for (const entry of asArray(list)) {
        const e = asRecord(entry);
        const label = text(e.nameTranslated) ?? text(e.name);
        if (e.id !== undefined && e.id !== null && label) map.set(String(e.id), label);
    }
    return map;
}

function optionsOf(raw: unknown, labelOf: (option: Raw) => string | null): FieldOption[] {
    const options: FieldOption[] = [];
    for (const entry of asArray(raw)) {
        const o = asRecord(entry);
        if (o.id === undefined || o.id === null) continue;
        const label = labelOf(o);
        if (label) options.push({ id: String(o.id), label });
    }
    return options;
}

/** The person's addresses, the default one first. */
export function emailsOf(person: Raw): string[] {
    const listed = asArray(person.emails)
        .map(asRecord)
        .filter((e) => text(e.email))
        .sort((a, b) => Number(b.isDefault === true) - Number(a.isDefault === true))
        .map((e) => text(e.email) as string);
    const primary = text(person.email);
    if (primary && !listed.includes(primary)) listed.unshift(primary);
    return [...new Set(listed)];
}

/**
 * One membership, joined with its person.
 *
 * Name and profile link come from the membership itself, so a member stays on
 * the list — with name and link — when `/persons` withheld their details from
 * this viewer. Their address is then unknown, which the preview says.
 */
export function toMember(
    rawMember: unknown,
    rawPerson: unknown,
    roleNames: ReadonlyMap<number, string>,
    origin: string,
): Member | null {
    const m = asRecord(rawMember);
    const ref = asRecord(m.person);
    const attrs = asRecord(ref.domainAttributes);
    const personId = asNumber(m.personId) ?? (Number(ref.domainIdentifier) || null);
    if (personId === null) return null;

    const person = asRecord(rawPerson);
    const personLoaded = asNumber(person.id) === personId;
    const p = personLoaded ? person : {};
    const roleId = asNumber(m.groupTypeRoleId);

    const groupFields: Record<string, unknown> = {};
    for (const entry of asArray(m.fields)) {
        const f = asRecord(entry);
        const id = asNumber(f.id);
        if (id !== null) groupFields[String(id)] = f.value;
    }

    return {
        personId,
        firstName: text(p.firstName) ?? text(attrs.firstName) ?? '',
        lastName: text(p.lastName) ?? text(attrs.lastName) ?? '',
        street: text(p.street),
        zip: text(p.zip),
        city: text(p.city),
        emails: emailsOf(p),
        frontendUrl: text(ref.frontendUrl) ?? `${origin}/persons/${personId}/`,
        roleName: (roleId !== null ? roleNames.get(roleId) : undefined) ?? '',
        status: text(m.groupMemberStatus) ?? '',
        memberSince: isoDate(m.memberStartDate),
        comment: text(m.comment),
        groupFields,
        person: p,
        personLoaded,
    };
}

/** The `yyyy-mm-dd` part of a date or datetime string, or null. */
export function isoDate(value: unknown): string | null {
    const s = text(value);
    const match = s ? /^(\d{4}-\d{2}-\d{2})/.exec(s) : null;
    return match ? match[1] : null;
}
