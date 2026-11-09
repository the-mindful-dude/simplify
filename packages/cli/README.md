# @simplify-dev/cli

The `simplify` command-line application.

## Responsibilities

- `commands/` — command parsing, help, output formatting, and command handlers.
- `detection/` — project root, language, framework, package manager, and monorepo detection.
- `installation/` — package, source, and hybrid installation.
- `dependency-resolution/` — asset, registry, and package dependency resolution.
- `updates/` — diff, update, conflict detection, and removal.

## Boundaries

- Depends on `@simplify-dev/registry` and `@simplify-dev/tooling`.
- Must not import web application internals or GitHub integration internals.
- Must work without a real terminal in tests and in CI.
- Must never expose secrets or overwrite user-modified files without consent.

## Status

Phase 2 placeholder. Commands are implemented from Phase 6 onward.
