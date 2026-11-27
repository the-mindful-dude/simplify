# Asset Manifest

An asset is an independently installable implementation. Every asset manifest describes its
identity, targets, implementations, dependencies, installation metadata, and documentation.

## Required fields

| Field             | Meaning                                                          |
| ----------------- | ---------------------------------------------------------------- |
| `schemaVersion`   | Manifest schema revision. Currently `1`.                         |
| `id`              | Stable asset ID in the form `<category>/<name>`.                 |
| `category`        | `ui`, `blocks`, `logic`, `integrations`, `recipes`, `templates`. |
| `name`            | Human-readable asset name.                                       |
| `description`     | Purpose and capability summary.                                  |
| `version`         | Semantic version of this asset release.                          |
| `publisher`       | Publishing identity.                                             |
| `status`          | Official, community, verified, deprecated, or compromised.       |
| `license`         | License identifier or reference.                                 |
| `targets`         | Supported language, framework, runtime, and platform targets.    |
| `implementations` | One or more implementation entries.                              |

## Rules

- The category portion of `id` must match `category`.
- Asset IDs are independent of repository directory layout and registry URLs.
- Every implementation declares a target, installation mode, and source entry.
- When `installation` metadata is present, every implementation mode must have a matching
  mode definition.
- Source and target paths must be relative and must not contain `..`.
- An asset must not declare a registry dependency on itself.
- One logical asset may contain multiple implementations for different targets.

Schema: `assetManifestSchema` in `@simplify-dev/schemas`. Validation:
`validateAssetManifest`.
