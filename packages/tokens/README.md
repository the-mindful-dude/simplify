# @simplify-dev/tokens

Framework-independent design tokens and generated outputs.

## Responsibilities

- `source/` — canonical token definitions and schema validation.
- `generators/` — CSS custom properties, JSON, TypeScript, and future outputs.
- `outputs/` — generated light, dark, and custom theme artifacts.

## Boundaries

- Must not depend on React or UI packages.
- Generated output must be reproducible from the canonical source.
- Semantic roles must stay distinct; brand values stay separate from role names.

## Status

Phase 2 placeholder. Token model and generation begin in Phase 11.
