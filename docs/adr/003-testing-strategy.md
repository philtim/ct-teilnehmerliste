# ADR-003: Testing strategy — no automated tests in v1

- **Status:** Accepted
- **Date:** 2026-05-07
- **Decided by:** template author

## Context

CT extensions typically start small: arrange and display data fetched from ChurchTools, possibly with a configuration screen that writes to the KV-Store. Most behavior is "remote API → render", which is hard to unit-test without significant fixture investment, and for which TypeScript + manual exploration catch the bulk of bugs.

Investing in a test suite *before* the project's domain logic stabilizes risks writing tests that need to be rewritten when the domain shape changes — defeating the safety-net purpose.

## Decision

The template ships with **no automated tests**. Quality is enforced by:

1. **TypeScript** for type safety.
2. **ESLint** with `eslint-plugin-vue` for static analysis and Vue-specific rules (ADR-006).
3. **Manual exploratory testing** against a real (demo) ChurchTools instance.

Tests get added when concrete pain emerges — a regression that ships, a refactor that breaks something subtle, or a piece of logic complex enough that "running it once and looking" stops being sufficient.

## Consequences

**What this enables:**

- Faster iteration during the first weeks of a new extension where domain shape is still being confirmed.
- A smaller cognitive load and dependency footprint at v1.
- Architectural changes don't invalidate a test suite that hasn't been written yet.

**What this costs:**

- No safety net beyond what TypeScript + ESLint catch. A refactor might break something subtle, and we'll catch it manually or in production.
- New contributors have no executable specification of how individual modules are supposed to behave.

**What we'd reconsider for:**

This ADR is explicitly time-limited. Add tests when:

- A bug ships that an obvious unit test would have caught — the bug, plus a regression test, justifies retroactively introducing the test framework.
- A refactor of pure-logic modules feels uncertain.
- A second contributor joins and asks for a test suite as an onboarding aid.

When tests are added, the natural choice is **Vitest** (it ships with Vite, requires zero additional config). Start with unit tests on pure logic — `fetchAllPages`, any domain calculation — and expand only if pain continues.

We deliberately do **not** plan for component tests (Vue Test Utils) or end-to-end tests (Playwright) at v1 or v1.1 of any project starting from this template. A read-mostly UI whose entire input is a remote API doesn't get much from those layers without significant fixture investment.

## Alternatives considered

**Unit tests for pure logic only, with Vitest.** Considered seriously and would be the next step if pain emerges. Rejected for v1 because shape is still moving.

**Component tests with Vue Test Utils on top of unit tests.** Rejected as overkill for typical dashboard-style extensions. Visual inspection during development beats writing assertions about DOM structure.

**Full pyramid with Playwright E2E.** Rejected because end-to-end testing against ChurchTools requires either a service account or a fixture server mirroring the API. Both are larger projects than most extensions themselves.
