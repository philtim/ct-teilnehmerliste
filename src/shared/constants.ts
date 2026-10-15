/**
 * Project-wide constants. Keep this file small — add feature-specific
 * constants alongside the feature, not here.
 */

/** Set at build time from `package.json#churchtools.extensionKey` via Vite. */
export const EXTENSION_KEY = import.meta.env.VITE_KEY;

/** Hard timeout per outbound API call. Used by `withTimeout` in shared/api. */
export const API_TIMEOUT_MS = 30_000;
