<script setup lang="ts">
import { computed, onMounted, ref, toRef } from 'vue';
import { COPY } from '@/shared/copy';
import ColumnPicker from './ColumnPicker.vue';
import PreviewTable from './PreviewTable.vue';
import { useMemberList } from './useMemberList';

/** The chosen group: what the list will contain, how to shape it, and the download. */
const props = defineProps<{ groupId: number }>();
const emit = defineEmits<{ change: [] }>();

const {
    state,
    catalog,
    selected,
    statuses,
    statusCounts,
    list,
    columns,
    cellContext,
    hintTexts,
    saveState,
    download,
    reload,
    setColumn,
    setColumns,
    resetColumns,
    setStatus,
    downloadExcel,
} = useMemberList(toRef(props, 'groupId'));

// The picker that had focus is gone once a group is chosen; the heading of
// what replaced it takes focus, so keyboard and screen-reader users land here.
const heading = ref<HTMLElement | null>(null);
onMounted(() => heading.value?.focus());

const group = computed(() => (state.value.phase === 'ready' ? state.value.data.group : null));
const total = computed(() => (state.value.phase === 'ready' ? state.value.data.members.length : 0));
// Not disabled while the file is being written: a disabled button drops
// keyboard focus to the page. A second press is ignored by `downloadExcel`.
const canDownload = computed(() => list.value.rows.length > 0 && columns.value.length > 0);
</script>

<template>
    <section class="view" :aria-busy="state.phase === 'loading'">
        <div class="view__bar">
            <div class="view__heading">
                <p class="view__eyebrow">{{ COPY.chosenGroup }}</p>
                <h2 ref="heading" class="view__title" tabindex="-1">
                    <a
                        v-if="group"
                        class="view__group-link"
                        :href="group.frontendUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                        :aria-label="COPY.openGroupInNewTab(group.name)"
                        >{{ group.name }}</a
                    >
                    <template v-else>#{{ groupId }}</template>
                </h2>
            </div>
            <button type="button" class="view__secondary" @click="emit('change')">
                {{ COPY.changeGroup }}
            </button>
        </div>

        <p v-if="state.phase === 'loading'" class="view__status" role="status">
            {{ COPY.loadingGroup }}
        </p>

        <div
            v-else-if="state.phase === 'error'"
            class="view__message view__message--error"
            role="alert"
        >
            <p>{{ COPY.loadError[state.reason] }}</p>
            <button
                v-if="state.reason === 'failed'"
                type="button"
                class="view__secondary"
                @click="reload()"
            >
                {{ COPY.retry }}
            </button>
        </div>

        <template v-else-if="state.phase === 'ready'">
            <p v-if="total === 0" class="view__message">{{ COPY.noMembers }}</p>
            <template v-else>
                <div class="view__summary">
                    <dl class="view__stats">
                        <div class="view__stat">
                            <dt>{{ COPY.statPeople }}</dt>
                            <dd>{{ list.rows.length }}</dd>
                        </div>
                        <div class="view__stat">
                            <dt>{{ COPY.statFamilies }}</dt>
                            <dd>{{ list.familyCount }}</dd>
                        </div>
                        <div class="view__stat">
                            <dt>{{ COPY.statMultiFamilies }}</dt>
                            <dd>
                                {{ list.multiFamilyCount }}
                                <span class="view__stat-detail">{{
                                    COPY.statMultiDetail(list.peopleInMultiFamilies)
                                }}</span>
                            </dd>
                        </div>
                    </dl>
                    <div class="view__download">
                        <button
                            type="button"
                            class="view__primary"
                            :disabled="!canDownload"
                            :aria-busy="download.phase === 'working'"
                            @click="downloadExcel"
                        >
                            {{ download.phase === 'working' ? COPY.downloading : COPY.download }}
                        </button>
                        <p
                            v-if="download.phase === 'error'"
                            class="view__download-error"
                            role="alert"
                        >
                            {{ COPY.downloadFailed }}
                        </p>
                    </div>
                </div>

                <ul v-if="hintTexts.length" class="view__hints" :aria-label="COPY.hintsTitle">
                    <li v-for="text in hintTexts" :key="text">{{ text }}</li>
                </ul>

                <fieldset v-if="statusCounts.length > 0" class="view__statuses">
                    <legend class="view__statuses-legend">{{ COPY.statusFilter }}</legend>
                    <label v-for="[status, count] in statusCounts" :key="status" class="view__chip">
                        <input
                            type="checkbox"
                            :checked="statuses.has(status)"
                            @change="setStatus(status, ($event.target as HTMLInputElement).checked)"
                        />
                        {{ COPY.memberStatus(status) }} ({{ count }})
                    </label>
                </fieldset>

                <ColumnPicker
                    :catalog="catalog"
                    :selected="selected"
                    :save-state="saveState"
                    @toggle="setColumn"
                    @toggle-many="setColumns"
                    @reset="resetColumns"
                />

                <p v-if="list.rows.length === 0" class="view__message">{{ COPY.allFiltered }}</p>
                <p v-else-if="columns.length === 0" class="view__message">{{ COPY.noColumns }}</p>
                <PreviewTable
                    v-else
                    :list="list"
                    :columns="columns"
                    :ctx="cellContext"
                    :caption="COPY.previewCaption(group?.name ?? '')"
                />
            </template>
        </template>
    </section>
</template>

<style scoped>
.view {
    display: flex;
    flex-direction: column;
    gap: 16px;
}
.view__bar {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
}
.view__heading {
    min-width: 0;
}
.view__eyebrow {
    margin: 0 0 2px;
    font-size: 12px;
    color: var(--tl-text-secondary);
}
.view__title:focus {
    outline: none;
}
.view__title:focus-visible {
    outline: 2px solid var(--tl-accent);
    outline-offset: 2px;
}
.view__title {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    overflow-wrap: anywhere;
}
.view__group-link {
    color: inherit;
    text-decoration: none;
}
.view__group-link:hover {
    text-decoration: underline;
}
.view__group-link:focus-visible {
    outline: 2px solid var(--tl-accent);
    outline-offset: 2px;
    border-radius: 2px;
}
.view__status,
.view__message {
    margin: 0;
    font-size: 14px;
    color: var(--tl-text-secondary);
}
.view__message--error {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    color: var(--tl-error);
    background: var(--tl-error-bg);
    border-radius: var(--tl-radius);
}
.view__message--error p {
    margin: 0;
}
.view__summary {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 16px;
    background: var(--tl-bg-card);
    border: 1px solid var(--tl-border);
    border-radius: var(--tl-radius);
}
.view__stats {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
    margin: 0;
}
.view__stat dt {
    font-size: 12px;
    color: var(--tl-text-secondary);
}
.view__stat dd {
    margin: 0;
    font-size: 22px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
}
.view__stat-detail {
    font-size: 13px;
    font-weight: 400;
    color: var(--tl-text-secondary);
}
.view__download {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
}
.view__download-error {
    margin: 0;
    font-size: 13px;
    color: var(--tl-error);
}
.view__primary,
.view__secondary {
    height: 36px;
    padding: 0 16px;
    font: inherit;
    font-size: 14px;
    font-weight: 500;
    border-radius: 6px;
    cursor: pointer;
}
.view__primary {
    color: var(--tl-on-accent);
    background: var(--tl-accent);
    border: 1px solid var(--tl-accent);
}
.view__primary:disabled {
    opacity: 0.5;
    cursor: default;
}
.view__secondary {
    color: var(--tl-text);
    background: var(--tl-bg-card);
    border: 1px solid var(--tl-border-strong);
}
.view__primary:focus-visible,
.view__secondary:focus-visible {
    outline: 2px solid var(--tl-accent);
    outline-offset: 2px;
}
.view__hints {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0;
    padding: 12px 16px 12px 32px;
    font-size: 13px;
    background: var(--tl-warn-bg);
    border-radius: var(--tl-radius);
}
.view__statuses {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin: 0;
    padding: 0;
    border: 0;
}
.view__statuses-legend {
    float: left;
    margin-right: 4px;
    padding: 0;
    font-size: 13px;
    color: var(--tl-text-secondary);
}
.view__chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    font-size: 13px;
    background: var(--tl-bg-card);
    border: 1px solid var(--tl-border-strong);
    border-radius: 999px;
    cursor: pointer;
}
.view__chip input {
    margin: 0;
    accent-color: var(--tl-accent);
}

@media (max-width: 600px) {
    .view__download {
        align-items: stretch;
        width: 100%;
    }
    .view__primary {
        width: 100%;
    }
}
</style>
