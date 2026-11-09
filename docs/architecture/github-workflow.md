# GitHub-First Library Workflow

Status: Initial Phase 1 decision. Source of truth: `docs/MODEL.md`.

## 1. Purpose

This document defines how libraries are created, maintained, validated, versioned, and
published through GitHub. It resolves `TODO.md` section 1.2.

## 2. Principles

- GitHub is the canonical source of library source code and history.
- simplify.dev owns registry metadata, discovery, validation, distribution, and
  installation.
- Developers must be able to continue using normal Git and GitHub workflows.
- The core registry and asset model must not depend on GitHub-specific concepts.
- Published versions must be immutable and reproducible.

## 3. Supported Library Creation Paths

### 3.1 Connect an Existing Repository

1. The developer installs or authorizes the simplify.dev GitHub App for selected
   repositories.
2. simplify.dev inspects the repository for `simplify/library.json` and asset manifests.
3. If a manifest exists, simplify.dev validates the library structure.
4. If no manifest exists, simplify.dev guides the developer through generating one without
   overwriting existing project files.
5. The developer configures library identity, description, license, maintainers, and
   assets.
6. The repository is associated with a simplify.dev library.
7. The repository remains the canonical source of the implementation.

### 3.2 Create a New Repository

1. The developer starts from simplify.dev and selects an authorized owner.
2. simplify.dev creates the repository through the GitHub App integration.
3. simplify.dev initializes the repository with the library structure, root manifest,
   README, contribution guidance, and an initial GitHub Actions workflow.
4. The repository is connected to the new library record.
5. Repository creation must be safely retryable without creating duplicate repositories or
   libraries.

## 4. Repository-to-Library Association

- A repository is identified by a stable repository identity, not only by owner/name.
- A repository must not be accidentally associated with conflicting library records.
- Owner/name changes, transfers, visibility changes, deletion, and permission revocation
  must be handled explicitly.
- Repository metadata is separate from immutable published-version records.
- Published versions must remain available when a repository becomes inaccessible.

## 5. Version Mapping

| GitHub concept | simplify.dev concept |
| --- | --- |
| Commit SHA | Exact source state for a snapshot or release. |
| Branch push | Development snapshot when branch synchronization is enabled. |
| Git tag, e.g. `v1.2.0` | Stable release candidate; must match the manifest version. |
| GitHub release | Stable release marker and release-notes source. |
| Pull request | Validation-only workflow; no publishing. |
| Manual workflow dispatch | Explicit validation, synchronization, or publication. |

Rules:

- The tag `v1.2.0` must correspond to manifest version `1.2.0`.
- A stable release must publish the exact commit associated with the tag or release.
- Ordinary pushes must never create or replace stable versions.
- Development snapshots must be distinguishable from stable releases and must not
  interfere with stable version resolution.
- Published versions are immutable. Corrections require a new version.

## 6. GitHub Actions as the Primary Automation Environment

GitHub Actions is the primary automated validation and publishing environment.

Required workflows:

- Pull request validation without publishing.
- Validation on selected branch pushes.
- Development snapshot synchronization.
- Stable release publishing from tags or GitHub releases.
- Manual workflow dispatch.

The workflow must:

- Use standard `actions/checkout`; do not implement a custom Git checkout engine.
- Use full history when tag or commit information is required.
- Install the simplify.dev CLI or publishing Action through a versioned, stable interface.
- Run without interactive prompts.
- Document required permissions and secrets.
- Be usable in repositories not created through simplify.dev.
- Fail clearly with actionable diagnostics.

Forked pull request workflows must not have access to publishing credentials and must not
publish stable or development versions.

## 7. Development Synchronization vs Stable Publishing

### 7.1 Development Synchronization

- Enabled per configured branch.
- Produces a snapshot associated with repository, branch, and exact commit SHA.
- Must be idempotent for repeated synchronization of the same commit.
- Must not replace or masquerade as a stable version.
- Can be disabled by the developer.

### 7.2 Stable Release Publishing

- Triggered by Git tag, GitHub release, or explicit manual publication.
- Validates the full library, all assets, dependencies, files, and version consistency.
- Builds an immutable publication artifact.
- Records repository identity, commit SHA, tag/release, version, timestamp, validation
  results, and artifact integrity.
- Prevents duplicate or conflicting releases.
- Supports deprecation or withdrawal of compromised or invalid releases.

## 8. Manual Triggers

Developers may manually trigger:

- Validation.
- Development synchronization.
- Stable publication.
- Retry of a failed operation.

Manual operations must use the same validation and publishing pipeline as automated ones
and must be safe to retry without creating duplicates.

## 9. GitHub App Role

The GitHub App is responsible for:

- GitHub account authorization.
- Repository discovery and selection.
- Repository-to-library association.
- Repository metadata synchronization.
- Commit, tag, and release tracking.
- Webhook event processing.
- Publishing workflow coordination.
- Installation token generation and expiration handling.
- Repository access and permission management.

The App must request only the minimum required permissions. Credentials and installation
tokens must never be exposed to browser clients or logs. Developers must be able to revoke
access through GitHub.

## 10. CLI Role

The CLI is responsible for local and CI workflows:

- Initializing and validating library projects.
- Creating assets and manifests.
- Building library artifacts.
- Publishing libraries when authorized.
- Inspecting library metadata.
- Running the same validation rules used by CI.

The CLI must not depend on the web application's internal code.

## 11. Fallback Publishing Without GitHub

GitHub is the primary and recommended path. A future fallback may support direct CLI
publishing or other Git hosting providers. Any fallback must use the same:

- Library manifest.
- Validation rules.
- Versioning model.
- Registry publishing contracts.

The registry's fundamental asset model must not require GitHub.

## 12. Security Requirements

- Treat repository contents and workflows as untrusted input.
- Never execute arbitrary repository code during registry ingestion.
- Verify webhook signatures and validate payloads.
- Store webhook delivery identifiers and make handlers idempotent.
- Handle retries and out-of-order delivery safely.
- Verify repository identity and source commit before accepting a publication.
- Restrict stable publishing to trusted tags, releases, or explicitly authorized workflows.
- Record publisher identity and provenance for auditing.
- Prevent unauthorized users from taking ownership of a library through repository changes.

## 13. Acceptance Criteria

- Both library creation paths are defined.
- Repository identity, association, and lifecycle handling are defined.
- Branch, commit, tag, and release mapping is explicit.
- GitHub Actions responsibilities and security boundaries are explicit.
- Development snapshots and stable releases are clearly separated.
- The GitHub App and CLI roles are explicit.
- A non-GitHub fallback path is possible without changing the core asset model.
