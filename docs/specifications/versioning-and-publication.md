# Versioning and Publication

Stable library releases follow Semantic Versioning. Development snapshots are separate from
stable releases and must never replace them.

## Publication records

A publication record captures:

- Library ID and released version.
- Repository identity, owner, name, and URL.
- Exact source commit SHA.
- Optional Git tag and GitHub release.
- Publication timestamp, publisher, and artifact URL.
- Artifact integrity metadata.
- `immutable: true`.

Published versions are immutable. Correcting a release requires a new version. Repeated
publishing requests must be idempotent and must not create duplicate records.

## Development snapshots

Development snapshots record the library ID, branch, commit SHA, creation time, and
`kind: "development"`. They are distinguishable from stable releases and do not participate
in stable version resolution.

## Lifecycle

Deprecation, withdrawal, and compromised-release handling is recorded by registry metadata.
Published artifacts remain available even if the source repository is renamed, deleted, or
made inaccessible.

Schemas: `publicationRecordSchema`, `developmentSnapshotSchema`.
