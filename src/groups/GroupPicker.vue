<script setup lang="ts">
import { computed, onMounted, ref, useId, watch } from 'vue';
import { COPY } from '@/shared/copy';
import {
    findGroup,
    loadGroupVocabulary,
    parseGroupRef,
    searchGroups,
    SEARCH_LIMIT,
} from './groups.api';
import type { Choice } from './groups.api';
import type { GroupInfo } from '@/members/types';

/**
 * Find a group by name, by id, or by pasting its link; narrow by group type.
 * Lists only what ChurchTools returns to this viewer.
 */
const emit = defineEmits<{ select: [group: GroupInfo] }>();

const query = ref('');
const typeId = ref<number | null>(null);
const types = ref<Choice[]>([]);
const statuses = ref<Choice[]>([]);

type SearchState =
    | { phase: 'idle' }
    | { phase: 'searching' }
    | { phase: 'error' }
    | { phase: 'done'; groups: GroupInfo[]; total: number };
const result = ref<SearchState>({ phase: 'idle' });

const ids = { query: useId(), type: useId(), results: useId() };

onMounted(async () => {
    const vocabulary = await loadGroupVocabulary();
    types.value = vocabulary.types;
    statuses.value = vocabulary.statuses;
});

const typeName = (id: number | null) => types.value.find((t) => t.id === id)?.label ?? '';
const statusName = (id: number | null) => statuses.value.find((s) => s.id === id)?.label ?? '';

let token = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

watch([query, typeId], () => {
    clearTimeout(timer);
    timer = setTimeout(run, 300);
});

async function run() {
    const text = query.value.trim();
    const mine = ++token;
    if (!text && typeId.value === null) {
        result.value = { phase: 'idle' };
        return;
    }
    result.value = { phase: 'searching' };
    try {
        // An id or a pasted link finds that one group. A bare number nothing
        // answers to is searched as a name after all ("2026"); a link to a
        // group this viewer cannot see finds nothing.
        const groupRef = parseGroupRef(text);
        const direct = groupRef !== null ? await findGroup(groupRef) : null;
        const isLink = groupRef !== null && !/^#?\d+$/.test(text);
        const found = direct
            ? { groups: [direct], total: 1 }
            : isLink
              ? { groups: [], total: 0 }
              : await searchGroups(text, typeId.value);
        if (mine === token) result.value = { phase: 'done', ...found };
    } catch (e) {
        console.error('[teilnehmerliste] group search failed:', e);
        if (mine === token) result.value = { phase: 'error' };
    }
}

const summary = computed(() => {
    const r = result.value;
    if (r.phase !== 'done') return '';
    if (r.groups.length === 0) return COPY.searchNoHits;
    return r.total > r.groups.length
        ? COPY.searchMoreHits(r.groups.length, r.total)
        : COPY.searchHits(r.total);
});

const showLimitNote = computed(
    () => result.value.phase === 'done' && result.value.total > SEARCH_LIMIT,
);
</script>

<template>
    <section class="picker" :aria-label="COPY.pickerTitle">
        <h2 class="picker__title">{{ COPY.pickerTitle }}</h2>
        <div class="picker__controls">
            <div class="picker__field picker__field--grow">
                <label class="picker__label" :for="ids.query">{{ COPY.searchLabel }}</label>
                <input
                    :id="ids.query"
                    v-model="query"
                    class="picker__input"
                    type="search"
                    autocomplete="off"
                    :placeholder="COPY.searchPlaceholder"
                    :aria-controls="ids.results"
                />
            </div>
            <div class="picker__field">
                <label class="picker__label" :for="ids.type">{{ COPY.typeLabel }}</label>
                <select :id="ids.type" v-model="typeId" class="picker__input">
                    <option :value="null">{{ COPY.typeAll }}</option>
                    <option v-for="t in types" :key="t.id" :value="t.id">{{ t.label }}</option>
                </select>
            </div>
        </div>

        <div :id="ids.results" class="picker__results" aria-live="polite">
            <p v-if="result.phase === 'idle'" class="picker__note">{{ COPY.searchHint }}</p>
            <p v-else-if="result.phase === 'searching'" class="picker__note">
                {{ COPY.searching }}
            </p>
            <p v-else-if="result.phase === 'error'" class="picker__note picker__note--error">
                {{ COPY.searchFailed }}
            </p>
            <template v-else>
                <p class="picker__note">
                    {{ summary }}
                    <template v-if="showLimitNote">{{ COPY.searchNarrow }}</template>
                </p>
                <ul v-if="result.groups.length" class="picker__list">
                    <li v-for="g in result.groups" :key="g.id">
                        <button type="button" class="picker__hit" @click="emit('select', g)">
                            <span class="picker__hit-name">{{ g.name }}</span>
                            <span class="picker__hit-meta">
                                {{
                                    [
                                        typeName(g.groupTypeId),
                                        statusName(g.groupStatusId),
                                        `#${g.id}`,
                                    ]
                                        .filter(Boolean)
                                        .join(' · ')
                                }}
                            </span>
                        </button>
                    </li>
                </ul>
            </template>
        </div>
    </section>
</template>

<style scoped>
.picker {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    background: var(--tl-bg-card);
    border: 1px solid var(--tl-border);
    border-radius: var(--tl-radius);
}
.picker__title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
}
.picker__controls {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}
.picker__field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 200px;
}
.picker__field--grow {
    flex: 1 1 320px;
}
.picker__label {
    font-size: 13px;
    color: var(--tl-text-secondary);
}
.picker__input {
    height: 36px;
    padding: 0 10px;
    font: inherit;
    font-size: 14px;
    color: var(--tl-text);
    background: var(--tl-bg-card);
    border: 1px solid var(--tl-border-strong);
    border-radius: 6px;
}
.picker__input:focus-visible {
    outline: 2px solid var(--tl-accent);
    outline-offset: 1px;
}
.picker__results {
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.picker__note {
    margin: 0;
    font-size: 13px;
    color: var(--tl-text-secondary);
}
.picker__note--error {
    color: var(--tl-error);
}
.picker__list {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
    max-height: 360px;
    overflow-y: auto;
    border: 1px solid var(--tl-border);
    border-radius: 6px;
}
.picker__list > li + li {
    border-top: 1px solid var(--tl-border);
}
.picker__hit {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 4px 12px;
    width: 100%;
    padding: 10px 12px;
    font: inherit;
    text-align: left;
    color: var(--tl-text);
    background: none;
    border: 0;
    cursor: pointer;
}
.picker__hit:hover {
    background: var(--tl-bg-hover);
}
.picker__hit:focus-visible {
    outline: 2px solid var(--tl-accent);
    outline-offset: -2px;
}
.picker__hit-name {
    font-size: 14px;
    font-weight: 500;
}
.picker__hit-meta {
    font-size: 12px;
    color: var(--tl-text-secondary);
}
</style>
