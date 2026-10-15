# ADR-007: Testing strategy — Vitest for pure logic

- **Status:** Accepted
- **Date:** 2026-10-15
- **Decided by:** Philipp Timmalog
- **Supersedes:** ADR-003 (no automated tests in v1)

## Context

ADR-003 names its own replacement condition: "a piece of logic complex enough
that 'running it once and looking' stops being sufficient." This extension has
such logic from day one. It groups the members of a ChurchTools group into
families, from two independent signals — recorded relationships, and the same
address plus the same surname — under a household rule: two people at
different known addresses are never one family. Over-merging puts two
households under one family id, under-merging splits one. Both are errors a
reader of the list cannot see.

The family logic is taken over from the RR dashboard (`philtim/ct-rr-organigram`),
where it was found the hard way: on real data, twelve sibling pairs had no
relationship recorded at all, and address alone merges two families in one
building. Those cases are its tests, and they come along with the code.

## Decision

**Vitest, for pure logic only.** Family detection, the column catalogue, row
building and the workbook layout are pure functions with unit tests. The
ChurchTools client is mocked where a composable calls it. No component tests,
no jsdom, no end-to-end tests — the UI is checked by hand against the demo
instance.

`vitest.config.ts` is separate from `vite.config.ts`: the build config is a
function of `mode`, shells out to git and sets up the dev proxy, none of which a
test needs.

`npm run check` (lint, typecheck, test, build, bundle budget) is the single
definition of green, run by CI on every pull request.

## Consequences

- The cases that broke family detection before are pinned down.
- Tests describe behaviour, not DOM structure, so a UI rework does not
  invalidate them.
- Rendering bugs are still found by looking. The review/test pass before a
  release covers that.
