import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Separate from vite.config.ts on purpose (ADR-009). That config is a
 * function of `mode`, shells out to git for build provenance and sets up the
 * dev API proxy — none of which tests need, and all of which would be risk
 * taken on the production build for no gain.
 *
 * Scope is logic, not rendering: pure functions and composables, with the
 * ChurchTools client mocked where they call it. No component tests, no jsdom.
 */
export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
});
