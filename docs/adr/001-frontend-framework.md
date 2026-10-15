# ADR-001: Frontend framework — Vue 3 with Composition API

- **Status:** Accepted
- **Date:** 2026-05-07
- **Decided by:** template author

## Context

ChurchTools extensions render inside the host UI and typically need:

- Reactive state (initial load, refresh, error states for partial failures).
- Form state for admin/configuration screens stored in the KV-Store.
- Component-level CSS isolation that won't leak into the host (see ADR-002).

The official ChurchTools extension boilerplate ships as a framework-agnostic Vite + TypeScript shell. Two community extensions illustrate practical paths: `CEuchner/churchtools_karteileichen` (vanilla TypeScript, ~890 lines in `main.ts` before refactoring) and `aschojz/churchtools-extension-flow` (Vue 3 with Composition API, used for a node-based editor).

## Decision

We use **Vue 3 with the Composition API** as the frontend framework.

## Consequences

**What this enables:**

- Reactive state out of the box: `ref()` and `reactive()` handle re-renders without manual DOM updates.
- Single-file components (`.vue`) co-locate template, script, and scoped styles per component — natural fit for the feature-folder structure (ADR-004).
- `<style scoped>` provides component-level CSS isolation, complementing the project-wide root-class scoping in ADR-002.
- Composition API keeps logic reusable: composables can be shared across features without inheritance ceremony.

**What this costs:**

- A small bundle-size overhead vs. vanilla TS (~30 KB gzipped for Vue runtime). Acceptable for typical dashboard-style extensions.
- Slight learning curve for contributors unfamiliar with Vue 3, though the Composition API is straightforward for anyone with React-hooks experience.
- We're tied to Vue's tooling ecosystem (`@vitejs/plugin-vue`, `vue-tsc`, `eslint-plugin-vue` — see ADR-006).

**What we'd reconsider for:**

- A future ChurchTools host that ships Vue at runtime and asks extensions to use the same instance (currently each extension bundles its own).
- A move to Server Components or other architectures incompatible with classic SPA-style frameworks.

## Alternatives considered

**Vanilla TypeScript.** Lightest option, no framework runtime. Rejected because reactive UI needs (initial load, refresh, per-card error states, admin forms) push toward hand-rolled state management and DOM diffing — exactly what frameworks solve. The karteileichen example shows how vanilla scales: 890 lines in one file before refactoring.

**React with hooks.** Functionally equivalent for this use case. Rejected because Vue 3 has a slightly smaller runtime, single-file components fit feature folders more cleanly than separate JSX/CSS files, and most existing CT-extension examples that go beyond vanilla use Vue.

**Svelte.** Smallest bundle, simplest reactivity model. Rejected because the CT-extension community's Vue/vanilla example set is broader and the smaller ecosystem raises integration risk for limited gain.
