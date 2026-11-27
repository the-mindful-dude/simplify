# @simplify-dev/web

The simplify.dev registry browser. The app currently renders a single Next.js route; the
redesigned application shell and sidebar are planned, not shipped.

## Boundaries

- Consumes `@simplify-dev/registry` data; must not maintain a separate asset catalogue.
- Renders through `@simplify-dev/ui` primitives and injects generated `--sd-*` tokens from
  `@simplify-dev/tokens` as `tokenCss`.
- Must not import CLI internals.
- Server and client boundaries are chosen deliberately.

## Status

Implemented: `app/page.tsx` renders `RegistryContent`, which reads the on-disk registry through
`getRegistrySnapshot()` and composes the header, hero, status section, registry browser and
footer. The browser provides search, category and library filters, sorting and asset detail
inspection. `loading.tsx`, `error.tsx` and `not-found.tsx` cover the route states. Header links
target sections of this page only; no documentation or Theme Studio routes exist.
