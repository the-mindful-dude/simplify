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
- Published versions are immutable and distributed from versioned artifacts, not from the
  current state of this directory.

## Status

Phase 2 placeholder. Official assets are introduced with their implementation phases.
