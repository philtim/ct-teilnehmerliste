<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { COPY } from '@/shared/copy';
import { displayOf } from './columns';
import type { CellContext, OutputColumn } from './columns';
import type { MemberList } from './rows';

/**
 * The list as it will be downloaded: same columns, same order, same family
 * ids. Families are drawn as bands — alternating shade, a rule above each —
 * so who belongs together reads at a glance; a family of several carries an
 * accent on its left edge, like the yellow in the file.
 */
const props = defineProps<{
    list: MemberList;
    columns: OutputColumn[];
    ctx: CellContext;
    caption: string;
}>();

/** Rendering thousands of rows helps nobody; the file has them all. */
const PAGE = 200;
const shown = ref(PAGE);
watch(
    () => props.list,
    () => (shown.value = PAGE),
);

const rows = computed(() =>
    props.list.rows.slice(0, shown.value).map((row) => ({
        row,
        cells: props.columns.map((c) => ({ key: c.key, cell: c.cell(row.member, props.ctx) })),
    })),
);
const hidden = computed(() => props.list.rows.length - rows.value.length);
</script>

<template>
    <div class="preview">
        <div class="preview__scroll" tabindex="0" role="region" :aria-label="caption">
            <table class="preview__table">
                <caption class="preview__caption">
                    {{
                        caption
                    }}
                </caption>
                <thead>
                    <tr>
                        <th v-for="c in columns" :key="c.key" scope="col" class="preview__th">
                            {{ c.header }}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="{ row, cells } in rows"
                        :key="row.member.personId"
                        class="preview__row"
                        :class="{
                            'preview__row--odd': row.familyIndex % 2 === 1,
                            'preview__row--first': row.firstOfFamily,
                            'preview__row--family': row.familySize > 1,
                        }"
                    >
                        <td v-for="{ key, cell } in cells" :key="key" class="preview__td">
                            <a
                                v-if="cell?.kind === 'link'"
                                class="preview__link"
                                :href="cell.href"
                                target="_blank"
                                rel="noopener noreferrer"
                                :aria-label="
                                    COPY.openPersonInNewTab(
                                        `${row.member.firstName} ${row.member.lastName}`.trim(),
                                    )
                                "
                                >{{ cell.value }}</a
                            >
                            <span
                                v-else
                                :class="{
                                    preview__number: cell?.kind === 'number',
                                    'preview__family-key':
                                        key === 'family:key' && row.familySize > 1,
                                }"
                                >{{ displayOf(cell) }}</span
                            >
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <p v-if="hidden > 0" class="preview__more">
            {{ COPY.previewTruncated(rows.length, list.rows.length) }}
            <button type="button" class="preview__more-button" @click="shown = list.rows.length">
                {{ COPY.previewShowAll }}
            </button>
        </p>
    </div>
</template>

<style scoped>
.preview {
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.preview__scroll {
    max-height: 70vh;
    overflow: auto;
    border: 1px solid var(--tl-border);
    border-radius: 6px;
}
.preview__scroll:focus-visible {
    outline: 2px solid var(--tl-accent);
    outline-offset: 2px;
}
.preview__table {
    width: max-content;
    min-width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 13px;
}
.preview__caption {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
}
.preview__th {
    position: sticky;
    top: 0;
    z-index: 1;
    padding: 8px 10px;
    font-weight: 600;
    text-align: left;
    white-space: nowrap;
    background: var(--tl-bg-header);
    border-bottom: 1px solid var(--tl-border-strong);
}
.preview__td {
    max-width: 280px;
    padding: 6px 10px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: top;
}
.preview__row--odd .preview__td {
    background: var(--tl-bg-band);
}
.preview__row--first:not(:first-child) .preview__td {
    border-top: 1px solid var(--tl-border);
}
.preview__row--family .preview__td:first-child {
    box-shadow: inset 3px 0 0 var(--tl-family);
}
.preview__number {
    display: block;
    text-align: right;
    font-variant-numeric: tabular-nums;
}
.preview__family-key {
    padding: 1px 4px;
    background: var(--tl-family-fill);
    border-radius: 3px;
}
.preview__link {
    color: var(--tl-link);
    text-decoration: none;
}
.preview__link:hover {
    text-decoration: underline;
}
.preview__link:focus-visible {
    outline: 2px solid var(--tl-accent);
    outline-offset: 1px;
}
.preview__more {
    margin: 0;
    font-size: 13px;
    color: var(--tl-text-secondary);
}
.preview__more-button {
    margin-left: 8px;
    padding: 0;
    font: inherit;
    color: var(--tl-link);
    background: none;
    border: 0;
    text-decoration: underline;
    cursor: pointer;
}
</style>
