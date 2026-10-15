<script setup lang="ts">
import { ref, watch } from 'vue';
import { COPY } from '@/shared/copy';
import { readGroupParam, withGroupParam } from '@/shared/groupParam';
import GroupPicker from '@/groups/GroupPicker.vue';
import MemberView from '@/members/MemberView.vue';
import type { GroupInfo } from '@/members/types';

/** Two steps on one page: choose a group, then shape and download its list. */
const groupId = ref<number | null>(readGroupParam(window.location.href));

watch(groupId, (id) => {
    try {
        window.history.replaceState(
            window.history.state,
            '',
            withGroupParam(window.location.href, id),
        );
    } catch {
        // A sandboxed frame may refuse; the list works without the address.
    }
});

function choose(group: GroupInfo) {
    groupId.value = group.id;
}

const version = __APP_VERSION__;
const commit = __APP_COMMIT__;
</script>

<template>
    <div class="tl">
        <header class="tl__header">
            <h1 class="tl__title">{{ COPY.appTitle }}</h1>
            <p class="tl__intro">{{ COPY.appIntro }}</p>
        </header>

        <GroupPicker v-if="groupId === null" @select="choose" />
        <MemberView v-else :key="groupId" :group-id="groupId" @change="groupId = null" />

        <footer class="tl__footer">{{ COPY.footer(version, commit) }}</footer>
    </div>
</template>

<style>
/*
 * Design tokens, on the project root class (ADR-002) so nothing reaches the
 * host page. Neutral greys like ChurchTools' own light theme; the accent is a
 * blue that keeps 4.5:1 against white for text and focus rings.
 */
.teilnehmerliste-root {
    --tl-text: #1f2328;
    --tl-text-secondary: #59636e;
    --tl-bg-card: #ffffff;
    --tl-bg-header: #eef0f3;
    --tl-bg-band: #f7f8fa;
    --tl-bg-hover: #f0f3f7;
    --tl-border: #e1e4e8;
    --tl-border-strong: #c9ced4;
    --tl-accent: #1a5fb4;
    --tl-on-accent: #ffffff;
    --tl-link: #1a5fb4;
    --tl-family: #d9a400;
    --tl-family-fill: #fff2cc;
    --tl-error: #b42318;
    --tl-error-bg: #fef3f2;
    --tl-warn-bg: #fff8e6;
    --tl-radius: 8px;

    color: var(--tl-text);
    font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
    line-height: 1.45;
}
</style>

<style scoped>
.tl {
    display: flex;
    flex-direction: column;
    gap: 20px;
    max-width: 1600px;
    margin: 0 auto;
    padding: 24px 16px 32px;
}
.tl__header {
    display: flex;
    flex-direction: column;
    gap: 4px;
}
.tl__title {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
}
.tl__intro {
    margin: 0;
    max-width: 70ch;
    color: var(--tl-text-secondary);
}
.tl__footer {
    font-size: 12px;
    color: var(--tl-text-secondary);
}
</style>
