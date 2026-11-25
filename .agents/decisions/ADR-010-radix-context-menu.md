# ADR-010 — Radix Context Menu for keyboard-accessible item actions

- Status: Accepted
- Date: 2026-11-23
- Owners: architect
- Related tasks: T-P004, T-P005; user decision `.agents/decisions/DECISION-FE-FOUNDATION-001.md:10`

## Context

Observed facts:

- `AGENTS.md:97` locks Radix UI as the headless foundation; `ADR-003:37` lists the initially approved Radix set; `packages/ui/package.json:23-30` declares avatar, dialog, dropdown-menu, slot, tabs and tooltip only.
- The sidebar must provide "keyboard-accessible item context menus" (`DECISION-FE-FOUNDATION-001:12`); `packages/ui/src/index.ts:74-95` already exposes a mature DropdownMenu API with groups/submenus/radio/checkbox/shortcut.
- `T-P002B:41` confirms no context-menu primitive; `T-P002C:22` confirms none in the public API.

Forces: context-menu behavior (right-click, keyboard `ContextMenu` key, focus management, roving focus, Escape) must not be hand-rolled, and must not duplicate the existing DropdownMenu implementation.

## Decision

1. Add `@radix-ui/react-context-menu` to `packages/ui` and expose a **single** `ContextMenu` compound component with item/group/sub/separator/checkbox/radio parts consistent with the existing `DropdownMenu` API shape (`packages/ui/src/index.ts:74-95`).
2. `packages/ui` owns the primitive, its CSS Module, keyboard/focus/a11y tests and README. `modules/app` owns the _action definitions_ for sidebar items (one set of actions, used by both the context menu and any overflow dropdown via shared data).
3. Visual styling consumes `var(--sd-*)` tokens only; no hardcoded colors; `"use client"` only in the interactive entry module, consistent with the existing overlay pattern.
4. Where the same action list can be rendered as a dropdown, share the action **data** (and the item renderer) rather than duplicating JSX; do not create a second generic "menu system".
5. This extends the locked Radix decision rather than changing it; no competing headless menu library is introduced.

## Alternatives considered

| Alternative                                                               | Why rejected                                                                                                                     |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Hand-rolled context menu with `onContextMenu` + absolutely positioned div | Fails keyboard/focus/overlay semantics required by `technical-standards.md:143-153` and duplicates Radix behavior.               |
| Reuse DropdownMenu only (trigger on right-click)                          | DropdownMenu does not own the context-menu keyboard/focus contract; forces custom event hacks.                                   |
| Put ContextMenu in `modules/app`                                          | Would create a second component system outside the canonical `packages/ui` home (ADR-003:35), violating the no-duplication rule. |
| Add a second headless menu library                                        | Violates `AGENTS.md:97,103` and ADR-003:54.                                                                                      |

## Consequences

Positive: accessible keyboard/right-click behavior with one implementation; consistent API with DropdownMenu; actions defined once.

Negative: one additional Radix dependency; must maintain parity with DropdownMenu styling conventions.

Neutral: existing component APIs and published exports remain additive; `apps/registry-api` unaffected.

## Boundary and dependency impact

Added: `packages/ui -> @radix-ui/react-context-menu`; `modules/app -> @simplify-dev/ui` (already planned in ADR-007). No new edge to `modules/*` from any published package. No edge to or from `apps/registry-api`.

## Migration plan

1. Add dependency and `ContextMenu` files/tests/README in `packages/ui` (additive export only); refresh lockfile per ADR-002.
2. Add sidebar action data in `modules/app`; render via the new primitive with tests for keyboard activation and focus return.
3. Reuse the same action data for any overflow menu rather than duplicating markup.
4. Rollback: remove the additive export and dependency; sidebar falls back to existing DropdownMenu actions without loss of core navigation.

## Risks

| Risk                                          | Likelihood | Impact | Mitigation                                                                                      | Owner             |
| --------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------------------------------------- | ----------------- |
| Divergent styling from DropdownMenu           | medium     | low    | Share token-driven style module conventions; visual regression test                             | ui-ux implementer |
| Duplicate action definitions in app and pages | medium     | medium | Boundary/review rule: actions declared once in `modules/app`; pages import data, not JSX copies | architect         |
| Missing keyboard test                         | low        | high   | Required RTL test covering ContextMenu key, arrow navigation, Escape, focus restore             | implementer       |

## Verification

- `packages/ui/src/index.ts` exports ContextMenu parts once; no local context-menu implementation in `apps/web` or `modules/*`.
- Keyboard/focus tests pass in jsdom; reduced-motion and token usage verified.
