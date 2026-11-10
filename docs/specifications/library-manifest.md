# Library Manifest

A library is a distributable collection of related assets. The root manifest lives at
`simplify/library.json` in the connected repository.

## Required fields

| Field           | Meaning                                            |
| --------------- | -------------------------------------------------- |
| `schemaVersion` | Manifest schema revision. Currently `1`.           |
| `id`            | Stable library ID in kebab-case.                   |
| `name`          | Human-readable library name.                       |
| `description`   | Library purpose and scope.                         |
| `version`       | Semantic version of the library release.           |
| `license`       | License identifier or reference.                   |
| `assets`        | Repository-relative paths to asset manifest files. |
| `publishing`    | Declarative include and exclude rules.             |

## Optional fields

- `maintainers` — maintainer names and optional links.
- `repository` — canonical repository reference.
- `dependencies` — registry and package dependencies shared by the library.
- `documentation` — README, examples, and changelog references.

## Rules

- Asset manifest paths must be unique, relative, and must not contain `..`.
- The library manifest references assets; it must not duplicate their implementations.
- Publishing rules must exclude secrets, environment files, Git internals, dependencies,
  and generated build output by default.
- The manifest must remain valid independently of the repository directory layout.

Schema: `libraryManifestSchema`. Validation: `validateLibraryManifest`.
