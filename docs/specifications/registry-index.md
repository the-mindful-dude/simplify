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
- Pinned installations must not depend on the latest index remaining available.
- Index invalidation rules apply only to this mutable document, not to pinned versions.
- Published artifacts remain addressable by version without consulting the index.

Schema: `registryIndexSchema`. Validation: `validateRegistryIndex`.
