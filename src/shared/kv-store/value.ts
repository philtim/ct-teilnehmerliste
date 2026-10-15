import { apiGet, apiPost, apiPut, apiDelete } from '@/shared/api';
import type { CustomModuleDataValue, CustomModuleDataValueCreate } from '@/shared/types';
import { resolveModuleId } from './module';
import { safeParseJSON } from './util';

/**
 * Like `getCustomDataCategories`, each value's `value` field is JSON.
 * The generic `T` declares the parsed shape; the parsed contents are
 * spread into the returned object so consumers see flat properties.
 */
export async function getCustomDataValues<T extends object>(
    dataCategoryId: number,
    moduleId?: number,
): Promise<(T & Omit<CustomModuleDataValue, 'value'>)[]> {
    moduleId = await resolveModuleId(moduleId);
    const values = await apiGet<(Omit<CustomModuleDataValue, 'value'> & { value: string })[]>(
        `/custommodules/${moduleId}/customdatacategories/${dataCategoryId}/customdatavalues`,
    );
    return values.map((val) => {
        const { value, ...rest } = val;
        if (value == null) {
            throw new Error(`Custom data value ${val.id} has null or undefined 'value' field.`);
        }
        const parsed = safeParseJSON(value, {} as T);
        return { ...rest, ...parsed };
    });
}

export async function createCustomDataValue(
    payload: CustomModuleDataValueCreate,
    moduleId?: number,
): Promise<CustomModuleDataValue> {
    moduleId = await resolveModuleId(moduleId);
    return await apiPost<CustomModuleDataValue>(
        `/custommodules/${moduleId}/customdatacategories/${payload.dataCategoryId}/customdatavalues`,
        payload,
    );
}

export async function updateCustomDataValue(
    dataCategoryId: number,
    valueId: number,
    payload: Partial<CustomModuleDataValue>,
    moduleId?: number,
): Promise<void> {
    moduleId = await resolveModuleId(moduleId);
    await apiPut<CustomModuleDataValue>(
        `/custommodules/${moduleId}/customdatacategories/${dataCategoryId}/customdatavalues/${valueId}`,
        payload,
    );
}

export async function deleteCustomDataValue(
    dataCategoryId: number,
    valueId: number,
    moduleId?: number,
): Promise<void> {
    moduleId = await resolveModuleId(moduleId);
    await apiDelete<void>(
        `/custommodules/${moduleId}/customdatacategories/${dataCategoryId}/customdatavalues/${valueId}`,
    );
}
