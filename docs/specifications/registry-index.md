# Registry Index

The registry index is a mutable discovery document. It is separate from immutable
versioned manifests and artifacts so each can be cached independently.

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-01-01T00:00:00.000Z",
  "assets": [
    {
      "id": "ui/button",
      "category": "ui",
      "name": "Button",
      "description": "Accessible button primitive.",
      "version": "1.0.0",
      "publisher": "simplify.dev",
      "status": "official",
      "targets": [{ "language": "typescript", "framework": "react" }]
    }
  ],
  "libraries": [
    {
      "id": "agent-chat",
      "name": "Agent Chat",
      "description": "Reusable agent conversation interfaces.",
      "version": "1.0.0",
      "publisher": "simplify.dev",
      "assets": ["blocks/agent-chat"]
    }
  ]
}
```

## Rules

- The index contains summaries for discovery only, never implementation files.
- An entry is not an installability guarantee: a versioned manifest and its declared
  source files must be checked separately.
- Pinned installations must not depend on the latest index remaining available.
- Index invalidation rules apply only to this mutable document, not to pinned versions.
- Published artifacts, when published, remain addressable by version without consulting
  the index.

## Installability

Source installation requires both a versioned manifest at
`registry/<category>/<name>/@<version>/asset.json` and every source file declared by
that manifest present in the same version directory. An index entry without either is
discoverable but not installable; a missing declared source file fails with
`SOURCE_NOT_FOUND`.

Currently only a subset of index entries has a versioned manifest, and the tracked
manifests declare source files that are absent. Those entries remain discoverable but
are not installable in source mode. Adding real source implementations is an approved
exception for a later asset-content phase (`I-F1.12`); until then, index presence must
not be treated as an installability guarantee.

Schema: `registryIndexSchema`. Validation: `validateRegistryIndex`.
