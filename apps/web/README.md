# @simplify-dev/web

The simplify.dev registry browser, documentation application, and Theme Studio.

## Boundaries

- Consumes `@simplify-dev/registry` data; must not maintain a separate asset catalogue.
- Uses the real `@simplify-dev/ui`, `@simplify-dev/blocks`, and `@simplify-dev/tokens`
  implementations for previews.
- Must not import CLI internals.
- Server and client boundaries are chosen deliberately.

## Status

Foundation scaffold. The registry browser and documentation are not implemented yet.
