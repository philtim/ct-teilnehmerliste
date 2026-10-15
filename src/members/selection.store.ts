/**
 * The remembered column choice, one entry per group, in the extension's own
 * KV-Store. Shared, on purpose: whoever downloads a group's list next finds
 * the columns the last person chose for it.
 *
 * Best effort throughout. Reading or writing the store needs rights on the
 * extension's module that a viewer of the list may not have; without them
 * the choice simply lasts until the page is closed. Neither a failed read nor
 * a failed write may keep anyone from the preview or the download.
 */
import {
    createCustomDataCategory,
    createCustomDataValue,
    getCustomDataCategory,
    getCustomDataValues,
    getModule,
    updateCustomDataValue,
} from '@/shared/kv-store';
import type { StoredSelection } from './columns';

const CATEGORY = 'columns';

type Entry = StoredSelection & { groupId: number };
type StoredEntry = Entry & { id: number };

/** The category id, looked up once per page; null when there is none yet. */
let categoryRequest: Promise<{ moduleId: number; categoryId: number | null }> | null = null;

function category() {
    categoryRequest ??= (async () => {
        const module = await getModule();
        const found = await getCustomDataCategory<object>(CATEGORY, module.id);
        return { moduleId: module.id, categoryId: found?.id ?? null };
    })().catch((e: unknown) => {
        categoryRequest = null;
        throw e;
    });
    return categoryRequest;
}

async function entryFor(groupId: number): Promise<StoredEntry | null> {
    const { moduleId, categoryId } = await category();
    if (categoryId === null) return null;
    const values = await getCustomDataValues<Partial<Entry>>(categoryId, moduleId);
    const found = values.find((v) => v.groupId === groupId);
    return found ? parseEntry(found) : null;
}

/** Only a well-formed entry is trusted; anything else counts as none. */
export function parseEntry(value: unknown): StoredEntry | null {
    if (typeof value !== 'object' || value === null) return null;
    const v = value as Record<string, unknown>;
    const strings = (x: unknown) =>
        Array.isArray(x) && x.every((s) => typeof s === 'string') ? (x as string[]) : null;
    const selected = strings(v.selected);
    const known = strings(v.known);
    if (typeof v.id !== 'number' || typeof v.groupId !== 'number' || !selected || !known) {
        return null;
    }
    return { id: v.id, groupId: v.groupId, selected, known };
}

export async function loadSelection(groupId: number): Promise<StoredSelection | null> {
    try {
        const entry = await entryFor(groupId);
        return entry ? { selected: entry.selected, known: entry.known } : null;
    } catch {
        return null;
    }
}

/** Resolves true when the choice was stored, false when it could not be. */
export async function saveSelection(groupId: number, selection: StoredSelection): Promise<boolean> {
    try {
        const found = await category();
        const moduleId = found.moduleId;
        let categoryId = found.categoryId;
        if (categoryId === null) {
            const created = await createCustomDataCategory(
                {
                    customModuleId: moduleId,
                    name: 'Spaltenauswahl',
                    shorty: CATEGORY,
                    description: 'Zuletzt gewählte Spalten je Gruppe',
                },
                moduleId,
            );
            categoryId = created.id;
            categoryRequest = Promise.resolve({ moduleId, categoryId });
        }
        const value = JSON.stringify({ groupId, ...selection } satisfies Entry);
        const existing = await entryFor(groupId);
        if (existing) {
            await updateCustomDataValue(
                categoryId,
                existing.id,
                { dataCategoryId: categoryId, value },
                moduleId,
            );
        } else {
            await createCustomDataValue({ dataCategoryId: categoryId, value }, moduleId);
        }
        return true;
    } catch {
        return false;
    }
}
