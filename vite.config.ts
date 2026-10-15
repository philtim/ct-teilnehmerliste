import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

// Build-time provenance: surfaced in the app via `__APP_VERSION__` /
// `__APP_COMMIT__` so deployments are identifiable. Falls back gracefully
// when git/package.json aren't available (e.g. some sandbox environments).
function readPkg(): { version?: string; churchtools?: { extensionKey?: string } } {
    try {
        return JSON.parse(readFileSync('./package.json', 'utf8'));
    } catch {
        return {};
    }
}

function readCommit(): string {
    try {
        return execSync('git rev-parse --short=7 HEAD', {
            stdio: ['ignore', 'pipe', 'ignore'],
        })
            .toString()
            .trim();
    } catch {
        return 'unknown';
    }
}

export default ({ mode }: { mode: string }) => {
    const env = loadEnv(mode, process.cwd());
    process.env = { ...process.env, ...env };

    const pkg = readPkg();
    // Prefer build-env (CI sets VITE_KEY explicitly), then package.json's
    // churchtools.extensionKey as the local default. Keeps `npm run dev`
    // working out of the box without an .env file.
    const extensionKey = env.VITE_KEY ?? pkg.churchtools?.extensionKey ?? 'teilnehmerliste';
    const baseUrl = env.VITE_BASE_URL;

    return defineConfig({
        base: `/ccm/${extensionKey}/`,
        plugins: [vue()],
        define: {
            __APP_VERSION__: JSON.stringify(pkg.version ?? 'unknown'),
            __APP_COMMIT__: JSON.stringify(readCommit()),
        },
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url)),
            },
        },
        // Proxy /api → the configured ChurchTools instance so dev-mode requests
        // look first-party (avoids CORS + works in Safari without extra setup).
        // Production builds talk to the host directly.
        server: baseUrl
            ? {
                  proxy: {
                      '/api': {
                          target: baseUrl,
                          changeOrigin: true,
                          secure: true,
                      },
                  },
              }
            : undefined,
    });
};
