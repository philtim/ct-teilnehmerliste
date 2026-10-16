<script setup lang="ts">
import { computed, onMounted, ref, useId, watch } from 'vue';
import { COPY } from '@/shared/copy';
import { getOriginUrl } from '@/shared/api';
import { loadGroupVocabulary, runSearch, SEARCH_LIMIT } from './groups.api';
import type { Choice, SearchResult } from './groups.api';
import type { GroupInfo } from '@/members/types';

/**
 * Find a group by name, by id, or by pasting its link; narrow by group type.
 * Lists only what ChurchTools returns to this viewer.
 */
const props = defineProps<{ focusOnMount?: boolean }>();
const emit = defineEmits<{ select: [group: GroupInfo] }>();
const input = ref<HTMLInputElement | null>(null);

const query = ref('');
const typeId = ref<number | null>(null);
const types = ref<Choice[]>([]);
const statuses = ref<Choice[]>([]);

type SearchState =
    | { phase: 'idle' }
    | { phase: 'searching' }
    | { phase: 'error' }
    | ({ phase: 'done' } & SearchResult);
const result = ref<SearchState>({ phase: 'idle' });

const ids = { query: useId(), type: useId(), results: useId() };

onMounted(async () => {
    // Back from a chosen group: the button that was pressed is gone, so focus
    // goes where the next step starts rather than to the top of the page.
    if (props.focusOnMount) input.value?.focus();
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
    result.value = { phase: 'searching' };
    try {
        const found = await runSearch(text, typeId.value, undefined, getOriginUrl());
        if (mine !== token) return;
        result.value = found ? { phase: 'done', ...found } : { phase: 'idle' };
    } catch (e) {
        console.error('[teilnehmerliste] group search failed:', e);
        if (mine === token) result.value = { phase: 'error' };
    }
}

/** One line that says where the search stands — the only part announced. */
const status = computed(() => {
    const r = result.value;
    switch (r.phase) {
        case 'idle':
            return COPY.searchHint;
        case 'searching':
            return COPY.searching;
        case 'error':
            return COPY.searchFailed;
    }
    if (r.tooShort) return COPY.searchTooShort;
    if (r.groups.length === 0) return COPY.searchNoHits;
    const count =
        r.total > r.groups.length
            ? COPY.searchMoreHits(r.groups.length, r.total)
            : COPY.searchHits(r.total);
    return r.total > SEARCH_LIMIT ? count + COPY.searchNarrow : count;
});
</script>

<template>
    <section class="picker" :aria-label="COPY.pickerTitle">
        <h2 class="picker__title">{{ COPY.pickerTitle }}</h2>
        <div class="picker__controls">
            <div class="picker__field picker__field--grow">
                <label class="picker__label" :for="ids.query">{{ COPY.searchLabel }}</label>
                <input
                    :id="ids.query"
                    ref="input"
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

        <div :id="ids.results" class="picker__results">
            <p
                class="picker__note"
                :class="{ 'picker__note--error': result.phase === 'error' }"
                role="status"
            >
                {{ status }}
            </p>
            <ul v-if="result.phase === 'done' && result.groups.length" class="picker__list">
                <li v-for="g in result.groups" :key="g.id">
                    <button type="button" class="picker__hit" @click="emit('select', g)">
                        <span class="picker__hit-name">{{ g.name }}</span>
                        <span class="picker__hit-meta">
                            {{
                                [typeName(g.groupTypeId), statusName(g.groupStatusId), `#${g.id}`]
                                    .filter(Boolean)
                                    .join(' · ')
                            }}
                        </span>
                    </button>
                </li>
            </ul>
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
