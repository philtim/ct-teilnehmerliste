import { apiGet, apiPost } from '@/shared/api';
import type { CustomModuleDataCategory, CustomModuleDataCategoryCreate } from '@/shared/types';
import { resolveModuleId } from './module';
import { safeParseJSON } from './util';

/**
 * Each category's `data` field is an opaque JSON string. Generic `T`
 * lets the caller declare the shape it expects; values are parsed and
 * spread into the returned object so consumers see flat properties.
 */
export async function getCustomDataCategories<T extends object>(
    moduleId?: number,
): Promise<(T & Omit<CustomModuleDataCategory, 'data'>)[]> {
    moduleId = await resolveModuleId(moduleId);
    const categories = await apiGet<CustomModuleDataCategory[]>(
        `/custommodules/${moduleId}/customdatacategories`,
    );
    return categories.map((category) => {
        const { data, ...rest } = category;
        const parsed: T = safeParseJSON(data, {} as T);
        return { ...rest, ...parsed };
    });
}

export async function getCustomDataCategory<T extends object>(
    shorty: string,
    moduleId?: number,
): Promise<(T & Omit<CustomModuleDataCategory, 'data'>) | undefined> {
    const categories = await getCustomDataCategories<T>(moduleId);
    return categories.find((category) => category.shorty === shorty);
}

export async function createCustomDataCategory(
    payload: CustomModuleDataCategoryCreate,
    moduleId?: number,
): Promise<CustomModuleDataCategory> {
    moduleId = await resolveModuleId(moduleId);
    return await apiPost<CustomModuleDataCategory>(
        `/custommodules/${moduleId}/customdatacategories`,
        payload,
    );
}
