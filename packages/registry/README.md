# @simplify-dev/registry

Registry contracts, asset resolution, and the registry client.

## Responsibilities

- `schema/` — registry, library, asset, and version metadata contracts.
- `resolver/` — dependency resolution, compatibility selection, and installation plans.
- `client/` — registry access used by the CLI, web application, and tooling.

## Boundaries

- Depends on `schemas` only. Must not depend on GitHub, the CLI, the web application, or
  UI packages.
- Must not contain GitHub-specific concepts.
- Storage details stay behind client and resolver interfaces so the backend can change.

## Status

The schema contracts and boundary validation are implemented. Registry storage, indexing,
artifact distribution, and dependency resolution follow in later work.
