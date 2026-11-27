# GitHub Integration Architecture

## Purpose

This document defines how simplify.dev connects to GitHub for library creation,
maintenance, validation, and publishing. GitHub remains the canonical source of
library implementation code and history; simplify.dev owns registry metadata,
discovery, validation, distribution, and installation.

## Responsibilities

- **GitHub App**: authenticates simplify.dev to GitHub, requests least-privilege
  repository permissions, generates short-lived installation tokens, and receives
  webhook events.
- **GitHub Actions workflow**: runs validation, development synchronization, and
  stable release publishing inside library repositories.
- **simplify.dev CLI**: performs local library development, validation, and
  installation; it never imports web application internals.
- **Registry API service**: hosts webhook ingestion and publishing coordination
  endpoints. It depends on registry and GitHub contracts only and does not own the
  core asset model.
- **Registry**: stores immutable publication records and metadata. It does not
  depend on GitHub-specific concepts.

## Repository identity

A repository is linked to a simplify.dev library through a stable repository
identity. Repository links track owner, name, URL, default branch, visibility,
library ID, and link status. A repository must not be linked to conflicting
library records, and a library must not be linked to multiple repositories.

## Events processed

The integration consumes GitHub webhook events for:

- pushes (development synchronization only; ordinary pushes never create stable
  releases),
- tag creation (stable release candidates),
- release publication (stable release candidates),
- repository rename, transfer, and deletion,
- GitHub App installation and permission changes.

Webhook signatures are verified, payloads are validated, deliveries are processed
idempotently, and retries or out-of-order delivery are handled safely.

## Publishing pipeline

Validation, build, and publishing requests from webhooks and GitHub Actions reach
the same pipeline. Stable publishing is restricted to trusted tags, releases, or
explicitly authorized workflows. Forked pull request workflows cannot access
publishing credentials.

## Extensibility

GitHub integration remains an adapter over registry contracts. The repository
association model is designed so additional Git hosting providers can be added
later without changing the core registry asset model.

## Security

- GitHub App credentials and private keys are stored outside the repository.
- Installation tokens are short-lived and never exposed to browser clients or
  logs.
- Publishing credentials are scoped and never committed to repositories.
- Repository lifecycle events never silently replace published versions.
