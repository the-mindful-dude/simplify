# Naming and Public Identifiers

Status: Initial Phase 1 decision. Source of truth: `docs/MODEL.md`.

## 1. Purpose

This document defines public and internal identifiers. It resolves `TODO.md` section 1.3.
Identifiers must remain stable even if product branding, registry URLs, or repository
locations change.

## 2. npm Package Scope

- Public packages use the `@simplify-dev` scope.
- Examples: `@simplify-dev/ui`, `@simplify-dev/blocks`, `@simplify-dev/tokens`,
  `@simplify-dev/registry`, `@simplify-dev/cli`.
- Workspace packages use the same scope as their published counterparts.

Availability check performed for Phase 1:

| Name | Result |
| --- | --- |
| `@simplify-dev/ui` | Available (registry returned 404 at check time). |
| `@simplify-dev/cli` | Available (registry returned 404 at check time). |
| `simplify` | Taken by an unrelated package; do not use as an npm package name. |

Availability must be re-checked immediately before the first public release.

## 3. CLI Executable

- The CLI executable name is `simplify`.
- It is provided by the `@simplify-dev/cli` package through its `bin` field.
- The executable name does not need to match an available npm package name.
- Internal code must not assume the executable is globally installed; tests and CI invoke
  the local binary.

## 4. Asset Identifiers

Asset IDs are stable, human-readable, and independent of the product name, package scope,
registry URL, or repository location.

Format:

```
<category>/<name>
```

Examples:

```
ui/button
blocks/agent-chat
logic/chat-controller
integrations/vercel-ai
integrations/postgres
recipes/agent-chat-postgres
templates/saas-dashboard
```

Rules:

- Category segments use the singular canonical category name: `ui`, `blocks`, `logic`,
  `integrations`, `recipes`, `templates`.
- Names use lowercase kebab-case.
- Names must not encode a version, publisher, or repository owner.
- An asset ID is immutable. Renaming requires a new asset ID and a deprecation path.
- Integration IDs may include a parent asset when the integration is specific to it, for
  example `integrations/agent-chat/vercel-ai`.

## 5. Library Identifiers

- Library IDs use lowercase kebab-case, for example `agent-chat`.
- Library IDs are globally unique within a registry.
- A library version is independent of its asset versions but must declare compatibility.
- A library references its source repository by stable repository identity plus owner,
  name, and URL metadata.

## 6. Package and Module Naming

| Kind | Convention | Example |
| --- | --- | --- |
| Workspace package | `@simplify-dev/<name>` | `@simplify-dev/registry` |
| Directory | kebab-case | `packages/registry`, `asset-validator` |
| TypeScript file | kebab-case | `chat-controller.ts` |
| React component file | kebab-case | `agent-chat.tsx` |
| Exported component | PascalCase | `AgentChat` |
| Function or variable | camelCase | `resolveDependencies` |
| Type or interface | PascalCase | `ChatTransport` |
| Constant | UPPER_SNAKE_CASE or camelCase for local values | `DEFAULT_REGISTRY_URL` |
| CSS module | `<component>.module.css` | `dialog.module.css` |
| Design token | `--sd-<role>` | `--sd-primary` |

Internal folders named `internal` are not exported. Package entry points are declared
explicitly in `exports`.

## 7. Registry URLs

Public registry URLs are versioned and stable:

```
https://simplify.dev/r/{assetId}.json
https://simplify.dev/r/{assetId}/{version}.json
https://simplify.dev/r/{libraryId}.json
https://simplify.dev/r/{libraryId}/{version}.json
```

- `{assetId}` contains a slash, which must be URL-encoded by clients.
- Pinned version URLs must remain available even if the latest index changes.
- Discovery indexes may be mutable; manifests and artifacts must be immutable.
- URL structure must not be hardcoded into asset manifests.

## 8. Configuration Identifiers

- Project configuration file: `simplify.config.json`.
- Local installation directory: `.simplify/`.
- Local lock file: `.simplify/lock.json`.
- Library manifest: `simplify/library.json`.
- Asset manifests: `simplify/assets/<category>/<name>.json`.

## 9. Branding Separation

The following must remain independently configurable:

- Product name and branding.
- npm package scope.
- CLI executable name.
- Registry hostname and URL paths.
- GitHub App name and identifiers.
- Internal package names and repository layout.

No asset ID, manifest field, or public contract may embed the product name in a way that
prevents rebranding or self-hosting.

## 10. Acceptance Criteria

- Package scope and CLI executable are fixed.
- npm availability checks are recorded.
- Asset, library, package, module, and token naming conventions are defined.
- Registry URL structure is defined and versioned.
- Configuration and manifest paths are defined.
- Branding, scope, CLI name, registry URL, and internal names remain separable.
