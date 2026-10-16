import { apiGet, apiPost } from '@/shared/api';
import type { CustomModuleDataCategory, CustomModuleDataCategoryCreate } from '@/shared/types';
import { safeParseJSON } from './util';

/**
 * Each category's `data` field is an opaque JSON string. Generic `T`
 * lets the caller declare the shape it expects; values are parsed and
 * spread into the returned object so consumers see flat properties.
 */
export async function getCustomDataCategory<T extends object>(
    shorty: string,
    moduleId: number,
): Promise<(T & Omit<CustomModuleDataCategory, 'data'>) | undefined> {
    const categories = await apiGet<CustomModuleDataCategory[]>(
        `/custommodules/${moduleId}/customdatacategories`,
    );
    const category = categories.find((c) => c.shorty === shorty);
    if (!category) return undefined;
    const { data, ...rest } = category;
    return { ...rest, ...safeParseJSON(data, {} as T) };
}

export async function createCustomDataCategory(
    payload: CustomModuleDataCategoryCreate,
    moduleId: number,
): Promise<CustomModuleDataCategory> {
    return await apiPost<CustomModuleDataCategory>(
        `/custommodules/${moduleId}/customdatacategories`,
        payload,
    );
}
