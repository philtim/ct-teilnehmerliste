<script setup lang="ts">
import { onMounted } from 'vue';
import { useExample } from './useExample';

const { state, load } = useExample();

onMounted(load);

function fullName(person: { firstName?: string; lastName?: string }): string {
    return [person.firstName, person.lastName].filter(Boolean).join(' ') || '–';
}
</script>

<template>
    <section class="example">
        <h1 class="example__title">CT Extension Template</h1>

        <p v-if="state.phase === 'idle' || state.phase === 'loading'" class="example__text">
            Lade Benutzer …
        </p>

        <p v-else-if="state.phase === 'ready'" class="example__text">
            Hallo, <strong>{{ fullName(state.person) }}</strong
            >!
        </p>

        <p v-else class="example__text example__text--error">
            Fehler beim Laden ({{ state.error.status || 'Netzwerk' }}):
            {{ state.error.message }}
        </p>
    </section>
</template>

<style scoped>
.example {
    padding: 2rem;
    max-width: 36rem;
    margin: 0 auto;
    font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.example__title {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0 0 1rem;
}

.example__text {
    font-size: 1rem;
    line-height: 1.5;
    margin: 0;
}

.example__text--error {
    color: #b91c1c;
}
</style>
