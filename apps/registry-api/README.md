# @simplify-dev/registry-api

Hosted registry API service. This service is the deployment target for hosted registry
operations such as GitHub webhook ingestion and publishing coordination.

## Boundaries

- Depends on `@simplify-dev/github` for GitHub App authentication and webhook handling.
- Must not import web application internals.
- Must not own the core asset model.
- Registry storage details remain behind client and resolver interfaces.

## Status

Provides hosted registry API endpoints, including GitHub webhook ingestion. Durable
storage and publishing coordination are introduced in later work.
