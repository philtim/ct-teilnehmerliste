# ADR-005: API client — thin wrapper in `src/shared/api/` with single-seam ESLint guardrail

- **Status:** Accepted
- **Date:** 2026-05-07
- **Decided by:** template author

## Context

CT extensions talk to ChurchTools through its REST API, via the official npm package `@churchtools/churchtools-client` ([source](https://github.com/churchtools/churchtools-js-client)). It handles:

- Auth, session cookies, automatic re-login via login token.
- CSRF tokens for the legacy API.
- Browser + Node.js targets via the same interface.

It deliberately does **not** handle:

- Pagination across pages — different CT endpoints cap at different page sizes (`/groups`: 200, `/events`: 100, `/services`: not paginated). The community example `karteileichen` documented infinite-loop scenarios when a misbehaving endpoint returned the same page repeatedly.
- Per-call timeouts.
- A normalized error type the UI can branch on.

Two patterns are common in the wider CT-extension community:

- **Direct use:** import `@churchtools/churchtools-client` and call its methods from anywhere.
- **Heavy wrapper:** a project-defined `ApiClient` class that exposes only the endpoints the project needs, with project-typed parameters and return values.

## Decision

We add a **thin wrapper** in `src/shared/api/` that re-exports the official client and fills exactly the gaps the official client leaves: timeouts, normalized errors, pagination. The folder is the **only place in the codebase that imports `@churchtools/churchtools-client`** — an ESLint `no-restricted-imports` rule enforces this. Feature code imports from `@/shared/api`.

```
src/shared/api/
├── client.ts        # ct (raw re-export), initApi, withTimeout, getOriginUrl,
│                    # apiGet/apiPost/apiPut/apiDelete (timeout + error wrappers)
├── errors.ts        # ChurchToolsApiError
├── pagination.ts    # fetchAllPages with safety guards
└── index.ts         # barrel — what feature code imports
```

Feature-level API calls live in each feature's `*.api.ts` (per ADR-004) and import from `@/shared/api`:

```ts
import { apiGet } from '@/shared/api';
import type { Person } from '@/shared/types';

export async function whoami(): Promise<Person> {
    return await apiGet<Person>('/whoami');
}
```

## Consequences

**What this enables:**

- One init call (`initApi(baseUrl)`), one error type (`ChurchToolsApiError`), one pagination helper, one timeout policy — shared across every feature.
- The ESLint guardrail prevents the most common drift over time: someone reaching past the wrapper to import the raw client "just this once" because they hit a corner the wrapper doesn't cover. If they need a corner, they extend the wrapper.
- When a CT API change requires an adapter, it lives in *one* place.
- When ADR-003 is reversed and tests are added, `fetchAllPages`, `withTimeout`, and `ChurchToolsApiError` are pure-logic units that test naturally.

**What this costs:**

- One extra file in the import chain. Trivially small.
- The temptation to grow the wrapper into a heavy abstraction. Code review pushes back on adding endpoints to the wrapper that have only one caller.

**What we'd reconsider for:**

- A second project that shares the same wrapper code — at that point it might warrant being a separate package.
- A move away from `@churchtools/churchtools-client` if its API changes incompatibly. The wrapper would absorb the migration.

## Alternatives considered

**Direct use of `@churchtools/churchtools-client` everywhere.** Rejected because pagination logic, error handling, and timeouts would duplicate across features. It also gives no place to absorb future API decisions cleanly.

**Heavy wrapper: project-defined `ApiClient` class with explicit methods for every endpoint.** Rejected because it inverts the maintenance burden — every new endpoint requires adding a method to the class first. For a v1 with maybe ten distinct endpoint calls, that overhead doesn't pay off. It also tends to attract premature abstraction (typed return values that drift from the actual API responses).

**Composable instead of module (`useApi()`).** Rejected because the API client is stateless after init — there's nothing to react to and no component lifecycle to bind to. A plain module is simpler.

**No ESLint guardrail.** Rejected: without it, "import the client directly, just this once" gradually erodes the seam. Three or four direct imports later, swapping the underlying client becomes a multi-file refactor instead of a one-file change.
