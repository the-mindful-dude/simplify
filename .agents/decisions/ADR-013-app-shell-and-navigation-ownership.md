# ADR-013 — Application shell, navigation, and sidebar ownership

- Status: proposed
- Date: 2026-11-23
- Owners: architect
- Related tasks: T-P004, T-P005; `DECISION-FE-FOUNDATION-001.md:5,13`

## Context

Observed facts:

- `apps/web/app/layout.tsx:18-31` renders only `<TokenStyles/>`, `<SiteHeader/>` and children; there is no application shell, sidebar or route-group layout.
- `apps/web/components/site-header.tsx:11-52` is the only global navigation surface; it contains brand links and GitHub/Get started actions.
- `apps/web/components/registry-browser.tsx:235-289` uses Radix `Tabs` for category switching inside the browser; this is content navigation, not global navigation.
- `packages/ui/src/index.ts:1-118` exposes no `Sidebar`, `Collapsible`, `Breadcrumb`, `ScrollArea`, `Drawer` or `ContextMenu` primitive.
- `DECISION-FE-FOUNDATION-001.md:5` requires sidebar groups with collapsible sections, keyboard-operable context menus and a local workspace switcher; the addendum (`:20`) requires hover animations and (`:21`) no native controls; ADR-009 permits orchestrated motion only in `modules/app`.
- `T-P002C:18-21` confirms the absence of sidebar, command palette, toast and providers; `T-P002B:20-22` lists `Sidebar`, `ContextMenu`, `Breadcrumb` and `ScrollArea` as missing primitives.
- `AGENTS.md:178-220`, §4.2 require one owner per responsibility; `ADR-003:33-45` makes `packages/ui` the only home for reusable primitives.

Forces: global navigation policy must not be duplicated across pages or domains; generic presentation primitives must not absorb app policy; mobile navigation and reduced motion must be first-class.

## Decision

1. `modules/app` owns the **shell and navigation policy**: `AppShell`, `AppSidebar`, `navConfig`, `WorkspaceSwitcher` data contract, `useSidebarState` (storage injected), sidebar action definitions and `CommandPaletteHost` (ADR-011). It depends only on `modules/core`, `@simplify-dev/ui` and approved UI libraries (ADR-007).
2. `packages/ui` owns **generic presentational primitives** used by the shell: `Sidebar`, `Collapsible`, `ContextMenu`, `Breadcrumb`, `ScrollArea`, `Drawer` and `Tooltip`. They accept data/slots and expose no route knowledge, no repository calls and no feature flags.
3. Domain modules created later contribute `NavContribution[]` **data** to `modules/app` through the composition root; they never export sidebar components or import `modules/app` (no reverse edge).
4. `apps/web` owns only Next.js route files and the composition root; it composes `AppShell` in `app/layout.tsx` (or a route-group layout) and passes route data. No page defines its own sidebar, menu or duplicate nav state.
5. Sidebar hover/collapse animation is CSS + `--sd-motion-*` tokens and `prefers-reduced-motion`; Motion for React is used only for orchestrated shell transitions in `modules/app` (ADR-009). Mobile navigation uses the ui `Drawer` primitive.
6. Keyboard behavior and context menus come from the single `ContextMenu` primitive (ADR-010). No hand-rolled menu, no native `<details>/<summary>` (ADR-014).

## Alternatives considered

| Alternative                                              | Why rejected                                                                                                        |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Put `AppSidebar` directly in `apps/web`                  | Duplicates nav policy across route files, couples shell to Next.js internals, violates module boundary and ADR-007. |
| Put nav routes and workspace policy inside `packages/ui` | Policy leak: published UI would depend on application routes/contracts; violates ADR-003:33-45.                     |
| Let each domain render its own menu items as components  | Creates competing nav representations and cross-module imports; no single owner.                                    |
| Reuse `registry-browser.tsx` Tabs as global nav          | Confuses content filters with application navigation; duplicates state and accessibility contracts.                 |

## Consequences

Positive: one nav source of truth, isolated third-party/keyboard behavior, reduced-motion-safe shell, publish-safe UI primitives.

Negative: new primitives and one new module to build; route data must be wired once in the composition root.

Neutral: no change to current registry browser behavior during parallel-run migration.

## Boundary and dependency impact

Added: `modules/app -> @simplify-dev/ui`; `apps/web -> modules/app`. Added to `packages/ui`: additive exports only. No `packages/* -> modules/*`; no `modules/app -> domain module`; no `apps/registry-api` edge.

## Migration plan

1. Add presentational primitives and tests to `packages/ui` (additive; ADR-003/010/014).
2. Create `modules/core` nav types and `modules/app` shell/sidebar with a parallel route-group layout in `apps/web`; keep the existing header during the transition.
3. Move `SiteHeader` nav data into `navConfig`; delete the old header links in a later commit once parity is verified.
4. Rollback: revert the layout composition commit; the previous header and browser remain functional.

## Risks

| Risk                                           | Likelihood | Impact | Mitigation                                                                 | Owner      |
| ---------------------------------------------- | ---------- | ------ | -------------------------------------------------------------------------- | ---------- |
| Duplicate nav state between header and sidebar | medium     | high   | Single `navConfig`; ESLint ownership rule; review of composition root only | architect  |
| Core becomes a dumping ground for nav types    | low        | medium | Export allowlist; boundary checker                                         | foundation |
| Motion leaks into `packages/ui` or pages       | medium     | medium | ADR-009 guard; dependency assertion                                        | reviewer   |
| Mobile nav uses native dialog/details          | medium     | medium | ADR-014 lint rule; ui `Drawer` only                                        | foundation |

## Verification

- Exactly one `navConfig`; zero `Sidebar`/`WorkspaceSwitcher` definitions outside `modules/app`.
- A11y tests cover keyboard collapse, context-menu focus return and reduced motion.
- Boundary check shows no `modules/app -> domain` and no `packages/* -> modules/*` edge.
