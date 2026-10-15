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
    if (username && password) {
        const { ct } = await import('@/shared/api');
        await ct.post('/login', { username, password });
    }
}

createApp(App).mount('#ct-template-app');
