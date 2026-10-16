/**
 * Custom-module lookup. The module is the top-level
 * container in ChurchTools' KV-Store; categories and values live underneath it.
 */
import { apiGet } from '@/shared/api';
import { EXTENSION_KEY } from '@/shared/constants';
import type { CustomModule } from '@/shared/types';

/**
 * Returns the custom module whose `shorty` is the extension key.
 * Throws if no matching module exists. The deploy creates it (see
 * `.github/actions/upload-to-churchtools`), so the extension never has to.
 */
export async function getModule(): Promise<CustomModule> {
    const all = await apiGet<CustomModule[]>('/custommodules');
    const module = all.find((m) => m.shorty === EXTENSION_KEY);
    if (!module) {
        throw new Error(`Module for extension key "${EXTENSION_KEY}" not found.`);
    }
    return module;
}
