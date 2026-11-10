# Installation Metadata

Installation metadata describes how an asset is installed without executing arbitrary
registry-provided scripts.

## Modes

Each mode definition declares one of:

- `package` — install a published package.
- `source` — copy mapped source files into approved project paths.
- `hybrid` — combine source files and package dependencies.

A mode may declare `files`, `dependencies`, `environment`, `configuration`, and `setup`.

## Source mappings

```json
{
  "source": "src/button.tsx",
  "target": "src/components/ui/button.tsx"
}
```

Both paths must be relative and must not traverse outside the project. Target paths are
resolved against configured project paths during installation.

## Environment variables

Environment declarations describe names, purpose, required status, non-secret examples, and
whether a value is secret. Installers may add examples to `.env.example`; they must never
replace or expose real environment values.

## Configuration

Only declarative operations are supported: `merge` for structured configuration and
`append-example` for environment examples. Arbitrary executable installation scripts are
rejected by default.

## Runtime capabilities

Assets declare runtime requirements through implementation targets (`browser`, `server`,
`node`, `edge`) rather than assuming a single execution environment.

Schemas: `installationMetadataSchema`, `installationModeDefinitionSchema`,
`sourceMappingSchema`, `environmentVariableSchema`, `configurationChangeSchema`,
`setupStepSchema`.
