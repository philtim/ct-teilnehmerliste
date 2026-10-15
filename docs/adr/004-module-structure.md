# ADR-004: Module structure — feature folders + `shared/`

- **Status:** Accepted
- **Date:** 2026-05-07
- **Decided by:** template author

## Context

Most CT extensions grow into a handful of distinct features (a main view, an admin/settings screen, an access gate, etc.) that don't overlap much. A flat layout sounds simple at the start, but the community example `karteileichen` showed what happens: a single `main.ts` grew to 890 lines before being refactored. The refactor split responsibilities by *layer* (`state.ts`, `api.ts`, `ui.ts`, `events.ts`), which works when there's *one* thing being built — less so when an extension has multiple unrelated screens.

A few concerns are shared across features regardless: the API client, KV-Store helpers, common types, build-time constants.

## Decision

Organize `src/` by **feature folders**, each owning its own UI, state, and feature-specific API logic. Cross-cutting concerns live in `shared/`.

```
src/
├── main.ts                      # boot, mount, route to feature
├── App.vue                      # top-level shell (applies the project root class)
├── example/                     # one feature folder
│   ├── Example.vue              # component(s)
│   ├── useExample.ts            # composable: state + lifecycle
│   └── example.api.ts           # feature-specific API calls
└── shared/
    ├── api/                     # ChurchTools API client wrapper (ADR-005)
    ├── kv-store/                # KV-Store helpers
    ├── ct-types.d.ts            # ChurchTools API types
    ├── reset.css                # dev-only host-style simulation
    ├── constants.ts             # extension key, timeouts
    └── types.ts                 # shared TypeScript types
```

**Rules of the structure:**

- Feature folders never import from each other. Cross-feature needs go through `shared/`.
- Pure logic (no Vue, no DOM, no API) lives next to the feature that uses it — easy to find. If logic ends up reused across features, it moves to `shared/`.
- Each feature exposes one or more **composables** (`useExample`, `useGate`, `useAdmin`, …) that the feature's components consume. Components don't call APIs directly — they go through the composable.
- The boundary between feature and `shared/` is decided by reuse: something is shared the moment a second feature needs it, not before.

## Consequences

**What this enables:**

- A new contributor opening `src/<feature>/` sees everything related to that feature in one place.
- Feature-scoped refactoring stays local. Renaming a component in one feature doesn't ripple through another.
- Composables are the natural seam for future testing — when ADR-003 gets superseded, the composables and pure-logic files are obvious starting points.
- The structure makes forking and customization clearer: someone forking for their own organization can see at a glance what each feature does.

**What this costs:**

- More folders than a flat structure. For a tiny project this can feel like over-organization on day one.
- Some duplication in `*.api.ts` files where two features happen to call similar endpoints. Acceptable: consolidate only when it's the same call, not a similar call.
- Slightly more verbose imports (e.g. `import { useExample } from '@/example/useExample'`).

**What we'd reconsider for:**

- A single feature growing large enough to need its own internal subdivision.
- A monorepo move where features become separate packages.

## Alternatives considered

**Layered (`state.ts` / `api.ts` / `ui.ts` / `events.ts`).** The karteileichen pattern post-refactor. Rejected because most CT extensions have meaningfully separate features whose state and lifecycle don't overlap; lumping them into one `state.ts` mingles things that should stay apart. Layered is the right choice when there's *one* thing being built.

**Single `main.ts` until pain is felt.** Rejected because the layout is cheap to set up at the start, and most extensions reach the "I should split this up" point within weeks anyway.

**Framework-idiomatic only (Vue components and composables wherever they want to live).** Rejected because Vue is unopinionated about file organization at scale; teams converge on conventions, and "feature folders" is the most common one.

**Atomic Design (atoms/molecules/organisms).** Rejected because most extensions have a small enough component count that the atomic taxonomy adds more confusion than clarity.
