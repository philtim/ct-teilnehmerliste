# ADR-002: CSS scoping — `<style scoped>` + BEM under a project-wide root class

- **Status:** Accepted
- **Date:** 2026-05-07
- **Decided by:** template author

## Context

A ChurchTools extension renders inside the host UI. Any unscoped CSS would leak into the host (and host CSS would leak into the extension). The community extension `karteileichen` learned this the hard way — their v1.0.5 release was largely a CSS-scoping fix, including attribute fallbacks (`[data-ct-extension="..."]`), high-specificity modal overrides, and explicitly avoiding global `body` classes at runtime.

ADR-001 commits us to Vue 3, which provides `<style scoped>` — a runtime mechanism that adds a unique attribute selector (e.g. `[data-v-abc123]`) to every rule, isolating styles to the component that declared them.

## Decision

We use **Vue's `<style scoped>` for component-level isolation, combined with BEM (Block-Element-Modifier) naming inside each scope**, all wrapped under a project-wide root class on the application's mount element. The class name is derived from the project's `shorty` (e.g. `.my-extension-root`) and stored in `package.json#churchtools.rootClassName` so workflows and tooling can reference it from one place.

The three layers, from outside in:

1. **Project scope:** the project root class on the mount point. The only selector that touches the host's DOM. Provides the safety net even if a developer accidentally writes an unscoped style.
2. **Component scope:** `<style scoped>` in every `.vue` file. Vue's compiler attribute-tags every selector so it cannot match outside the component.
3. **Naming:** BEM inside each component (e.g. `.example__title--highlighted`). Keeps selectors readable and predictable.

## Consequences

**What this enables:**

- Belt-and-suspenders isolation: the project-wide root class catches anything that escapes component scope; component scope catches anything that escapes BEM intent.
- Readable selectors: BEM names describe structure (`block__element--modifier`) without obscure CSS-in-JS hashes.
- No build-step changes: `<style scoped>` is a Vue compiler feature, BEM is a naming convention.
- Straightforward debugging: every selector in DevTools traces back to a specific component.

**What this costs:**

- Slight verbosity in selector names (BEM tends to produce longer class names than utility-first CSS).
- `<style scoped>` does not penetrate child components or `<slot>` content. When we need to style content rendered by a child component, we use Vue's `:deep(...)` pseudo-class — sparingly, and only where unavoidable.
- BEM discipline is a team convention, not enforced by tooling. Code review must catch violations.

**What we'd reconsider for:**

- A move to a CSS-in-JS solution (Vanilla Extract, Pinceau) if styling complexity grows beyond what BEM expresses cleanly.
- Tailwind, if a project absorbs a design system that ships Tailwind tokens.

## Alternatives considered

**Tailwind CSS.** Utility-first, fast to write, popular. Rejected as the default because most CT-extension projects start with a small, well-defined component set. Tailwind adds a build-step plugin, a learning curve, and a larger CSS bundle for utilities used only fractionally.

**CSS Modules.** Auto-scoped, framework-agnostic. Rejected because Vue's `<style scoped>` already provides equivalent isolation natively, without `styles.foo` import boilerplate.

**No framework-level scoping, only the project root prefix.** Rejected: relying on a single root prefix is fragile — one accidental top-level selector and styles leak. `<style scoped>` provides defense in depth at zero added cost.

**Plain BEM without `<style scoped>`.** Rejected for the same reason — defense in depth is cheap with Vue, and trusting only a naming convention has burned other extensions.
