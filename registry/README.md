# Registry Source

Canonical source layout for official simplify.dev assets.

```
registry/
├── ui/
├── blocks/
├── logic/
├── integrations/
├── recipes/
└── templates/
```

- Each category contains asset implementations and manifests.
- Asset IDs use `<category>/<name>` and are independent of this directory layout.
- The registry must understand assets through manifests, not file locations.
- Only the `source-v1` on-disk layout is defined:
  `registry/<category>/<name>/@<version>/asset.json`, with declared source files
  resolved relative to that version directory. Unknown layouts are rejected with
  `UNSUPPORTED_ARTIFACT_LAYOUT` (`packages/registry/src/artifact-resolver.ts`).
- Published versions are immutable and distributed from versioned artifacts, not from the
  current state of this directory. No published on-disk layout is defined here; see
  ADR-012 and `docs/architecture/naming-and-identifiers.md`.

## Installability

`registry/index.json` is a mutable discovery catalogue. An index entry is a summary;
it does not guarantee that a versioned manifest or implementation source exists. An
entry is installable in source mode only when it has a versioned manifest at
`registry/<category>/<name>/@<version>/asset.json` and every source file declared by
that manifest is present in the same version directory. A missing declared source file
fails source installation with `SOURCE_NOT_FOUND`.

The index currently contains 39 asset summaries but only 6 versioned manifests. Those
six manifests declare seven source files that are absent, so none of the indexed
entries is currently installable in source mode. Adding real source implementations is
an approved exception for a later asset-content phase (`I-F1.12`); until then, these
entries are discoverable but not installable.

## Status

Foundation scaffold. Official assets are not published yet.
