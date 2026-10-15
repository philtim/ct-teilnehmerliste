<script setup lang="ts">
import { computed, useId } from 'vue';
import { COPY } from '@/shared/copy';
import type { CatalogColumn, Section } from './columns';
import type { SaveState } from './useMemberList';

/**
 * Which columns the list has, by section. The short fixed sections sit side
 * by side; the group's own fields and the further person fields can number
 * dozens, so they take the full width below, in columns of their own.
 */
const props = defineProps<{
    catalog: CatalogColumn[];
    selected: ReadonlySet<string>;
    saveState: SaveState;
}>();
const emit = defineEmits<{
    toggle: [id: string, on: boolean];
    toggleMany: [ids: string[], on: boolean];
    reset: [];
}>();

const SECTIONS: Section[] = ['person', 'membership', 'family', 'group', 'personExtra'];
/** Sections that can hold dozens of fields take the full width, in columns of their own. */
const WIDE = new Set<Section>(['group', 'personExtra']);

const sections = computed(() =>
    SECTIONS.map((section) => {
        const columns = props.catalog.filter((c) => c.section === section);
        return {
            section,
            columns,
            on: columns.filter((c) => props.selected.has(c.id)).length,
        };
    }).filter((s) => s.columns.length > 0),
);

const total = computed(() => props.catalog.filter((c) => props.selected.has(c.id)).length);
const baseId = useId();
</script>

<template>
    <details class="columns" open>
        <summary class="columns__summary">
            {{ COPY.columnsTitle(total, catalog.length) }}
        </summary>
        <div class="columns__body">
            <fieldset
                v-for="s in sections"
                :key="s.section"
                class="columns__section"
                :class="{ 'columns__section--wide': WIDE.has(s.section) }"
            >
                <legend class="columns__legend">
                    {{ COPY.sectionTitle[s.section] }}
                    <span class="columns__count">{{
                        COPY.sectionCount(s.on, s.columns.length)
                    }}</span>
                </legend>
                <div v-if="s.columns.length > 1" class="columns__bulk">
                    <button
                        type="button"
                        class="columns__bulk-button"
                        :disabled="s.on === s.columns.length"
                        @click="
                            emit(
                                'toggleMany',
                                s.columns.map((c) => c.id),
                                true,
                            )
                        "
                    >
                        {{ COPY.selectAll }}
                    </button>
                    <button
                        type="button"
                        class="columns__bulk-button"
                        :disabled="s.on === 0"
                        @click="
                            emit(
                                'toggleMany',
                                s.columns.map((c) => c.id),
                                false,
                            )
                        "
                    >
                        {{ COPY.selectNone }}
                    </button>
                </div>
                <p v-if="s.section === 'personExtra'" class="columns__note">
                    {{ COPY.personExtraNote }}
                </p>
                <ul class="columns__list">
                    <li v-for="c in s.columns" :key="c.id">
                        <label class="columns__item" :for="`${baseId}-${c.id}`">
                            <input
                                :id="`${baseId}-${c.id}`"
                                type="checkbox"
                                :checked="selected.has(c.id)"
                                @change="
                                    emit(
                                        'toggle',
                                        c.id,
                                        ($event.target as HTMLInputElement).checked,
                                    )
                                "
                            />
                            <span>{{ c.label }}</span>
                        </label>
                    </li>
                </ul>
            </fieldset>
            <div class="columns__footer">
                <button type="button" class="columns__bulk-button" @click="emit('reset')">
                    {{ COPY.resetColumns }}
                </button>
                <span class="columns__save" aria-live="polite">
                    {{ COPY.saveState[saveState] }}
                </span>
            </div>
        </div>
    </details>
</template>

<style scoped>
.columns {
    background: var(--tl-bg-card);
    border: 1px solid var(--tl-border);
    border-radius: var(--tl-radius);
}
.columns__summary {
    padding: 12px 16px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
}
.columns__summary:focus-visible {
    outline: 2px solid var(--tl-accent);
    outline-offset: -2px;
}
.columns__body {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
    padding: 0 16px 16px;
}
.columns__section {
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
}
.columns__section--wide {
    grid-column: 1 / -1;
}
.columns__legend {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 0;
    margin-bottom: 6px;
    font-size: 13px;
    font-weight: 600;
}
.columns__count {
    font-weight: 400;
    color: var(--tl-text-secondary);
}
.columns__bulk {
    display: flex;
    gap: 12px;
    margin-bottom: 6px;
}
.columns__bulk-button {
    padding: 0;
    font: inherit;
    font-size: 12px;
    color: var(--tl-link);
    background: none;
    border: 0;
    text-decoration: underline;
    cursor: pointer;
}
.columns__bulk-button:disabled {
    color: var(--tl-text-secondary);
    text-decoration: none;
    cursor: default;
}
.columns__bulk-button:focus-visible {
    outline: 2px solid var(--tl-accent);
    outline-offset: 1px;
}
.columns__note {
    margin: 0 0 6px;
    font-size: 12px;
    color: var(--tl-text-secondary);
}
.columns__list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
}
.columns__section--wide .columns__list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 2px 16px;
}
.columns__item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 3px 0;
    font-size: 13px;
    cursor: pointer;
}
.columns__item span {
    min-width: 0;
    overflow-wrap: anywhere;
}
.columns__item input {
    flex: none;
    width: 16px;
    height: 16px;
    margin: 0;
    accent-color: var(--tl-accent);
}
.columns__footer {
    grid-column: 1 / -1;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 16px;
}
.columns__save {
    font-size: 12px;
    color: var(--tl-text-secondary);
}
</style>
