# @simplify-dev/github

GitHub App authorization, repository association, webhooks, and publishing coordination.

## Responsibilities

- `config.ts`, `auth.ts`, `oauth.ts` — GitHub App configuration, installation tokens,
  authorization, and OAuth helpers.
- `repositories.ts`, `metadata.ts` — repository discovery, library links, and metadata
  synchronization.
- `webhooks/` — signature verification and idempotent event handling.
- `publishing/` — publishing credentials, authentication, attempts, and provenance recording.
- `memory.ts` — in-memory repository, webhook delivery, and publishing stores for development
  and tests.

## Boundaries

- Depends on `@simplify-dev/registry` contracts only.
- Must not own or redefine the registry asset model.
- Must not expose installation tokens or credentials to browser clients or logs.
- Must not become a dependency of the core registry.

## Status

GitHub App configuration, authentication, OAuth helpers, repository discovery and links,
metadata synchronization, webhook signature/event handling, and publishing authentication,
attempt tracking, and provenance recording are implemented. Stores are in-memory; durable
storage and hosted registry submission are pending. See
[`docs/development/github-integration.md`](../../docs/development/github-integration.md) for
the end-to-end workflow and current limitations.
