# Registry Specifications

This directory documents the public contracts implemented by `@simplify-dev/schemas` and
validated by `@simplify-dev/registry`.

| Document                                                           | Contract                            |
| ------------------------------------------------------------------ | ----------------------------------- |
| [`asset-manifest.md`](./asset-manifest.md)                         | Asset identity, targets, and files. |
| [`library-manifest.md`](./library-manifest.md)                     | Library identity and asset listing. |
| [`dependency-model.md`](./dependency-model.md)                     | Registry and package dependencies.  |
| [`installation-metadata.md`](./installation-metadata.md)           | Modes, environment, and setup.      |
| [`versioning-and-publication.md`](./versioning-and-publication.md) | Releases and snapshots.             |
| [`project-configuration.md`](./project-configuration.md)           | `simplify.config.json`.             |
| [`registry-index.md`](./registry-index.md)                         | Discovery index.                    |

Manifests use JSON Schema draft 2020-12. The canonical schema objects and TypeScript types
live in `schemas/src` and are published through `@simplify-dev/schemas`. Runtime validation
is provided by `@simplify-dev/registry` so the schema package has no runtime dependencies.

All external input must be validated at the boundary. Validation failures are reported with
an instance path, a keyword, and an actionable message; secrets and local paths must never
appear in validation output.
