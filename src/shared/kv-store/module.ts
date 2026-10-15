/**
 * Custom-module lookup and self-bootstrap. The module is the top-level
 * container in ChurchTools' KV-Store; categories and values live underneath it.
 */
import { apiGet, apiPost } from '@/shared/api';
import { EXTENSION_KEY } from '@/shared/constants';
import type { CustomModule, CustomModuleCreate } from '@/shared/types';

/**
 * Returns the custom module whose `shorty` matches the given key.
 * Throws if no matching module exists — call `getOrCreateModule` if
 * you want self-bootstrap behavior on first run.
 */
export async function getModule(extensionKey: string = EXTENSION_KEY): Promise<CustomModule> {
    const all = await apiGet<CustomModule[]>('/custommodules');
    const module = all.find((m) => m.shorty === extensionKey);
    if (!module) {
        throw new Error(`Module for extension key "${extensionKey}" not found.`);
    }
    return module;
}

export async function getOrCreateModule(
    extensionKey: string,
    name: string,
    description: string,
): Promise<CustomModule> {
    try {
        return await getModule(extensionKey);
    } catch {
        return await createModule(extensionKey, name, description);
    }
}

async function createModule(
    extensionKey: string,
    name: string,
    description: string,
): Promise<CustomModule> {
    const payload: CustomModuleCreate = {
        name,
        shorty: extensionKey,
        description,
        sortKey: 100,
    };
    return await apiPost<CustomModule>('/custommodules', payload);
}

/** Convenience for category/value helpers that accept an optional moduleId. */
export async function resolveModuleId(moduleId?: number): Promise<number> {
    if (moduleId !== undefined) return moduleId;
    const module = await getModule();
    return module.id;
}
