# @simplify-dev/web

The simplify.dev registry browser, documentation application, and Theme Studio.

## Boundaries

- Consumes `@simplify-dev/registry` data; must not maintain a separate asset catalogue.
- Uses the real `@simplify-dev/ui`, `@simplify-dev/blocks`, and `@simplify-dev/tokens`
  implementations for previews.
- Must not import CLI internals.
- Server and client boundaries are chosen deliberately.

## Status

Phase 2 placeholder. The application is built in Phase 15 and Phase 16.
