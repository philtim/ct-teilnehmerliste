/**
 * Custom-module lookup. The module is the top-level
 * container in ChurchTools' KV-Store; categories and values live underneath it.
 */
import { apiGet } from '@/shared/api';
import { EXTENSION_KEY } from '@/shared/constants';
import type { CustomModule } from '@/shared/types';

/**
 * Returns the custom module whose `shorty` matches the given key.
 * Throws if no matching module exists. The deploy creates it (see
 * `.github/actions/upload-to-churchtools`), so the extension never has to.
 */
export async function getModule(extensionKey: string = EXTENSION_KEY): Promise<CustomModule> {
    const all = await apiGet<CustomModule[]>('/custommodules');
    const module = all.find((m) => m.shorty === extensionKey);
    if (!module) {
        throw new Error(`Module for extension key "${extensionKey}" not found.`);
    }
    return module;
}

/** Convenience for category/value helpers that accept an optional moduleId. */
export async function resolveModuleId(moduleId?: number): Promise<number> {
    if (moduleId !== undefined) return moduleId;
    const module = await getModule();
    return module.id;
}
