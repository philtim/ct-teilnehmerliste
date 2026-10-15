import { createApp } from 'vue';
import { initApi } from '@/shared/api';
import App from './App.vue';

if (import.meta.env.MODE === 'development') {
    await import('./shared/reset.css');
}

declare const window: Window &
    typeof globalThis & {
        settings?: { base_url?: string };
    };

// In dev we go through the Vite proxy on '' (same-origin /api/...).
// In production the host injects window.settings.base_url; we fall back to
// VITE_BASE_URL for the rare case the host doesn't set it.
const baseUrl =
    import.meta.env.MODE === 'development'
        ? ''
        : (window.settings?.base_url ?? import.meta.env.VITE_BASE_URL);
initApi(baseUrl);

// Dev-only auto-login. Production runs inside the host's authenticated session.
if (import.meta.env.MODE === 'development') {
    const username = import.meta.env.VITE_USERNAME;
    const password = import.meta.env.VITE_PASSWORD;
    if (username && password) await devLogin(username, password);
}

/**
 * Two browser states need two logins. Without a session, ChurchTools refuses
 * to hand out a CSRF token (401 on /csrftoken), so only a JSON login works.
 * With a stale session cookie from an earlier run, a JSON login is refused
 * with "CSRF-Token is invalid", and only FormData — for which the client
 * fetches and sends a token — gets through. Try the one, then the other; and
 * mount either way, so a failed login shows the app's own error rather than
 * a blank page.
 */
async function devLogin(user: string, pass: string): Promise<void> {
    const { ct } = await import('@/shared/api');
    try {
        await ct.post('/login', { username: user, password: pass });
        return;
    } catch {
        // Fall through to the CSRF-token login below.
    }
    try {
        const credentials = new FormData();
        credentials.append('username', user);
        credentials.append('password', pass);
        await ct.post('/login', credentials);
    } catch (e) {
        console.error('[teilnehmerliste] dev login failed:', e);
    }
}

createApp(App).mount('#teilnehmerliste-app');
