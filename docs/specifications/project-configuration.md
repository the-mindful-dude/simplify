# Project Configuration

Consuming projects use `simplify.config.json`.

```json
{
  "schemaVersion": 1,
  "packageManager": "pnpm",
  "registry": {
    "url": "https://registry.simplify.dev"
  },
  "installation": {
    "defaultMode": "source",
    "paths": {
      "ui": "src/components/ui",
      "blocks": "src/components/blocks",
      "logic": "src/lib",
      "integrations": "src/integrations",
      "hooks": "src/hooks",
      "styles": "src/styles"
    }
  }
}
```

## Rules

- `schemaVersion` is required and currently fixed to `1`.
- Installation paths are required for every category.
- Supported package managers are `pnpm`, `npm`, `yarn`, and `bun`.
- Registry aliases map stable names to registry URLs.
- Monorepo projects may declare applications with a name, root, and optional source root.
- Invalid configuration is rejected with the file and field path.

Schema: `projectConfigurationSchema`. Validation: `validateProjectConfiguration`.
