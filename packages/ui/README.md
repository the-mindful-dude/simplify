# @simplify-dev/ui

Accessible React components built on semantic design tokens.

## Responsibilities

- `src/primitives/` — foundational controls and layout primitives.
- `src/components/` — compound and interactive components.
- `src/hooks/` — shared React hooks.
- `src/internal/` — non-exported implementation utilities.
- `styles/` — token-driven CSS and the `styles.css` package export.

## Boundaries

- Depends on `@simplify-dev/tokens` only.
- Must not import framework-independent logic packages, blocks, or the web application.
- Public exports are deliberate; `internal/` is never exported.
- Components use semantic tokens, support controlled and uncontrolled state where
  meaningful, and treat accessibility as functionality.
- Radix UI is the headless foundation; CSS Modules provide scoped styles.

## Status

Phase 2 placeholder. Component implementation begins in Phase 12.
