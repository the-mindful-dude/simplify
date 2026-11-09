# @simplify-dev/registry-api

Hosted registry service, reserved for when publishing, discovery, or access-control
requirements justify a dedicated service.

## Boundaries

- Depends on `@simplify-dev/registry` and `@simplify-dev/github`.
- Must not import web application internals.
- Must not own the core asset model.
- Registry storage details remain behind client and resolver interfaces.

## Status

Phase 2 placeholder. The service is introduced only when Phase 4/5 requirements justify it.
