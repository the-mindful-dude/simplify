# ADR-014 — Design-system-only interactive controls

- Status: Accepted
- Date: 2026-11-23
- Owners: architect
- Related tasks: T-P004, T-P005; `DECISION-FE-FOUNDATION-001.md:21`

## Context

Observed facts:

- `DECISION-FE-FOUNDATION-001.md:21` states: no native `<select>` or other bare native controls; every interactive control must come from the design-system layer.
- `AGENTS.md:96-97` locks Radix UI as headless UI and CSS custom properties + CSS Modules as styling; `ADR-003:30,33-45` requires canonical tokens and one component home in `packages/ui`.
- `eslint.config.mjs:26-45` currently enforces only `consistent-type-imports`, `no-explicit-any` and a narrow `no-restricted-imports` pattern for another package's `internal/` path; there is no JSX intrinsic-element restriction and no hex-color gate despite `ADR-003:81`.
- `apps/web/components/site-header.tsx:20-47` correctly uses the design-system `Button` with `asChild` for anchors, showing the intended pattern.
- `apps/web/components/registry-browser.tsx:4-11` imports Radix wrappers from `@simplify-dev/ui`, not Radix directly — this must remain true; `:142-207` uses a `DropdownMenu` filter and `:235-289` uses `Tabs`.
- `packages/ui/src/index.ts:1-118` still lacks `Sidebar`, `ContextMenu`, `CommandPalette`, `Breadcrumb`, `ScrollArea`, `Drawer`, `EmptyState` and `Select`; `packages/ui/src/primitives/Button/Button.tsx:11` lacks `icon`/`link` variants.
- `git ls-files packages/ui` shows no tests for `DropdownMenu`, `Tooltip` or `Tabs` (verified in T-P004 check 4).

Forces: semantic HTML is still required for accessibility, but it must be emitted by design-system components, not by ad hoc page markup; enforcement must be mechanical, not a convention note.

## Decision

1. Every interactive control rendered by `apps/web/**` or any `modules/**` must come from `@simplify-dev/ui`'s public entry point. Direct imports of `cmdk`, `@radix-ui/*` or any third-party UI library outside `packages/ui/src/**` are forbidden.
2. Add an ESLint `no-restricted-syntax` rule for JSX intrinsic elements (`select`, `option`, `input`, `textarea`, `button`, `a`, `dialog`, `details`, `summary`) in `apps/web/**` and `modules/**`, with `packages/ui/src/**` exempt. Design-system components may render the underlying semantic element internally (e.g. `Button asChild`) — this preserves accessibility (`AGENTS.md:96-97,468-478`).
3. Extend `packages/ui` additively with the missing primitives: `ContextMenu` (ADR-010), `CommandPalette` (ADR-011), `Sidebar`/`Collapsible`/`Breadcrumb`/`ScrollArea`/`Drawer` (ADR-013), `EmptyState`, optional Radix `Select`, and Button `icon`/`link` variants. Each gets an export, README entry and DOM test.
4. Implement the ADR-003:81 hex-color gate (no literal hex outside token source/generated output) and the already-required boundary/export check (`technical-standards.md:127`) in the same gate task. Do not create a second component library or utility dump.
5. `apps/web` may use plain semantic elements only for non-interactive content (`div`, `span`, `p`, headings, lists, `img`, `ul/li`), never for controls. Forms use `packages/ui` `InputField`/`Select`; navigation uses `Button asChild`/`Breadcrumb`; overlays use `Dialog`/`Drawer`.

## Alternatives considered

| Alternative                            | Why rejected                                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Allow native controls where convenient | Directly contradicts `DECISION-FE-FOUNDATION-001.md:21` and produces inconsistent styling/a11y.                    |
| Per-page wrapper components            | Duplicates logic across routes; violates single-owner rule (`AGENTS.md:196,499`).                                  |
| Enforce by review only                 | Not mechanical; drifts as pages are added; `technical-standards.md:127` already expects automated boundary checks. |
| CSS-only reset to hide native controls | Does not address semantics, keyboard behavior or duplicated logic; insufficient.                                   |

## Consequences

Positive: one accessible control vocabulary, mechanical enforcement, no third-party UI leakage.

Negative: one-time lint/gate work and new primitives to test; existing markup must be swept before module code merges.

Neutral: no runtime or dependency change to `apps/registry-api`, `packages/github` or `packages/cli`.

## Boundary and dependency impact

Added: `apps/web -> @simplify-dev/ui` (only for UI composition); `modules/app -> @simplify-dev/ui`. No `packages/* -> modules/*`; no new third-party UI dependency outside `packages/ui` (cmdk/Radix per ADR-010/011 are confined there).

## Migration plan

1. Add the lint rule and hex/boundary gates with a documented exemption file for `packages/ui/src/**`; run them in report-only mode first and fix findings in a defect task.
2. Add missing primitives with tests/READMEs; refresh lockfile per ADR-002 for cmdk/context-menu.
3. Sweep existing pages/components for restricted intrinsics and replace with design-system primitives.
4. Rollback: disable the lint rule commit; additive primitives can remain unused safely.

## Risks

| Risk                                        | Likelihood | Impact | Mitigation                                                         | Owner       |
| ------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------ | ----------- |
| Legitimate semantic element blocked by rule | medium     | low    | Scoped intrinsic list + documented exemption in `packages/ui` only | foundation  |
| Rule added but existing violations remain   | high       | medium | Report-only run, defect task, CI fail after clean baseline         | reviewer    |
| Missing primitives encourage workarounds    | medium     | high   | Ship primitives before enabling hard fail                          | implementer |

## Verification

- Lint rule fires on a fixture containing `<select>` in `apps/web`; does not fire for `packages/ui/src/**`.
- Third-party UI imports exist only in `packages/ui/package.json`.
- New primitives have public exports, READMEs and DOM tests; missing-test list from T-P004 check 4 is closed.
