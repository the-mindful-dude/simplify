# @simplify-dev/ui

Accessible React components built on semantic design tokens.

## Responsibilities

- `src/primitives/` — foundational controls and layout primitives.
- `src/components/` — compound and interactive components.
- `src/hooks/` — shared React hooks.
- `src/internal/` — non-exported implementation utilities.
- `dist/` — compiled JavaScript and type declarations plus CSS Modules copied from `src/` by `scripts/copy-css.mjs`; there is no separate `styles.css` package export.

## Boundaries

- Depends on `@simplify-dev/tokens` only.
- Must not import framework-independent logic packages, blocks, or the web application.
- Public exports are deliberate; `internal/` is never exported.
- Components use semantic tokens, support controlled and uncontrolled state where
  meaningful, and treat accessibility as functionality.
- Radix UI is the headless foundation; CSS Modules provide scoped styles.

## Status

Foundation implemented. The package exports the primitives, layouts, overlays and navigation components listed in `src/index.ts`, built on Radix UI, CSS Modules and semantic `@simplify-dev/tokens`. Public responsive types are re-exported from `src/types.ts`; no `internal/` path is exported.
