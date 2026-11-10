# @simplify-dev/tooling

Asset validation, library building, and preview runtime utilities.

## Responsibilities

- `src/asset-validator/` — manifest, file, dependency, and path validation.
- `src/library-builder/` — deterministic artifact collection and integrity hashing.
- `src/preview-runtime/` — safe preview execution for compatible assets.

## Boundaries

- Depends on `schemas` and `@simplify-dev/registry` contracts.
- Must not import React, UI components, the web application, or the CLI.
- Must not execute arbitrary repository or registry scripts.
- Build output must be deterministic for the same source revision and configuration.

## Status

Foundation scaffold. Validation and build tooling are not implemented yet.
