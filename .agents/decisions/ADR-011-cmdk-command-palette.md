# ADR-011 — cmdk command palette behind a design-system wrapper

- Status: proposed
- Date: 2026-11-23
- Owners: architect
- Related tasks: T-P004, T-P005; user decision `.agents/decisions/DECISION-FE-FOUNDATION-001.md:10`

## Context

Observed facts:

- `T-P002C:20` found no command palette or cmdk anywhere; `packages/ui/src/index.ts:1-118` exposes no command primitive; `T-P002C:22` lists CommandMenu/CommandPalette as absent.
- `docs/MODEL.md:44,121-125,169-186` treats command palettes and navigation as reusable capabilities; `docs/MODEL.md:1119-1121` requires previews to render real implementations, not mocks.
- `ADR-003:35` makes `packages/ui` the single canonical component home; `AGENTS.md:169-172` forbids deep imports into another package's internals.
- The user approved cmdk with an ADR (`DECISION-FE-FOUNDATION-001:10`) and forbade bare native UI controls (`:21`).

Forces: a command palette is a third-party UI engine, must be isolated behind the design system, must not become a second navigation source of truth, and must preserve focus/keyboard/reduced-motion behavior.

## Decision

1. Approve **cmdk** as the command-palette engine. Add it to `packages/ui` and expose one `CommandPalette` compound component that composes cmdk with the existing Radix `Dialog` for modality, focus trap and accessibility.
2. `packages/ui` owns the wrapper, styling, keyboard/focus tests and README. Pages and domain modules must not import `cmdk` directly; it is an isolated third-party dependency behind a narrow boundary (`AGENTS.md:169-176`, §6 isolation).
3. `modules/app` owns the **command registry** (navigation commands from `navConfig` + registry search commands from `modules/registry` query/hook data). Commands are data contributed once; no page defines its own palette.
4. Search/filter behavior must use real registry query data (ADR-008/ADR-012); no hardcoded mock command lists in production. Fixtures are test-only.
5. Motion uses the ADR-009 preset/guard; reduced motion is honored. Styling uses `var(--sd-*)` tokens and CSS Modules only.
6. This is additive to `packages/ui`; no locked decision is overturned. Radix remains the headless overlay foundation.

## Alternatives considered

| Alternative                                   | Why rejected                                                                                                                                       |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build a palette from hand-rolled input + list | Reimplements cmdk's filtering, keyboard and a11y behavior; duplicates logic; fails the user's no-native-controls rule if a bare `<input>` is used. |
| Import cmdk directly in `apps/web` pages      | Leaks third-party code into pages, duplicates wrappers across routes, violates ADR-003's single component home.                                    |
| A second palette library                      | Competing tool; violates `AGENTS.md:103`.                                                                                                          |
| Hardcoded command list                        | Fake implementation (`AGENTS.md:505-527`) and a second navigation source of truth.                                                                 |

## Consequences

Positive: one accessible palette, one command registry, real data, isolated third-party code.

Negative: new dependency and a wrapper to maintain; command contributions must be defined once and reviewed.

Neutral: existing package APIs additive only; `apps/registry-api` unaffected.

## Boundary and dependency impact

Added: `packages/ui -> cmdk`; `modules/app -> @simplify-dev/ui` (planned), `modules/app -> modules/registry` for real search commands? **No** — `app` must not depend on domains (ADR-007). Instead `apps/web` composes registry-derived commands as data and passes them to `CommandPaletteHost` in `modules/app`. No `packages/*` -> `modules/*` edge; no `apps/registry-api` edge.

## Migration plan

1. Add cmdk and the additive `CommandPalette` export/tests/README in `packages/ui`; refresh lockfile per ADR-002.
2. Add `CommandPaletteHost` in `modules/app` accepting a `Command[]` prop from `apps/web`.
3. Wire real registry search commands from the composition root; add tests for keyboard focus and reduced motion.
4. Rollback: remove the wrapper/export; existing navigation via sidebar and header remains functional.

## Risks

| Risk                                     | Likelihood | Impact | Mitigation                                                                                                     | Owner      |
| ---------------------------------------- | ---------- | ------ | -------------------------------------------------------------------------------------------------------------- | ---------- |
| Command duplication (sidebar vs palette) | medium     | high   | Single `Command[]` built from `navConfig` + registry hooks in the composition root; no per-page command arrays | architect  |
| cmdk imported outside `packages/ui`      | low        | medium | ESLint no-restricted-imports for `cmdk` outside `packages/ui/src/**`                                           | foundation |
| Fake/static commands shipped             | medium     | medium | Acceptance test that palette results come from repository-backed hooks; fixtures only in tests                 | reviewer   |

## Verification

- `cmdk` appears only in `packages/ui/package.json`; one public `CommandPalette` export.
- No `modules/*` -> domain edge introduced in `modules/app` for palette data.
- Palette tests cover keyboard navigation, Escape/focus restore, reduced motion and real data source.
