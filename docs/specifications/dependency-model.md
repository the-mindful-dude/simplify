# Dependency Model

Assets and libraries may declare two dependency classes.

## Registry dependencies

Registry dependencies reference another simplify.dev asset by stable ID and version
constraint. They support optional dependencies and an optional reason. Circular graphs and
self-dependencies are invalid.

```json
{
  "registry": [
    { "id": "logic/chat-controller", "version": "^1.0.0" },
    { "id": "integrations/vercel-ai", "version": "^1.0.0", "optional": true }
  ]
}
```

## Package dependencies

Package dependencies reference external package-manager packages. Each entry declares a
kind: `runtime`, `peer`, `optional`, or `development`.

```json
{
  "packages": [{ "name": "ai", "version": "^4.0.0", "kind": "peer" }]
}
```

## Rules

- Version constraints must be explicit.
- Optional integrations and alternative implementations are represented as optional
  dependencies, not as hard requirements.
- Recipes declare their component assets through registry dependencies and must not copy
  their implementations.
- Conflict, missing-dependency, and circular-graph detection belongs to the resolver; the
  schemas reject malformed declarations at the boundary.

Schemas: `dependencySetSchema`, `registryDependencySchema`, `packageDependencySchema`.
