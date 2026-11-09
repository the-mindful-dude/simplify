# Schemas

Shared JSON schemas and generated TypeScript types.

```
schemas/
├── registry/
├── configuration/
├── assets/
└── libraries/
```

- Schemas have no runtime dependencies.
- Runtime validation uses these schemas at registry, CLI, GitHub, and configuration
  boundaries.
- Schema changes require compatibility tests and documentation updates.
- Published schemas and types are part of the public contract for asset authors.

## Status

Phase 2 placeholder. Schemas are implemented in Phase 3.
