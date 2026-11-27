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

## Package

`@simplify-dev/schemas` exports the canonical JSON Schema definitions and TypeScript
contracts for assets, libraries, dependencies, installation metadata, repository
associations, publication records, project configuration, and registry indexes.

Runtime validation lives in `@simplify-dev/registry` and `@simplify-dev/tooling` so this
package remains free of runtime dependencies.
