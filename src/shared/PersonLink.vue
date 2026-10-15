<script setup lang="ts">
import { COPY } from '@/shared/copy';

/**
 * A person's name as a link to their ChurchTools profile, in a new tab — so
 * looking someone up never loses the list being prepared.
 */
defineProps<{ name: string; href: string }>();
</script>

<template>
    <a
        class="person-link"
        :href="href"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="COPY.openPersonInNewTab(name)"
        >{{ name }}<span aria-hidden="true" class="person-link__icon"> ↗</span></a
    >
</template>

<style scoped>
.person-link {
    color: var(--tl-link);
    text-decoration: none;
}
.person-link:hover {
    text-decoration: underline;
}
.person-link:focus-visible {
    outline: 2px solid var(--tl-accent);
    outline-offset: 1px;
    border-radius: 2px;
}
.person-link__icon {
    font-size: 0.85em;
    color: var(--tl-text-secondary);
}
</style>
