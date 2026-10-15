# ADR-006: Linting and formatting — ESLint flat config + Prettier + `eslint-plugin-vue`

- **Status:** Accepted
- **Date:** 2026-05-07
- **Decided by:** template author

## Context

Code-quality tooling for a 2026 Vue 3 + TypeScript project has two main paths:

- **Classic stack:** ESLint + Prettier + framework-specific plugins. Mature, ubiquitous, well-documented; pays the cost of multiple config files and the historical "Prettier conflict dance" with ESLint.
- **Unified stack:** Biome — a Rust-based all-in-one linter+formatter. 10–50× faster, single config, automatic ESLint config migration. Used in production at Vercel, Coinbase, Discord, Slack, Astro.

The single fact that decides this for us: **as of 2026, Biome does not parse `.vue` files**. Its lint rules apply only to `<script>` blocks via separate JS/TS handling, not to `<template>` markup. The Vue-specific lint rules (unused props, missing `key` on `v-for`, `v-html` warnings, accessibility) live in `eslint-plugin-vue` and have no Biome equivalent on the roadmap that's actually shipped.

ADR-001 commits us to Vue 3. That commitment makes Biome a partial solution.

A separate question: pre-commit hooks (Husky + lint-staged) vs. CI-only enforcement. Modern practice is moving toward editor-on-save + CI as the gate, with hooks reserved for cases where editor configuration can't be assumed.

## Decision

We use **ESLint flat config + Prettier + `eslint-plugin-vue`**, with these enforcement layers:

1. **Editor (instant, automatic):** lint-on-save and format-on-save via VS Code extensions for ESLint and Prettier.
2. **Local on demand:** `npm run check` runs the full lint + type-check + build.
3. **CI (authoritative):** GitHub Actions runs the same checks on every push. Branch protection rules require CI to pass before merge.

We **do not** add Husky, lint-staged, or any pre-commit hooks. CI is the gate; the editor is the safety net during writing.

Concrete tooling:

- **ESLint** with flat config (`eslint.config.js`).
- **Plugins:** `eslint-plugin-vue` (recommended ruleset), `@vue/eslint-config-typescript` for TS-aware Vue rules.
- **Prettier** with default-ish settings (resist bikeshedding `printWidth`, tab vs. spaces).
- **`eslint-config-prettier`** to disable ESLint rules that conflict with Prettier's formatting.
- **`vue-tsc`** for type-checking `.vue` template expressions in CI.
- **Project-specific rule:** `no-restricted-imports` blocks `@churchtools/churchtools-client` outside `src/shared/api/` (see ADR-005).

## Consequences

**What this enables:**

- Vue template linting catches Vue-specific bugs at write time and in CI — the most valuable lint coverage for this stack.
- Modern flat config (`eslint.config.js`) avoids the deprecated `.eslintrc` format that's being phased out.
- No `--no-verify` muscle memory: nothing to bypass, nothing to skip during rebases or amends.
- Forkers don't have to install or trust Husky to start working — `npm install` and they're set.
- The single-seam `no-restricted-imports` rule is enforced automatically; reviewers don't have to remember to spot drift.
- A clean upgrade path if Biome ships full Vue support: this ADR gets superseded, the team migrates with `biome migrate eslint --write`.

**What this costs:**

- Multiple config files (`eslint.config.js`, `.prettierrc`, plus IDE settings). The "config drift" problem is real but small at this project's scale.
- Slower than Biome — ESLint on a project this size runs in the 1–10 second range, fine for CI but slower than Biome would deliver.
- Discipline burden: keeping ESLint, Prettier, the Vue plugin, and the TypeScript plugin in sync across major-version upgrades.
- No pre-commit safety net for developers who haven't configured editor-on-save. Mitigation: the README mentions the recommended VS Code extensions; CI catches anything that escapes.

**What we'd reconsider for:**

- Biome shipping full Vue template linting. At that point, this ADR gets superseded by an ADR-XXX that migrates to Biome.
- A team-size or velocity change where developer environment heterogeneity makes pre-commit hooks earn their keep.

## Alternatives considered

**Biome only.** Rejected because Vue template linting is unsupported.

**Hybrid: Biome for formatting, ESLint for linting.** Rejected because it adds back the "two tools" complexity that was supposed to be the entire reason to switch.

**ESLint + Prettier + Husky.** Rejected because pre-commit hooks slow down committing, are easily bypassed via `--no-verify`, make rebases painful, and editor-on-save catches almost everything they would catch.

**Just Prettier on save, no lint blocking.** Rejected because Vue-specific lint rules catch real bugs (missing `key` on `v-for`, mutating props, etc.) that no formatter would catch.

**Pre-push hook instead of pre-commit.** Considered briefly. Rejected because if the developer has editor-on-save configured, the pre-push hook adds friction without much marginal value.
