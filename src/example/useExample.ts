import { ref } from 'vue';
import { ChurchToolsApiError } from '@/shared/api';
import type { Person } from '@/shared/types';
import { whoami } from './example.api';

type State =
    | { phase: 'idle' }
    | { phase: 'loading' }
    | { phase: 'ready'; person: Person }
    | { phase: 'error'; error: ChurchToolsApiError };

/**
 * Composable backing the Example component. Owns the lifecycle of the
 * /whoami call and exposes a discriminated `state` so the template can
 * branch declaratively without prop-drilling boolean flags.
 */
export function useExample() {
    const state = ref<State>({ phase: 'idle' });

    async function load() {
        state.value = { phase: 'loading' };
        try {
            const person = await whoami();
            state.value = { phase: 'ready', person };
        } catch (e) {
            const error =
                e instanceof ChurchToolsApiError
                    ? e
                    : new ChurchToolsApiError('/whoami', 0, String(e));
            state.value = { phase: 'error', error };
        }
    }

    return { state, load };
}
