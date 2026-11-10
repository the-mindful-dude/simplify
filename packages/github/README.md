# @simplify-dev/github

GitHub App authorization, repository association, webhooks, and publishing coordination.

## Responsibilities

- `authorization/` — GitHub App authentication, installation tokens, and permissions.
- `repositories/` — repository discovery, metadata synchronization, and library links.
- `webhooks/` — signature verification, idempotent event handling, and retries.
- `publishing/` — publishing pipeline coordination and provenance recording.

## Boundaries

- Depends on `@simplify-dev/registry` contracts only.
- Must not own or redefine the registry asset model.
- Must not expose installation tokens or credentials to browser clients or logs.
- Must not become a dependency of the core registry.

## Status

Foundation scaffold. GitHub integration contracts are not implemented yet.
