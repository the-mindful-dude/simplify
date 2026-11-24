# DECISION-FE-FOUNDATION-001 — Frontend foundation & product-experience redesign scope

Status: ACCEPTED (user decisions via question tool, 2026-11-23)
Owner: coordinator
Related: T-P003, T-P004, T-P005

## User decisions (verbatim choice labels)
1. Plan scope — **Detail all 7 phases now**: full task-level specs, acceptance criteria, and validation for every phase, not just the foundation.
2. Palette policy — **Evolve tokens, preserve a11y**: map the guide's visual direction into the canonical token source, add radius/control-height tokens, regenerate, re-verify WCAG.
3. Dependencies — **All proposed libraries**: TanStack Query, Motion for React, Radix Context Menu, and cmdk, each justified with an ADR under AGENTS.md Section 3.
4. Modules layout — **Workspace packages**: modules/core, modules/app, and domain modules added to pnpm-workspace.yaml as @simplify-dev/* packages with explicit exports, project boundaries, ESLint rules.
5. Sidebar — **Groups + context menus + local workspaces**: declarative groups, collapsible sections, keyboard-accessible item context menus, workspace switcher from local fixtures/persisted preference.
6. Data — **Real registry adapter + fixtures**: preserve validated on-disk registry behind a RegistryRepository contract; fixtures for dashboard/collections/compositions/publishers/settings.
7. Auth — **Visual-only pages**: /login, /register, /forgot-password with local validation and honest placeholder submission; public and dashboard route shells; no real auth.
8. Defects — **Yes, bounded remediation**: all discovered pre-existing defects get owned tasks with tests plus a fresh baseline gate run; AGENTS.md/ADR text changes require an ADR.

## User addenda (same session, after the Q&A)
- Sidebar must have **hover animations** and be **collapsible**.
- No logic or component may be **duplicated everywhere**; establish single ownership and reuse deliberately.
- Work must be **professional**.
- **Do not use native HTML elements for `select` or other UI controls**: all interactive UI must come from the design-system component layer (Radix-backed, accessible), not ad-hoc/native controls. Interpretation to be confirmed in plan: a design-system component may internally render a semantic element (e.g. Button renders `<button>`), but no page or module may use bare `<select>`, `<input>` (except through InputField), `<dialog>`, `<details>`, or hand-rolled menus/dropdowns.
- **Update design rules/docs to the current implementation**: stale AGENTS.md/technical-standards/README/ADR statements must be reconciled as part of the work.

## Hard constraint carried from the user's original message
- `modules/registry/` (frontend domain module) is **not** `apps/registry-api/` (Node webhook ingestion service). They must remain distinct in all plans, docs, and agent briefs.
