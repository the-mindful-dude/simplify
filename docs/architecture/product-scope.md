# Product Scope

Status: Approved. Source of truth: `docs/MODEL.md`.

## 1. Purpose

This document defines the initial product scope for simplify.dev. It establishes the
vocabulary used by the registry,
CLI, GitHub integration, and web application.

## 2. Asset Categories

simplify.dev distributes seven related categories:

| Category      | Responsibility                                                                   |
| ------------- | -------------------------------------------------------------------------------- |
| UI Components | Reusable visual primitives with accessible behavior and stable APIs.             |
| Blocks        | Functional interface compositions built from components and logic.               |
| Logic         | Framework-independent behavior and state management.                             |
| Integrations  | Adapters that connect assets to external services and technologies.              |
| Recipes       | Ready-to-configure combinations of existing assets.                              |
| Templates     | Application starting points composed from existing assets.                       |
| Libraries     | Distributable collections of related assets with their own identity and history. |

Categories are not interchangeable. An implementation must declare exactly one category.
A block must not be published as a component, and a recipe must not contain a duplicated
implementation of the assets it combines.

## 3. Asset vs Library

An **asset** is an independently installable implementation with a stable identity,
version, category, manifest, and file mappings.

A **library** is a distributable collection of related assets. A library has:

- A unique identity.
- A connected source repository.
- Its own version history.
- One or more assets.
- Metadata, documentation, and licensing.
- Declared dependencies and compatibility.
- A publishing configuration.

A library may contain multiple assets, and each asset must remain independently
identifiable and installable where appropriate. The registry must represent both
individual assets and multi-asset libraries.

## 4. Category Relationships

- A **block** may depend on one or more **logic** assets and one or more **UI components**.
- A **logic** asset must not depend on UI components or React rendering details.
- An **integration** implements a declared interface or adapter contract owned by a logic
  asset or block. The core implementation must not import the integration.
- A **recipe** composes existing assets and coordinates their installation. It must not
  duplicate their implementations.
- A **template** composes existing assets where possible and must not reimplement them.
- A **library** groups assets but does not change their individual identities.

Dependency direction is defined in `technical-standards.md`.

## 5. Installation Modes

| Mode    | What is installed                                                  | Where implementation lives                                         |
| ------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Package | A versioned package through the project's package manager.         | Inside the installed package; consumed through its public API.     |
| Source  | Versioned source files copied into the project.                    | Inside the consuming project; owned and editable by the developer. |
| Hybrid  | Source files plus declared package dependencies and configuration. | Source in the project, stable dependencies as packages.            |

Requirements:

- Assets declare which modes they support.
- The installer must not silently choose a mode that the asset does not support.
- Package installation must respect the detected package manager and lockfile.
- Source installation must track installed files, versions, and hashes.
- Hybrid installation must be the preferred mode for many functional blocks and
  integrations.
- Installation must never require copying every dependency into the project. Dependencies
  that are better maintained as packages remain external.

## 6. Initial Ecosystem

The initial supported ecosystem is:

- TypeScript
- React
- Next.js

The registry, manifest format, and installer must remain extensible to other languages and
frameworks. An asset may declare multiple implementation targets while retaining one
logical identity. TypeScript, React, and Next.js receive the earliest and deepest support.

## 7. Initial Validation Asset Set

The following assets validate the platform end to end:

1. UI primitives.
2. Agent Chat block.
3. Chat logic / controller.
4. Vercel AI SDK integration.
5. PostgreSQL conversation-storage integration.
6. Dashboard Shell block.

These assets must prove that simplify.dev can distribute complete, composable features
rather than only visual components.

## 8. Application-Owned Responsibilities

Unless an asset explicitly provides a configurable implementation, the consuming
application remains responsible for:

- Authentication.
- Authorization.
- User permissions.
- Credentials and secrets.
- Business rules.
- Database ownership.
- Deployment configuration.
- Application-specific persistence policies.
- Data protection and retention policies.

Integrations may make these responsibilities easier to implement, but they must not hide
or silently assume them.

## 9. Official vs External Assets

- **Official** assets are maintained by simplify.dev and may receive a verified status.
- **External** assets are published by independent developers and are treated as
  third-party code.
- A `reviewed` or `verified` status must only be assigned after an actual review process.
- A successful GitHub Actions run means validation and publishing completed; it does not
  imply trust or review.
- The web application must clearly distinguish official, community, verified, deprecated,
  and compromised assets.
- Every asset must declare publisher identity, license, and attribution.

## 10. simplify.dev and GitHub Boundary

GitHub manages source code, branches, commits, tags, releases, pull requests, reviews, and
GitHub Actions workflows.

simplify.dev manages:

- Registry metadata.
- Asset and library identity.
- Discovery.
- Validation.
- Immutable distribution artifacts.
- Installation.
- Installation tracking.

The registry must not depend on GitHub-specific concepts. GitHub is the primary and
recommended development environment, not a permanent architectural requirement.

## 11. Non-Goals

simplify.dev is not:

- Just a component library.
- A collection of static templates.
- A replacement for GitHub.
- A replacement for React, Next.js, or other ecosystems.
- A system that forces a single backend or application architecture.
- A runtime that every consuming application must load.

## 12. Acceptance Criteria

- Every category has a defined responsibility and required metadata.
- Asset and library identities are distinct and stable.
- Category dependency relationships are explicit.
- All three installation modes are defined, including where implementation lives.
- The initial ecosystem and validation asset set are fixed.
- Application-owned responsibilities are explicit.
- Official and external asset requirements are explicit.
- The GitHub boundary and GitHub-agnostic registry requirement are explicit.
