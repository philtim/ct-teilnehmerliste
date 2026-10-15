# Architecture Decision Records

This folder contains short documents capturing architectural decisions baked into this template. Each ADR is one decision, written at the time it was made, with the reasoning preserved for future readers.

When you fork this template, leave the ADRs in place — they explain *why* the structure looks the way it does. If your project changes one of these decisions, write a new ADR that supersedes the old one rather than rewriting the original.

## Format

- **Title:** ADR-NNN: short statement of the decision
- **Status:** Proposed | Accepted | Superseded by ADR-XXX
- **Context:** what problem are we solving, what constraints apply
- **Decision:** what we chose
- **Consequences:** what this enables, what it costs, what we'd reconsider for
- **Alternatives considered:** what else we looked at and why we didn't pick it

ADRs are immutable once accepted. To change a decision, write a new ADR that supersedes the old one — don't edit history.

## Current ADRs

| ID                                       | Title                                                                          | Status   |
| ---------------------------------------- | ------------------------------------------------------------------------------ | -------- |
| [001](001-frontend-framework.md)         | Frontend framework: Vue 3 with Composition API                                 | Accepted |
| [002](002-css-scoping.md)                | CSS scoping: `<style scoped>` + BEM under a project-wide root class            | Accepted |
| [003](003-testing-strategy.md)           | Testing strategy: no automated tests in v1                                     | Accepted |
| [004](004-module-structure.md)           | Module structure: feature folders + `shared/`                                  | Accepted |
| [005](005-api-client.md)                 | API client: thin wrapper in `src/shared/api/` with single-seam ESLint guardrail | Accepted |
| [006](006-linting-and-formatting.md)     | Linting and formatting: ESLint flat config + Prettier + `eslint-plugin-vue`    | Accepted |

## When to write a new ADR

Write an ADR when a decision:

- Has multiple reasonable options
- Will be referenced again (during reviews, onboarding, future reconsideration)
- Is costly to reverse

Don't write ADRs for:

- Choices the configuration files already document (e.g., specific Prettier line width)
- Decisions nobody will revisit (e.g., "yes, we use TypeScript")
- Implementation details that belong in code comments

## Numbering

Sequential, zero-padded to three digits. Once assigned, a number is never reused — even if the ADR is superseded.
