# simplify.dev — Development TODO

This document defines the implementation roadmap for simplify.dev. Tasks are organized by dependency, from product and repository foundations through GitHub integration, registry infrastructure, CLI, library authoring and publishing, installation, design system, reusable assets, web application, and ecosystem expansion.

Tasks should be completed in order unless explicitly marked as independent. Each phase should produce working, tested deliverables before dependent phases begin.

GitHub is the primary environment for creating, maintaining, versioning, and publishing libraries. simplify.dev provides the registry, discovery, validation, distribution, and installation infrastructure around those repositories. The platform must not require developers to maintain their library source code exclusively through the simplify.dev website.

## Phase 1 — Product Scope and Technical Decisions

### 1.1 Define the Initial Product Scope

- [x] Define the initial asset categories: UI components, blocks, logic, integrations, recipes, templates, and libraries.
- [x] Define the distinction between an asset and a library. An asset is an independently installable implementation; a library is a distributable collection of related assets.
- [x] Define the relationship between blocks, logic, and integrations. Blocks may depend on logic, integrations may implement logic interfaces, and recipes may combine multiple assets.
- [x] Define the three installation modes: package, source, and hybrid. Specify exactly what each mode installs and where the implementation lives.
- [x] Define the initial supported ecosystem as TypeScript, React, and Next.js.
- [x] Keep the registry, asset specifications, and publishing architecture extensible for additional languages and frameworks.
- [x] Identify the initial asset set used to validate the platform: UI primitives, Agent Chat, Chat Logic, Vercel AI SDK Integration, PostgreSQL Storage Integration, and Dashboard Shell.
- [x] Define the responsibilities that remain with consuming applications, including authentication, authorization, credentials, business rules, and deployment.
- [x] Define the requirements for official assets versus externally published assets, including ownership, verification, and review status.
- [x] Define the boundary between simplify.dev and GitHub: GitHub manages source code and development history; simplify.dev manages registry metadata, discovery, validation, distribution, and installation.

### 1.2 Define the GitHub-First Library Workflow

- [x] Establish GitHub repositories as the canonical source of library implementation code.
- [x] Define the supported library creation paths: connecting an existing GitHub repository and creating a new repository through simplify.dev.
- [x] Define how a GitHub repository is associated with a simplify.dev library.
- [x] Define the relationship between a library, its repository, its assets, and its published versions.
- [x] Define how repository branches, commits, tags, and GitHub releases map to simplify.dev development snapshots and stable releases.
- [x] Establish GitHub Actions as the primary automated validation and publishing environment.
- [x] Define the distinction between development synchronization and stable release publishing.
- [x] Define how developers can manually trigger validation, synchronization, and publication.
- [x] Define the role of a GitHub App for repository authorization, repository discovery, and webhook events.
- [x] Define the role of the simplify.dev CLI in local library development and CI workflows.
- [x] Ensure developers can continue using their normal GitHub workflows without depending on the simplify.dev website to edit source code.
- [x] Define a fallback publishing path for libraries that are not connected to GitHub without making it the primary workflow.
- [x] Ensure the core registry and asset model do not depend on GitHub-specific concepts.

### 1.3 Establish Naming and Public Identifiers

- [x] Choose the public npm package scope and CLI executable name. Check their availability before publishing.
- [x] Define stable internal asset IDs that do not depend on the product name, package scope, or registry URL.
- [x] Establish naming conventions for packages, libraries, assets, integrations, recipes, and templates.
- [x] Define the public registry URL structure and versioned asset URL conventions.
- [x] Define stable identifiers for connected GitHub repositories and their associated libraries.
- [x] Keep product branding, package identifiers, registry identifiers, GitHub integration identifiers, and internal implementation names independently configurable.

### 1.4 Define Technical Standards

- [x] Choose TypeScript as the primary implementation language for platform services and tooling.
- [x] Choose pnpm workspaces for package management and define the monorepo build strategy.
- [x] Choose the build and task orchestration tools for development, testing, and publishing.
- [x] Define supported Node.js, TypeScript, React, and Next.js versions for the initial release.
- [x] Define coding conventions, module boundaries, error-handling patterns, and public API conventions.
- [x] Establish the initial testing strategy for packages, CLI operations, UI components, integrations, GitHub workflows, and the registry.
- [x] Define the minimum performance, accessibility, and security requirements for published assets.
- [x] Define how internal simplify.dev releases and externally published library releases will be versioned independently.

## Phase 2 — Repository and Development Foundation

### 2.1 Initialize the Monorepo

- [x] Create the simplify.dev GitHub repository.
- [x] Initialize the root `package.json` with workspace scripts and shared development dependencies.
- [x] Configure `pnpm-workspace.yaml`.
- [x] Configure the monorepo build orchestration and task dependencies.
- [x] Establish the initial directory structure for applications, packages, registry assets, schemas, and documentation.
- [x] Configure TypeScript project references or an appropriate shared TypeScript configuration.
- [x] Establish shared formatting, linting, and type-checking configurations.
- [x] Configure environment variable handling for local development, testing, and deployment.
- [x] Add `.gitignore` rules for generated files, local registry data, build outputs, and environment files.
- [x] Add root scripts for development, building, testing, linting, and type-checking.

### 2.2 Establish Development Infrastructure

- [x] Configure a consistent test runner and test utilities for packages.
- [x] Configure GitHub Actions for the simplify.dev repository's own CI workflow.
- [x] Run formatting, linting, type-checking, tests, and builds in CI.
- [x] Configure dependency installation and caching in CI.
- [x] Establish environment-specific configuration without committing secrets.
- [x] Configure branch protection and required status checks for the main development branch.
- [x] Add repository-level contribution guidelines and pull request templates.
- [x] Establish a release process for simplify.dev's own packages and CLI.
- [x] Document local development setup and the responsibilities of each workspace package.

### 2.3 Create Initial Workspace Boundaries

- [x] Create the initial `registry` package for registry contracts and asset resolution.
- [x] Create the initial `cli` package for the command-line application.
- [x] Create the `tokens` package for shared design-token definitions.
- [x] Create the `ui` package for React components.
- [x] Create the `interaction` package only for framework-independent feature logic that has a genuine reuse boundary.
- [x] Create the `blocks` package for reusable functional React compositions.
- [x] Create the `tooling` package for asset validation, library building, and preview utilities.
- [x] Create the `apps/web` application for the registry browser and documentation.
- [x] Create an `apps/registry-api` application only when hosted registry operations require a dedicated service.
- [x] Establish clear boundaries between GitHub integration, registry publishing, repository ingestion, and asset validation.
- [x] Avoid creating unused service boundaries or splitting every feature into a separate package prematurely.

## Phase 3 — Registry Specifications and Asset Schemas

### 3.1 Define the Registry Data Model

- [x] Define the registry's core asset identity model. Every asset must have a stable ID, category, name, version, and publisher.
- [x] Define the library model, including library identity, description, maintainers, assets, versions, and licensing.
- [x] Define the relationship between library versions and individual asset versions.
- [x] Define how a library references its canonical source repository.
- [x] Define the repository association model, including GitHub repository identity, owner, name, and URL.
- [x] Define how a published library version references its exact source commit and optional Git tag or GitHub release.
- [x] Define asset categories and validate that each category has the required metadata.
- [x] Define language, framework, runtime, and platform target descriptors.
- [x] Define compatibility requirements, including supported version ranges.
- [x] Define installation modes and their supported capabilities.
- [x] Define documentation, example, preview, and changelog references.
- [x] Define official, community, deprecated, and reviewed asset statuses.
- [x] Define metadata schema versioning and backward-compatibility rules.
- [x] Ensure the registry can represent multiple implementations of one logical asset.

### 3.2 Define Dependency Specifications

- [x] Define registry dependencies for assets that require other simplify.dev assets.
- [x] Define package dependencies for external package-manager dependencies.
- [x] Define peer dependencies and optional dependencies.
- [x] Support version constraints for registry and package dependencies.
- [x] Define dependency compatibility rules across language and framework targets.
- [x] Define conflict detection for assets requiring incompatible dependency versions.
- [x] Define circular dependency detection and reject invalid dependency graphs.
- [x] Define how optional integrations and alternative implementations are represented.
- [x] Define how recipes declare and resolve their component assets without duplicating them.

### 3.3 Define Installation and Configuration Metadata

- [x] Define source-to-target file mappings for source installations.
- [x] Define package installation metadata for package-based assets.
- [x] Define generated configuration files and supported configuration transformations.
- [x] Define environment-variable declarations, including descriptions, required status, and example values.
- [x] Define database migration and schema references without allowing silent destructive database operations.
- [x] Define setup instructions and post-installation requirements as declarative metadata.
- [x] Reject arbitrary registry-provided executable installation scripts by default.
- [x] Define how assets declare required runtime capabilities, such as browser, Node.js, server, or edge execution.

### 3.4 Define Library and Repository Manifests

- [x] Define the root `library.json` manifest schema.
- [x] Define the asset manifest schema for each initial asset category.
- [x] Define how a library manifest references its asset manifests.
- [x] Define how manifests map asset implementation files to their repository locations.
- [x] Define how libraries declare their package dependencies and registry dependencies.
- [x] Define how library versions are represented and validated.
- [x] Define how the publishing configuration controls included and excluded files.
- [x] Define default exclusions for secrets, environment files, Git internals, dependencies, and generated build outputs.
- [x] Define how documentation, examples, previews, and changelogs are referenced.
- [x] Define how the schema supports monorepositories containing multiple assets.
- [x] Keep the manifest independent of any specific repository directory layout.
- [x] Define how future multi-repository libraries could be represented without requiring that capability in the initial implementation.

### 3.5 Define Versioning and Publication Contracts

- [x] Define Semantic Versioning requirements for stable library releases.
- [x] Define the relationship between Git tags and library manifest versions.
- [x] Define development snapshot identifiers using branch and commit information.
- [x] Define immutable publication records.
- [x] Define how a published version records its source commit SHA.
- [x] Define how a library can publish a new version without modifying an existing version.
- [x] Define deprecation, withdrawal, and compromised-release procedures.
- [x] Define how registry metadata distinguishes stable releases from development snapshots.
- [x] Define idempotency rules for repeated publishing requests.

### 3.6 Implement Schema Validation

- [x] Implement schemas for library manifests, asset manifests, project configuration, and installation metadata.
- [x] Add runtime validation for registry responses and configuration files.
- [x] Add validation for asset IDs, package identifiers, versions, paths, and dependency declarations.
- [x] Validate that referenced files and documentation resources exist.
- [x] Validate that each installation mode has the metadata necessary to execute it safely.
- [x] Validate repository publishing configuration and file inclusion rules.
- [x] Add schema tests using valid and invalid manifests.
- [x] Add schema compatibility tests to prevent accidental breaking changes.
- [x] Publish schema documentation and TypeScript types for asset authors.

## Phase 4 — GitHub Integration Foundation

### 4.1 Design the GitHub Integration Architecture

- [x] Define the responsibilities of the GitHub App, GitHub Actions workflow, simplify.dev CLI, and registry publishing service.
- [x] Establish GitHub as the authoritative source for connected library source code and Git history.
- [x] Define how simplify.dev identifies a repository independently of its current owner or name.
- [x] Define how a repository is linked to a library.
- [x] Define how repository renames, transfers, deletion, and access revocation are handled.
- [x] Define the GitHub events simplify.dev needs to process.
- [x] Define how webhook events and GitHub Actions publication requests reach the same publishing pipeline.
- [x] Ensure GitHub integration does not become a dependency of the core registry asset model.
- [x] Define how the integration can support additional Git hosting providers in the future.

### 4.2 Register and Configure the GitHub App

- [x] Create the simplify.dev GitHub App.
- [x] Define the minimum required repository permissions.
- [x] Request only the permissions required for repository metadata, contents, webhook events, and publishing-related workflows.
- [x] Configure installation and callback URLs.
- [x] Configure webhook endpoints and event subscriptions.
- [x] Implement secure GitHub App authentication.
- [x] Implement installation token generation and expiration handling.
- [x] Store GitHub App credentials securely.
- [x] Ensure credentials are never exposed to browser clients.
- [x] Implement GitHub App installation verification.
- [x] Implement GitHub App disconnection and permission-revocation handling.
- [x] Document the requested permissions and why they are necessary.

### 4.3 Implement GitHub Account and Repository Connections

- [x] Implement GitHub account connection from simplify.dev.
- [x] Implement GitHub App installation status retrieval.
- [x] Retrieve repositories accessible to the installation.
- [x] Implement repository selection.
- [x] Retrieve repository identity, owner, name, visibility, default branch, and URL.
- [x] Implement repository-to-library association.
- [x] Prevent one repository from being accidentally linked to conflicting library records.
- [x] Display connected repository information in the simplify.dev account and library management interfaces.
- [x] Implement repository disconnection.
- [x] Handle repository permission changes and revoked installations.
- [x] Implement clear error states for inaccessible, deleted, renamed, or transferred repositories.

### 4.4 Implement Repository Metadata Synchronization

- [x] Define the repository metadata stored by simplify.dev.
- [x] Implement repository metadata retrieval.
- [x] Track the repository's default branch.
- [x] Track the latest observed commit SHA.
- [x] Track repository visibility and access status.
- [x] Track repository URL and owner/name changes.
- [x] Implement metadata synchronization after relevant webhook events.
- [x] Implement manual metadata refresh.
- [x] Ensure repeated synchronization does not create duplicate records.
- [x] Keep repository metadata separate from immutable published-version records.

### 4.5 Implement Webhook Infrastructure

- [x] Implement a webhook endpoint for GitHub events.
- [x] Verify webhook signatures.
- [x] Validate event payloads before processing.
- [x] Store webhook delivery identifiers to prevent duplicate processing.
- [x] Implement idempotent webhook handlers.
- [x] Handle retries and out-of-order event delivery.
- [x] Process push events.
- [x] Process tag creation events.
- [x] Process GitHub release publication events.
- [x] Process repository rename and transfer events.
- [x] Process repository deletion events.
- [x] Process GitHub App installation and permission changes.
- [x] Record webhook processing status and failures.
- [x] Implement safe retry and recovery mechanisms.
- [x] Ensure webhook processing never turns an ordinary push into an unintended stable release.

## Phase 5 — Registry Storage and Dependency Resolution

### 5.1 Implement the Initial Registry

- [x] Define a canonical source layout for official registry assets.
- [x] Implement registry metadata loading and validation.
- [x] Implement asset lookup by stable ID and version.
- [x] Implement library lookup and asset enumeration.
- [x] Implement registry indexing by category, language, framework, and publisher.
- [x] Implement immutable versioned asset metadata and source references.
- [x] Implement retrieval of asset files and associated documentation.
- [x] Implement storage for immutable published artifacts or source snapshots.
- [x] Associate each published artifact with its repository identity and source commit SHA.
- [x] Implement a registry client API that can be used by the CLI and web application.
- [x] Separate registry storage details from the client and resolver interfaces so the storage backend can change later.
- [x] Start with a static, versioned registry distribution where practical.
- [x] Add dynamic hosted registry services when publishing, discovery, or access-control requirements justify them.

### 5.2 Implement Dependency Resolution

- [x] Resolve an asset's complete registry dependency graph.
- [x] Resolve compatible asset versions based on the consuming project's target environment.
- [x] Resolve package dependencies and their version constraints.
- [x] Detect missing dependencies and incompatible versions.
- [x] Detect circular dependencies.
- [x] Detect duplicate assets and conflicting file targets.
- [x] Support optional dependencies and alternative integrations.
- [x] Resolve recipe dependencies into a single installation plan.
- [x] Preserve explicit version selections and produce deterministic resolution results.
- [x] Add tests for nested dependencies, conflicting versions, missing assets, and alternative integrations.

### 5.3 Define Registry Distribution and Caching

- [x] Define a versioned URL convention for metadata and source files.
- [x] Separate registry indexes, manifests, and file artifacts so they can be cached independently.
- [x] Add content hashes or equivalent integrity metadata for distributed files.
- [x] Add caching rules for immutable asset versions.
- [x] Define registry cache invalidation for mutable discovery indexes.
- [x] Ensure installations of pinned versions do not depend on the latest registry index remaining available.
- [x] Ensure published artifacts remain available even if the original GitHub repository changes or becomes inaccessible.
- [x] Treat stored artifacts as distribution snapshots, not as the canonical source repository.

## Phase 6 — CLI Foundation and Project Detection

### 6.1 Build the CLI Application

- [x] Create the CLI executable and configure its public command name.
- [x] Implement command parsing, options, help output, and version output.
- [x] Establish consistent output formatting for success, warnings, errors, and installation summaries.
- [x] Implement structured error types and meaningful error messages.
- [x] Add interactive prompts only where user decisions are necessary.
- [x] Support non-interactive execution for CI and scripted workflows.
- [x] Add verbose and debug modes without exposing secrets.
- [x] Ensure CLI commands can be tested without launching a real terminal.
- [x] Ensure commands can run locally and inside GitHub Actions.
- [x] Support machine-readable output for automation where appropriate.

### 6.2 Implement Project Detection

- [x] Detect the current project root and verify that it is a valid project directory.
- [x] Detect TypeScript and JavaScript projects.
- [x] Detect React and Next.js applications.
- [x] Identify package managers from lockfiles and project metadata.
- [x] Detect installed framework and runtime versions.
- [x] Detect common source directories and application roots.
- [x] Read TypeScript configuration and identify import aliases.
- [x] Detect monorepo workspaces and identify the appropriate target application.
- [x] Detect whether the project uses an existing simplify.dev configuration.
- [x] Report unsupported or ambiguous project configurations instead of silently making assumptions.

### 6.3 Implement Project Configuration

- [x] Define the `simplify.config.json` schema.
- [x] Implement the `simplify init` command.
- [x] Generate a minimal configuration using detected project information.
- [x] Support configurable asset paths for UI, blocks, logic, integrations, hooks, and styles.
- [x] Support package-manager selection and automatic detection.
- [x] Support default installation modes and optional per-category overrides.
- [x] Support custom registries and registry aliases.
- [x] Validate configuration when loading it.
- [x] Support configuration overrides for monorepo applications and custom source roots.
- [x] Provide useful configuration errors with file and field references.

## Phase 7 — Library Authoring and Local Development

### 7.1 Implement Library Scaffolding

- [ ] Implement `simplify library init`.
- [ ] Generate a valid library manifest and initial directory structure.
- [ ] Support library metadata, maintainer information, and license selection.
- [ ] Support libraries containing multiple asset categories.
- [ ] Generate examples and documentation scaffolding.
- [ ] Provide a minimal asset authoring example for each supported initial category.
- [ ] Allow developers to initialize a library inside an existing repository without replacing its existing files.
- [ ] Support initializing a new repository-ready library structure.
- [ ] Ensure generated files are compatible with the GitHub-first publishing workflow.
- [ ] Include a README explaining the library structure and development workflow.

### 7.2 Implement Asset Creation

- [ ] Implement `simplify asset create`.
- [ ] Allow authors to select the asset category.
- [ ] Generate the appropriate manifest structure.
- [ ] Generate implementation, test, documentation, and example directories where applicable.
- [ ] Support language and framework target declarations.
- [ ] Support installation-mode declarations.
- [ ] Support registry and package dependencies.
- [ ] Support preview metadata for compatible UI assets.
- [ ] Allow assets to be added to an existing library.
- [ ] Ensure adding an asset does not require changes to the registry implementation.

### 7.3 Implement Asset Validation

- [ ] Implement `simplify asset validate`.
- [ ] Validate manifest schemas and required metadata.
- [ ] Verify referenced files and source mappings.
- [ ] Validate dependency declarations and target compatibility.
- [ ] Check for unsafe paths and unsupported installation instructions.
- [ ] Verify that declared package dependencies are used or justified.
- [ ] Check that required documentation and tests exist.
- [ ] Validate library-level and asset-level version consistency.
- [ ] Provide actionable validation errors with file paths and manifest field references.
- [ ] Support validation of an individual asset or an entire library.
- [ ] Ensure validation can run locally and in CI without publishing anything.

### 7.4 Implement Library Building

- [ ] Implement `simplify library build`.
- [ ] Collect the library manifest and referenced asset manifests.
- [ ] Resolve the files required by each published asset.
- [ ] Apply include and exclude rules.
- [ ] Exclude secrets, environment files, Git internals, dependencies, and unwanted build outputs.
- [ ] Produce versioned registry metadata and distributable artifacts.
- [ ] Generate integrity hashes for files and built artifacts.
- [ ] Record the source commit SHA when available.
- [ ] Verify that the generated artifacts can be consumed by the registry client and CLI.
- [ ] Ensure builds are deterministic for the same source revision and configuration.
- [ ] Keep building separate from publishing so authors can inspect artifacts before release.

## Phase 8 — GitHub-First Library Creation and Publishing

### 8.1 Implement Library Creation from an Existing Repository

- [ ] Allow a developer to connect an existing GitHub repository to simplify.dev.
- [ ] Inspect the repository for an existing `simplify/library.json` manifest.
- [ ] Detect whether the repository already contains simplify.dev asset manifests.
- [ ] Validate the existing library structure when a manifest is found.
- [ ] Provide a guided setup when the repository does not yet contain a library manifest.
- [ ] Generate the required manifest and scaffolding without overwriting existing project files.
- [ ] Allow the developer to configure library identity, description, license, maintainers, and assets.
- [ ] Preserve the existing repository structure wherever possible.
- [ ] Associate the repository with the newly created simplify.dev library.
- [ ] Display the repository connection and initial validation status.
- [ ] Ensure the repository remains the canonical source of the library implementation.

### 8.2 Implement Library Creation with a New GitHub Repository

- [ ] Allow a developer to begin library creation from simplify.dev.
- [ ] Retrieve the GitHub organizations and accounts where the user can create repositories.
- [ ] Allow the developer to select the repository owner.
- [ ] Allow the developer to configure repository name, description, and visibility.
- [ ] Create the repository through the authorized GitHub App integration.
- [ ] Initialize the repository with the simplify.dev library structure.
- [ ] Include a root library manifest and initial asset structure.
- [ ] Include a README and contribution guidance.
- [ ] Include an initial GitHub Actions workflow.
- [ ] Connect the new repository to the simplify.dev library record.
- [ ] Display the repository URL and next steps.
- [ ] Ensure repository creation can be retried safely without creating duplicate libraries or repositories.

### 8.3 Implement GitHub Actions Workflow Generation

- [ ] Define the recommended GitHub Actions workflow for simplify.dev libraries.
- [ ] Generate or provide a copyable workflow file during library setup.
- [ ] Support standard `actions/checkout` rather than implementing a custom Git checkout engine.
- [ ] Use a full Git checkout when tag or history information is required.
- [ ] Define the supported Node.js and package-manager setup steps for the initial ecosystem.
- [ ] Define how the simplify.dev CLI or publishing Action is installed in CI.
- [ ] Define the workflow command for validating a library.
- [ ] Define the workflow command for building a library.
- [ ] Define the workflow command for publishing a library.
- [ ] Support manual workflow dispatch.
- [ ] Ensure the workflow can run without interactive prompts.
- [ ] Document all required workflow permissions and secrets.
- [ ] Keep the workflow interface stable and versioned.
- [ ] Make the workflow usable in repositories that were not created through simplify.dev.

### 8.4 Implement Pull Request Validation

- [ ] Support validation on pull requests.
- [ ] Run manifest validation and asset validation without publishing a release.
- [ ] Verify referenced files and dependency declarations.
- [ ] Run relevant library tests where configured.
- [ ] Report validation results as GitHub Actions checks.
- [ ] Provide actionable failure messages.
- [ ] Ensure pull request validation uses read-only permissions where possible.
- [ ] Ensure workflows triggered by forked pull requests cannot access publishing credentials.
- [ ] Avoid publishing stable or development versions from untrusted pull request workflows.

### 8.5 Implement Development Synchronization

- [ ] Define the development synchronization strategy for connected repositories.
- [ ] Allow selected branches to synchronize development snapshots.
- [ ] Associate each snapshot with its repository, branch, and exact commit SHA.
- [ ] Distinguish development snapshots from stable releases.
- [ ] Ensure ordinary pushes never silently create or replace stable versions.
- [ ] Support configurable branch synchronization.
- [ ] Allow developers to disable automatic development synchronization.
- [ ] Make repeated synchronization of the same commit idempotent.
- [ ] Provide a manual synchronization command or workflow dispatch option.
- [ ] Display the latest synchronized commit and synchronization status.
- [ ] Ensure development snapshots do not interfere with stable version resolution.

### 8.6 Implement Stable Release Publishing

- [ ] Support publishing from Git tags and GitHub releases.
- [ ] Establish a default tag convention such as `v1.2.0`.
- [ ] Validate the Git tag against the version in the library manifest.
- [ ] Ensure the workflow publishes the exact commit associated with the tag.
- [ ] Validate the complete library and all referenced assets before publication.
- [ ] Build an immutable publication artifact.
- [ ] Submit the artifact and metadata to simplify.dev.
- [ ] Store the repository identity, commit SHA, tag, release information, and publication timestamp.
- [ ] Wait for registry validation and publication results.
- [ ] Report the published library version and registry URL to GitHub Actions.
- [ ] Prevent duplicate or conflicting stable releases.
- [ ] Reject attempts to silently replace an already published version.
- [ ] Require a new version when correcting a published release.
- [ ] Support deprecation or withdrawal of compromised or invalid releases.

### 8.7 Implement Publishing Authentication

- [ ] Define the authentication contract between GitHub Actions and simplify.dev.
- [ ] Prefer short-lived GitHub App installation tokens or a secure token-exchange mechanism where practical.
- [ ] Support a scoped simplify.dev publishing token as an initial fallback if necessary.
- [ ] Store publishing credentials as GitHub Actions secrets when long-lived credentials are used.
- [ ] Ensure publishing credentials are never committed to repositories.
- [ ] Ensure credentials are not exposed in workflow logs.
- [ ] Scope credentials to the relevant library or publisher where possible.
- [ ] Support token revocation and rotation.
- [ ] Reject unauthorized repository-to-library publishing attempts.
- [ ] Record the authenticated publisher and repository for each publication.
- [ ] Use least-privilege permissions for publishing workflows.

### 8.8 Implement Publishing and Synchronization Status

- [ ] Record each validation, synchronization, build, and publishing attempt.
- [ ] Associate each attempt with its GitHub workflow run where available.
- [ ] Record the triggering event, branch, commit SHA, tag, and intended version.
- [ ] Track pending, running, successful, and failed states.
- [ ] Store validation results and actionable failure details.
- [ ] Implement safe retries for failed operations.
- [ ] Ensure retries do not create duplicate versions or artifacts.
- [ ] Display the latest publishing status in the library management interface.
- [ ] Link to the corresponding GitHub Actions workflow run.
- [ ] Support manual retry and manual synchronization from simplify.dev.

### 8.9 Implement Repository Lifecycle Handling

- [ ] Handle GitHub repository renames.
- [ ] Handle repository transfers between owners or organizations.
- [ ] Handle repository visibility changes.
- [ ] Handle repository deletion.
- [ ] Handle GitHub App uninstallation.
- [ ] Handle revoked or reduced repository permissions.
- [ ] Preserve existing published versions when a repository becomes unavailable.
- [ ] Mark repository synchronization as unavailable when access is revoked.
- [ ] Allow authorized maintainers to reconnect a repository.
- [ ] Prevent repository lifecycle events from silently changing published library contents.

### 8.10 Implement GitHub Integration Documentation

- [ ] Document how to connect a GitHub account.
- [ ] Document how to install and authorize the GitHub App.
- [ ] Document how to connect an existing repository.
- [ ] Document how to create a new library repository.
- [ ] Document the expected repository structure and manifests.
- [ ] Document the generated GitHub Actions workflow.
- [ ] Document pull request validation.
- [ ] Document development synchronization.
- [ ] Document stable release publishing through tags and GitHub releases.
- [ ] Document publishing authentication and secret configuration.
- [ ] Document common workflow failures and recovery steps.
- [ ] Document how to disconnect or reconnect a repository.

## Phase 9 — Installation Engine

### 9.1 Implement Installation Planning

- [ ] Accept an asset ID and resolve its metadata and dependencies.
- [ ] Select a compatible implementation for the detected project.
- [ ] Determine the installation mode from explicit options, asset capabilities, and project configuration.
- [ ] Calculate all source files to create or modify.
- [ ] Calculate all package dependencies to install.
- [ ] Calculate configuration, environment, and setup changes.
- [ ] Detect existing files and potential conflicts before making changes.
- [ ] Generate a complete installation plan.
- [ ] Implement a dry-run mode that displays the plan without modifying the project.
- [ ] Display a clear summary of the files, dependencies, and configuration changes before installation.

### 9.2 Implement Package Installation

- [ ] Implement package installation for supported package managers.
- [ ] Install the selected package and version.
- [ ] Respect the detected package manager and existing lockfile.
- [ ] Avoid installing optional dependencies that are not required by the selected asset.
- [ ] Handle package-manager errors and interrupted installations.
- [ ] Verify the resulting dependency state.
- [ ] Record package-based installations in simplify.dev metadata where tracking is required.

### 9.3 Implement Source Installation

- [ ] Retrieve versioned asset files from the registry.
- [ ] Map registry source paths to configured project paths.
- [ ] Create required directories.
- [ ] Copy files while preserving appropriate file names and extensions.
- [ ] Resolve import references and path aliases where required by the asset definition.
- [ ] Detect existing files before writing.
- [ ] Support explicit conflict policies such as reject, skip, or replace.
- [ ] Never replace modified files without an explicit user decision.
- [ ] Verify that all required files were installed.
- [ ] Record installed source files and their original versions.

### 9.4 Implement Hybrid Installation

- [ ] Combine source and package installation plans.
- [ ] Install source files and declared package dependencies as one coordinated operation.
- [ ] Apply supported configuration changes.
- [ ] Add documented environment-variable examples to `.env.example` without exposing or replacing actual secrets.
- [ ] Report required manual setup steps.
- [ ] Verify the resulting installation.
- [ ] Ensure failure in one installation step does not leave the project in an inconsistent state.
- [ ] Provide rollback for installer-managed changes where possible.

### 9.5 Implement Safe File and Configuration Operations

- [ ] Use temporary files or equivalent safe-write mechanisms when applying changes.
- [ ] Back up existing files before permitted replacement operations.
- [ ] Implement rollback for failed multi-file operations.
- [ ] Restrict asset target paths to approved project directories.
- [ ] Prevent path traversal and attempts to write outside the project root.
- [ ] Apply only supported declarative configuration changes.
- [ ] Preserve comments and unrelated settings where practical.
- [ ] Report changes that require manual intervention instead of guessing.
- [ ] Add tests for conflicts, permissions, interruptions, rollback, and path safety.

### 9.6 Implement Initial CLI Commands

- [ ] Implement `simplify add` for individual assets and recipes.
- [ ] Implement `simplify info` to inspect asset metadata and requirements.
- [ ] Implement `simplify list` to display installed assets.
- [ ] Implement `simplify doctor` to validate project configuration and installed assets.
- [ ] Implement installation options for mode, version, target path, and dry run.
- [ ] Add command tests covering successful and failed installation scenarios.

## Phase 10 — Installation Tracking and Maintenance

### 10.1 Implement Local Installation Metadata

- [ ] Establish the `.simplify/` directory.
- [ ] Define the local lock-file schema.
- [ ] Record asset IDs, versions, installation modes, and resolved dependencies.
- [ ] Record installed file paths and their original content hashes.
- [ ] Record package dependencies introduced by source or hybrid installations.
- [ ] Record relevant configuration modifications.
- [ ] Ensure the lock file can reproduce the resolved installation state.
- [ ] Keep generated installation metadata separate from the registry's source manifests.

### 10.2 Implement Asset Inspection and Comparison

- [ ] Implement `simplify list` with asset version and installation-mode details.
- [ ] Implement `simplify info` for installed and available assets.
- [ ] Implement `simplify diff` to compare installed source with the selected registry version.
- [ ] Detect modified, deleted, and newly added files.
- [ ] Display package and registry dependency changes.
- [ ] Report breaking or potentially conflicting changes.
- [ ] Provide an option to inspect individual registry files before updating.

### 10.3 Implement Updates

- [ ] Implement version selection and update planning.
- [ ] Compare installed assets with available registry versions.
- [ ] Detect user modifications before applying updates.
- [ ] Identify files that can be updated safely and files that require manual review.
- [ ] Implement three-way merge support for source files where practical.
- [ ] Preserve user changes during updates.
- [ ] Update dependency metadata and lock information.
- [ ] Support rollback to a previously installed version where possible.
- [ ] Test updates across unchanged, modified, removed, and conflicting files.

### 10.4 Implement Removal

- [ ] Implement `simplify remove` for installed assets.
- [ ] Identify files owned by the selected asset.
- [ ] Check whether other installed assets depend on the selected asset.
- [ ] Preserve files modified by the developer unless explicitly instructed otherwise.
- [ ] Remove dependencies only when they are no longer required by other tracked assets.
- [ ] Update the lock file and installation metadata.
- [ ] Display the removal plan before applying destructive changes.

## Phase 11 — Design Tokens and Theme Infrastructure

### 11.1 Define the Token Model

- [ ] Define a framework-independent token schema.
- [ ] Establish semantic color roles for primary, secondary, accent, background, foreground, muted, surfaces, borders, focus, and status colors.
- [ ] Define typography tokens, including font families, sizes, weights, line heights, and letter spacing.
- [ ] Define spacing and sizing scales.
- [ ] Define border-radius tokens.
- [ ] Define shadow and elevation tokens.
- [ ] Define motion tokens, including durations and easing curves.
- [ ] Define density and component-sizing conventions.
- [ ] Define light and dark theme structures.
- [ ] Establish naming conventions that remain stable across generated outputs.
- [ ] Keep brand-specific values separate from semantic token roles.

### 11.2 Implement Token Generation

- [ ] Create the canonical token source.
- [ ] Implement token schema validation.
- [ ] Generate CSS custom properties.
- [ ] Generate JSON token exports.
- [ ] Generate TypeScript token types and definitions.
- [ ] Design the generator interface to support future output formats, including Avalonia resources.
- [ ] Generate light and dark theme outputs.
- [ ] Add checks to ensure generated files are reproducible from the canonical source.
- [ ] Publish the token package with stable exports.

### 11.3 Implement Runtime Theme Support

- [ ] Define the CSS custom-property contract used by UI components.
- [ ] Implement theme selection through supported root attributes or classes.
- [ ] Support light, dark, and custom themes.
- [ ] Support theme overrides without requiring a global React provider.
- [ ] Define how nested theme scopes behave.
- [ ] Ensure token changes affect compatible components and blocks consistently.
- [ ] Add contrast validation for text, surfaces, borders, and focus indicators.
- [ ] Test theme inheritance and overrides.

## Phase 12 — Core React UI Package

### 12.1 Establish the UI Package

- [ ] Configure the package's public name and exports.
- [ ] Define supported React and React DOM peer dependencies.
- [ ] Choose one primary headless foundation for the initial component set.
- [ ] Avoid overlapping headless libraries that duplicate the same component responsibilities.
- [ ] Configure JavaScript and TypeScript declaration builds.
- [ ] Configure CSS output and the `styles.css` package export.
- [ ] Define package-level dependency and externalization rules.
- [ ] Preserve appropriate React server and client boundaries.
- [ ] Verify package installation in a separate Next.js project.

### 12.2 Establish Component Conventions

- [ ] Define naming and export conventions for components and compound components.
- [ ] Standardize prop casing and naming.
- [ ] Define consistent variant, size, radius, and state APIs.
- [ ] Define `className`, slot styling, `slotProps`, and `slots` conventions.
- [ ] Define controlled and uncontrolled state conventions.
- [ ] Define component composition and accessibility requirements.
- [ ] Establish a consistent pattern for internal types, styling, hooks, and utilities.
- [ ] Define which APIs are public and which remain internal.

### 12.3 Implement Foundational Components

- [ ] Implement Button with variants, sizes, loading state, disabled state, and icon support.
- [ ] Implement Text and typography primitives.
- [ ] Implement Input, Textarea, and other basic field controls.
- [ ] Implement Label, Description, Helper Text, and error-message components.
- [ ] Implement Select and related selection controls.
- [ ] Implement Checkbox, Radio Group, and Switch.
- [ ] Implement Tooltip.
- [ ] Implement Separator and basic surface components.
- [ ] Implement Stack, Grid, Container, and other necessary layout primitives.
- [ ] Implement Scroll Area with deliberate overflow and scrolling behaviour.
- [ ] Ensure all primitives use shared design tokens and consistent styling APIs.

### 12.4 Implement Compound and Interactive Components

- [ ] Implement Dialog with accessible title, description, focus management, portals, and close behaviour.
- [ ] Implement Drawer with responsive placement and size options.
- [ ] Implement Dropdown Menu with keyboard navigation and accessible item behaviour.
- [ ] Implement Tabs with appropriate controlled and uncontrolled state.
- [ ] Implement Popover and related overlay components.
- [ ] Implement Field composition with labels, controls, descriptions, errors, and responsive layouts.
- [ ] Implement the remaining components based on actual reusable requirements.
- [ ] Ensure compound components provide consistent default styling and predictable composition.

### 12.5 Implement UI Customization

- [ ] Apply semantic tokens throughout the component package.
- [ ] Implement variants and sizes through shared style definitions.
- [ ] Implement root-level class overrides.
- [ ] Implement documented slot-level style overrides.
- [ ] Implement `slotProps` for supported internal elements.
- [ ] Implement `slots` for replaceable content and renderers.
- [ ] Ensure custom content does not break accessibility or component state.
- [ ] Avoid exposing unnecessary internal implementation details.
- [ ] Test customization through real consuming applications.

### 12.6 Establish UI Quality

- [ ] Define visual standards for typography, spacing, surfaces, borders, focus states, and density.
- [ ] Implement loading, disabled, success, and error states where relevant.
- [ ] Respect reduced-motion preferences.
- [ ] Ensure components work with keyboard and screen-reader interaction.
- [ ] Test components in light, dark, and custom themes.
- [ ] Test responsive behaviour and overflow handling.
- [ ] Add visual regression tests for important components.
- [ ] Measure package size and remove unnecessary runtime dependencies.
- [ ] Verify tree-shaking and ensure importing one component does not pull in unrelated components.

## Phase 13 — Framework-Independent Logic and Integrations

### 13.1 Establish Logic Boundaries

- [ ] Define where framework-independent logic belongs.
- [ ] Keep reusable state machines, controllers, validation, and data transformation independent of React where practical.
- [ ] Define stable public interfaces between logic modules and their consumers.
- [ ] Avoid importing UI components into framework-independent logic.
- [ ] Avoid coupling core logic directly to external providers or databases.
- [ ] Define error, cancellation, retry, and lifecycle conventions.
- [ ] Define how logic modules expose state changes to framework-specific adapters.
- [ ] Add unit tests for independent logic modules.

### 13.2 Implement Core Logic Utilities

- [ ] Implement shared state and controller utilities only where required by multiple assets.
- [ ] Implement reusable form validation logic.
- [ ] Implement pagination, sorting, and filtering logic.
- [ ] Implement retry and backoff utilities.
- [ ] Implement reusable asynchronous operation state handling.
- [ ] Implement cancellation and timeout utilities where appropriate.
- [ ] Document each module's inputs, outputs, state ownership, and failure behaviour.
- [ ] Verify that modules can be used without a React runtime.

### 13.3 Define Integration Contracts

- [ ] Define standard interfaces for transports, storage adapters, and external service clients.
- [ ] Define configuration contracts for integration-specific settings.
- [ ] Define how secrets are provided by consuming applications.
- [ ] Define runtime requirements for browser, server, Node.js, and edge environments.
- [ ] Define error mapping between integrations and their underlying logic.
- [ ] Ensure integrations remain optional dependencies of the core feature.
- [ ] Document which responsibilities belong to the integration and which belong to the application.

### 13.4 Implement Initial Integrations

- [ ] Implement the Vercel AI SDK adapter for the chat transport contract.
- [ ] Implement streaming, cancellation, error, and retry behaviour for the selected AI integration.
- [ ] Implement provider configuration without hardcoding credentials.
- [ ] Implement a PostgreSQL conversation-storage adapter.
- [ ] Define database schemas and migrations for conversation persistence.
- [ ] Keep database operations separate from chat presentation and provider logic.
- [ ] Implement a custom transport example for applications with existing APIs.
- [ ] Add integration tests using controlled test services.
- [ ] Document installation and manual configuration requirements for every integration.

## Phase 14 — Functional Blocks, Recipes, and Templates

### 14.1 Establish the Blocks Package

- [ ] Configure the blocks package to consume the core UI package and relevant logic modules.
- [ ] Define a consistent block composition API.
- [ ] Define how blocks expose state, callbacks, controlled props, and extension points.
- [ ] Define block-level styling and theme inheritance.
- [ ] Define loading, empty, success, error, and disabled state conventions.
- [ ] Keep application business logic and credentials outside block implementations.
- [ ] Ensure individual blocks can be imported without loading unrelated blocks.

### 14.2 Implement the Agent Chat Block

- [ ] Define the chat block's public API and controller contract.
- [ ] Implement the main chat interface and responsive layout.
- [ ] Implement message list and message rendering.
- [ ] Implement message composer and submission behaviour.
- [ ] Implement conversation selection and conversation state where required.
- [ ] Implement streaming feedback and progressive message rendering.
- [ ] Implement stop-generation and cancellation controls.
- [ ] Implement retry and error recovery.
- [ ] Implement empty, initial loading, pending, and failure states.
- [ ] Implement configurable message renderers.
- [ ] Implement replaceable header, composer, empty state, and other meaningful slots.
- [ ] Implement keyboard interaction and accessible announcements.
- [ ] Test the block with a mock transport before adding provider-specific integrations.
- [ ] Verify that the block works with a custom controller and does not require a particular AI provider.

### 14.3 Implement the Dashboard Shell

- [ ] Define the Dashboard composition API.
- [ ] Implement responsive sidebar and main content layout.
- [ ] Implement collapsible navigation.
- [ ] Implement mobile navigation using the appropriate overlay behaviour.
- [ ] Implement header and content slots.
- [ ] Implement responsive content scrolling and overflow handling.
- [ ] Support application-provided routes, navigation items, and permissions.
- [ ] Ensure the shell does not impose application-specific dashboard content.

### 14.4 Implement Application Navigation

- [ ] Define navigation item and group contracts.
- [ ] Implement sidebar and top-navigation variants.
- [ ] Implement active route handling.
- [ ] Implement collapsible and responsive behaviour.
- [ ] Implement mobile navigation interactions.
- [ ] Support custom branding, navigation content, and footer slots.
- [ ] Keep route management and authorization in the consuming application.

### 14.5 Establish Recipe Support

- [ ] Define the recipe manifest and dependency model.
- [ ] Implement recipe validation and dependency resolution.
- [ ] Implement installation planning for recipes containing multiple assets.
- [ ] Detect overlapping file targets and incompatible dependencies.
- [ ] Define how shared configuration requirements are combined.
- [ ] Implement the `agent-chat-postgres` recipe using existing chat, AI, and storage assets.
- [ ] Verify that recipe installation does not duplicate asset implementations.

### 14.6 Establish Template Support

- [ ] Define the template manifest and installation responsibilities.
- [ ] Separate complete project templates from installable in-project blocks.
- [ ] Implement an initial application template only after the underlying assets are stable.
- [ ] Ensure templates use existing assets wherever possible.
- [ ] Document which application-level configuration and business logic developers must provide.

## Phase 15 — Web Application and Registry Browser

### 15.1 Establish the Web Application

- [ ] Create the `apps/web` application.
- [ ] Configure the application framework, styling, and routing.
- [ ] Establish the website's visual design system and navigation structure.
- [ ] Consume the actual UI package and shared tokens.
- [ ] Configure the registry client.
- [ ] Implement loading, empty, error, and not-found states.
- [ ] Establish responsive layouts for desktop and mobile.

### 15.2 Implement Account and GitHub Connection Interface

- [ ] Implement account-level GitHub connection.
- [ ] Display GitHub App installation status.
- [ ] Allow users to install or configure the GitHub App.
- [ ] Display repositories accessible to the connected account.
- [ ] Allow users to select repositories for simplify.dev.
- [ ] Display repository name, owner, visibility, default branch, and URL.
- [ ] Display the library associated with each connected repository.
- [ ] Allow users to disconnect repositories.
- [ ] Display permission and access errors.
- [ ] Provide a clear route to reconnect repositories when access has been revoked.

### 15.3 Implement Library Management Interface

- [ ] Implement the library management dashboard.
- [ ] Implement library creation from an existing repository.
- [ ] Implement library creation with a new GitHub repository.
- [ ] Display library metadata and connected repository information.
- [ ] Display the library's assets and their categories.
- [ ] Display the latest synchronized commit.
- [ ] Display the latest stable published version.
- [ ] Display development snapshot information where enabled.
- [ ] Display validation and publishing status.
- [ ] Display links to GitHub repository pages and workflow runs.
- [ ] Implement manual synchronization and retry controls.
- [ ] Implement library metadata editing without making the web application the canonical source of implementation code.
- [ ] Ensure metadata changes that belong in the repository are committed through a GitHub-backed workflow or clearly identified as registry-managed metadata.

### 15.4 Implement Registry Discovery

- [ ] Implement the registry landing page.
- [ ] Implement asset browsing by category.
- [ ] Implement search across asset names, descriptions, tags, and identifiers.
- [ ] Implement filters for category, language, framework, installation mode, and compatibility.
- [ ] Implement library detail pages.
- [ ] Implement publisher and maintainer information.
- [ ] Display version and compatibility information.
- [ ] Clearly distinguish official and external assets.
- [ ] Implement asset status indicators for experimental, stable, deprecated, and other defined states.

### 15.5 Implement Asset Documentation Pages

- [ ] Implement a shared asset detail page layout.
- [ ] Render asset descriptions and documentation from registry metadata and documentation sources.
- [ ] Display supported languages and frameworks.
- [ ] Display installation modes and commands.
- [ ] Display package and registry dependencies.
- [ ] Display environment and configuration requirements.
- [ ] Display examples and customization instructions.
- [ ] Display version history and release notes.
- [ ] Provide links to source code and relevant repository information.
- [ ] Add category-specific sections for blocks, integrations, logic, recipes, and templates.

### 15.6 Implement Installation Interface

- [ ] Display copyable CLI installation commands on supported asset pages.
- [ ] Generate commands from the selected asset, version, and installation mode.
- [ ] Show the expected files and dependencies associated with installation.
- [ ] Show required environment variables and manual setup steps.
- [ ] Allow developers to switch installation modes where supported.
- [ ] Allow developers to select compatible versions.
- [ ] Keep installation instructions synchronized with the registry manifest.

## Phase 16 — Live Preview and Configuration Studio

### 16.1 Establish the Preview System

- [ ] Define a consistent preview manifest for browser-compatible assets.
- [ ] Implement a preview runtime for TypeScript and React implementations.
- [ ] Render the actual asset implementation rather than a separate mock.
- [ ] Support configurable preview props and state.
- [ ] Support light and dark themes.
- [ ] Support responsive viewport presets.
- [ ] Support component variants and sizes.
- [ ] Support interactive previews.
- [ ] Provide code examples corresponding to the active preview configuration.
- [ ] Provide a static or documented fallback for assets that cannot execute in a browser.
- [ ] Prevent untrusted preview code from accessing sensitive application credentials or unrestricted browser capabilities.
- [ ] Isolate community-provided previews from the main documentation application.

### 16.2 Implement Component and Block States

- [ ] Define preview scenarios for loading, empty, error, pending, success, and disabled states.
- [ ] Allow documentation authors to define the available scenarios for each asset.
- [ ] Add controls for switching between supported states.
- [ ] Ensure preview controls do not alter the actual installed implementation.
- [ ] Test previews at common viewport sizes.
- [ ] Verify that previews reflect the installed version of the asset.

### 16.3 Implement Theme Studio

- [ ] Implement the theme editor interface.
- [ ] Connect editor controls to the canonical token model.
- [ ] Implement primary, secondary, accent, and semantic color editing.
- [ ] Implement background, foreground, surface, border, and focus-token editing.
- [ ] Implement typography configuration.
- [ ] Implement radius, spacing, and density controls.
- [ ] Implement shadow and elevation controls.
- [ ] Implement motion and transition configuration.
- [ ] Implement light and dark theme editing.
- [ ] Implement simple and advanced editing modes.
- [ ] Apply changes immediately to actual component and block previews.
- [ ] Implement theme presets.
- [ ] Add color contrast validation and warnings.
- [ ] Ensure primary color changes do not unintentionally alter semantic status colors.
- [ ] Implement CSS custom-property export.
- [ ] Implement JSON and TypeScript theme export.
- [ ] Add theme import and reset functionality.
- [ ] Ensure exported themes can be used by installed packages without requiring the documentation application.

## Phase 17 — Security, Compatibility, and Quality Assurance

### 17.1 GitHub Integration Security

- [ ] Review GitHub App permissions and remove unnecessary access.
- [ ] Verify webhook signatures and reject unauthenticated events.
- [ ] Protect GitHub App private keys and installation credentials.
- [ ] Ensure installation tokens expire and are not reused beyond their intended scope.
- [ ] Protect publishing tokens and prevent exposure in logs.
- [ ] Ensure forked pull request workflows cannot access publishing credentials.
- [ ] Restrict stable publishing to trusted tags, releases, or explicitly authorized workflows.
- [ ] Verify that the repository associated with a publication is authorized to publish the target library.
- [ ] Prevent unauthorized users from taking ownership of an existing library through repository changes.
- [ ] Validate repository identity and source commit before accepting a publication.
- [ ] Record publication provenance for auditing.
- [ ] Test duplicate, delayed, and out-of-order webhook events.
- [ ] Test repository deletion, transfer, rename, and permission revocation.
- [ ] Implement abuse controls and rate limits for GitHub integration endpoints.

### 17.2 Registry Security

- [ ] Validate all registry manifests and published artifacts.
- [ ] Verify file integrity using stored hashes.
- [ ] Define publisher authentication and publishing permissions.
- [ ] Separate official assets from community assets.
- [ ] Implement asset reporting and moderation workflows.
- [ ] Track publisher changes and version history.
- [ ] Record license and attribution information.
- [ ] Prevent unsafe source and target paths.
- [ ] Review declared package dependencies and installation requirements.
- [ ] Avoid automatic execution of arbitrary installation scripts.
- [ ] Define procedures for deprecating or removing compromised assets.

### 17.3 CLI Security

- [ ] Validate all registry data before applying installation operations.
- [ ] Prevent path traversal and writes outside the intended project.
- [ ] Protect existing files and configuration during installation.
- [ ] Avoid logging credentials, environment variables, or sensitive paths unnecessarily.
- [ ] Avoid replacing actual environment secrets.
- [ ] Require explicit decisions for destructive operations.
- [ ] Validate package-manager commands and arguments.
- [ ] Test malformed registry data, interrupted downloads, and partial installation failures.

### 17.4 UI and Runtime Quality

- [ ] Run accessibility tests against the core UI package.
- [ ] Verify keyboard and focus behaviour for all interactive primitives.
- [ ] Test reduced-motion behaviour.
- [ ] Test responsive behaviour across supported viewport sizes.
- [ ] Verify light, dark, and custom theme rendering.
- [ ] Add visual regression coverage for representative components and blocks.
- [ ] Measure package sizes and identify unexpected dependency growth.
- [ ] Verify tree-shaking and public export boundaries.
- [ ] Test React server and client component boundaries.
- [ ] Test package behaviour in fresh Next.js and Vite applications.

### 17.5 Installer and Registry Compatibility

- [ ] Test source, package, and hybrid installation independently.
- [ ] Test fresh project initialization.
- [ ] Test existing project installation.
- [ ] Test monorepo project detection and target paths.
- [ ] Test nested registry dependencies and recipe installations.
- [ ] Test version conflicts and unsupported framework versions.
- [ ] Test updates after source customization.
- [ ] Test removal of assets with shared dependencies.
- [ ] Test reproducibility using pinned registry versions.
- [ ] Test installations with unavailable or corrupted registry files.
- [ ] Verify that installation and update errors are recoverable.

## Phase 18 — Multi-Language and Framework Expansion

### 18.1 Prepare the Registry for Additional Ecosystems

- [ ] Review the registry schema to ensure language and framework implementations are represented independently of TypeScript assumptions.
- [ ] Define implementation target identifiers and version compatibility rules.
- [ ] Define how framework-specific dependencies and build instructions are represented.
- [ ] Define installation adapters for package managers and language-specific tooling.
- [ ] Define cross-language integration metadata for assets that communicate through APIs or other documented contracts.
- [ ] Ensure the registry can associate multiple implementations with one logical asset.
- [ ] Avoid forcing identical implementation APIs across languages.

### 18.2 Implement Additional Installer Adapters

- [ ] Define an installer adapter interface.
- [ ] Keep the initial TypeScript installer independent from future language-specific adapters.
- [ ] Implement project detection for one additional ecosystem.
- [ ] Implement dependency resolution for its package manager.
- [ ] Implement source and package installation where appropriate.
- [ ] Implement its configuration and lock-file handling.
- [ ] Add tests for detection, installation, updates, and compatibility.
- [ ] Document ecosystem-specific limitations.

### 18.3 Add Initial Non-TypeScript Assets

- [ ] Select a practical first ecosystem, such as Python or .NET, based on a real asset use case.
- [ ] Build one independently useful implementation for the selected ecosystem.
- [ ] Publish its target-specific manifest and documentation.
- [ ] Verify that it can be discovered and installed through the existing registry workflow.
- [ ] Add a cross-language integration example where a TypeScript frontend communicates with the new backend implementation.
- [ ] Verify that adding the ecosystem does not require changes to unrelated registry or UI implementations.

### 18.4 Expand Ecosystem Support

- [ ] Add further language and framework adapters based on actual demand and available implementations.
- [ ] Establish a compatibility test strategy for each supported ecosystem.
- [ ] Require genuine implementations and tests before advertising support.
- [ ] Document language-specific installation and customization conventions.
- [ ] Support ecosystem-specific packages, modules, source layouts, and build tools.

## Phase 19 — Release, Documentation, and Operations

### 19.1 Developer Documentation

- [ ] Write the platform overview and architecture documentation.
- [ ] Document the registry data model and asset manifest specification.
- [ ] Document project initialization and configuration.
- [ ] Document package, source, and hybrid installation.
- [ ] Document asset authoring and library publishing.
- [ ] Document GitHub account connection and repository authorization.
- [ ] Document the GitHub-first library creation workflow.
- [ ] Document the generated GitHub Actions workflow.
- [ ] Document pull request validation and development synchronization.
- [ ] Document stable release publishing through Git tags and GitHub releases.
- [ ] Document publishing authentication and workflow permissions.
- [ ] Document repository lifecycle handling and recovery.
- [ ] Document component composition and customization.
- [ ] Document logic isolation and integration contracts.
- [ ] Document Theme Studio and theme export.
- [ ] Document supported languages, frameworks, and runtimes.
- [ ] Provide complete examples for installing and extending the Agent Chat block.
- [ ] Provide troubleshooting guides for common registry, GitHub integration, publishing, and installer errors.

### 19.2 Package and CLI Release

- [ ] Configure package publishing for the initial official packages.
- [ ] Configure CLI release builds for supported platforms.
- [ ] Verify package exports and declaration files.
- [ ] Verify styles and token assets are included in published packages.
- [ ] Test installation from the public package registry.
- [ ] Configure automated release checks.
- [ ] Establish semantic versioning and changelog conventions.
- [ ] Document package support and deprecation policies.

### 19.3 Registry and Website Deployment

- [ ] Configure production hosting for the documentation application.
- [ ] Configure registry metadata and artifact distribution.
- [ ] Configure versioned artifact storage and caching.
- [ ] Configure publishing authentication and authorization.
- [ ] Deploy GitHub App integration and webhook endpoints.
- [ ] Configure secure GitHub App credential storage.
- [ ] Configure deployment and rollback procedures.
- [ ] Add monitoring for registry availability and artifact delivery.
- [ ] Monitor GitHub webhook processing and publishing failures.
- [ ] Monitor CLI installation failures and registry errors without collecting unnecessary project or secret data.
- [ ] Establish backup and recovery procedures for registry metadata and published artifacts.

### 19.4 Initial Public Release

- [ ] Publish the core UI package.
- [ ] Publish the initial logic and blocks packages where package distribution is appropriate.
- [ ] Publish the initial official asset collection.
- [ ] Release the CLI with project initialization and installation support.
- [ ] Launch the registry browser and asset documentation.
- [ ] Launch GitHub account connection and repository management.
- [ ] Launch GitHub-first library creation from existing repositories.
- [ ] Launch library creation with new GitHub repositories where supported.
- [ ] Provide the initial GitHub Actions publishing workflow.
- [ ] Support validation and stable publishing from Git tags.
- [ ] Launch Theme Studio with the initial token controls.
- [ ] Publish the Agent Chat block and its Vercel AI SDK integration.
- [ ] Publish the PostgreSQL storage integration and combined recipe.
- [ ] Validate the complete workflow in a fresh Next.js application.
- [ ] Validate the complete library workflow from GitHub repository creation through registry publication.
- [ ] Publish release notes and known limitations.
- [ ] Establish a process for collecting feedback, reviewing issues, and prioritizing improvements.

## Phase 20 — Post-Release Expansion

### 20.1 Improve the Registry Ecosystem

- [ ] Add public library discovery and publisher profiles.
- [ ] Add external registry configuration and management.
- [ ] Add improved dependency visualization.
- [ ] Add asset compatibility and version comparison views.
- [ ] Add asset deprecation and migration guidance.
- [ ] Add curated collections of related assets.
- [ ] Establish a review process for official and community-published assets.
- [ ] Improve library and asset discovery using repository metadata and published documentation.

### 20.2 Expand GitHub Integration

- [ ] Improve GitHub repository synchronization and recovery.
- [ ] Add more detailed publishing and validation reports.
- [ ] Add configurable development snapshot retention.
- [ ] Add configurable branch synchronization policies.
- [ ] Add GitHub release notes synchronization.
- [ ] Improve repository and workflow status visibility.
- [ ] Add support for more advanced monorepo publishing workflows.
- [ ] Evaluate multi-repository libraries when real use cases justify them.
- [ ] Evaluate additional Git hosting providers through the existing source-control abstraction.
- [ ] Improve publisher and maintainer management for libraries with multiple contributors.

### 20.3 Expand Functional Assets

- [ ] Add authentication and authorization integration assets.
- [ ] Add reusable form workflows and form builders.
- [ ] Add advanced data tables and filtering blocks.
- [ ] Add notification and command palette blocks.
- [ ] Add file management and upload blocks.
- [ ] Add workflow and background-processing logic.
- [ ] Add storage and API integrations.
- [ ] Add additional dashboard and application-layout blocks.
- [ ] Add recipes combining independently maintained assets.

### 20.4 Improve Developer Experience

- [ ] Add more advanced update and merge capabilities.
- [ ] Add asset dependency visualization in the web application.
- [ ] Add project-aware installation previews where feasible.
- [ ] Improve error diagnostics and installation recovery.
- [ ] Add compatibility reports for published assets.
- [ ] Improve documentation generation and preview authoring.
- [ ] Add reusable authoring and validation tooling for external contributors.
- [ ] Improve local library development and publishing feedback.
- [ ] Make it easier to test library changes before publishing stable versions.

### 20.5 Expand Design and Runtime Capabilities

- [ ] Expand component and block coverage based on repeated real-world use cases.
- [ ] Add additional theme presets and token controls.
- [ ] Improve visual regression and interaction testing infrastructure.
- [ ] Add framework-specific token generators.
- [ ] Add native implementations for other UI frameworks where justified.
- [ ] Maintain a consistent design language without forcing cross-framework component reuse.

## Completion Criteria

The initial platform should not be considered complete merely because the CLI can download component files, the website can display previews, or a GitHub repository can be connected.

The first usable release must demonstrate the complete library creation, publishing, discovery, installation, and customization workflow.

### Library Creation and GitHub Integration

- [ ] A developer can connect a GitHub account to simplify.dev.
- [ ] A developer can authorize access to selected repositories without granting unnecessary permissions.
- [ ] A developer can connect an existing GitHub repository and turn it into a simplify.dev library.
- [ ] A developer can create a new GitHub repository through the simplify.dev library creation workflow.
- [ ] A developer can initialize and maintain a library using the simplify.dev CLI.
- [ ] A developer can add multiple assets to a library without changing the registry implementation.
- [ ] A developer can continue developing through normal GitHub workflows, including branches, commits, pull requests, code reviews, and releases.
- [ ] A connected repository remains the canonical source of its library implementation.

### Validation and Publishing

- [ ] A developer can validate a library locally.
- [ ] GitHub Actions can validate a library during pull requests without publishing it.
- [ ] GitHub Actions can synchronize development snapshots from configured branches.
- [ ] A developer can publish a stable library version using a Git tag or GitHub release.
- [ ] The publishing process validates the manifest, assets, dependencies, and implementation files.
- [ ] The published version is associated with its exact repository commit SHA.
- [ ] Published versions are immutable and reproducible.
- [ ] Publishing operations are authenticated, authorized, and safe to retry.
- [ ] Publishing failures are visible and provide actionable diagnostics.
- [ ] A developer can inspect publication history and link back to the corresponding GitHub workflow run.
- [ ] GitHub repository changes do not silently replace already published versions.

### Registry and Installation

- [ ] A developer can discover a library or asset through the web application.
- [ ] A developer can inspect its documentation, implementation requirements, and live preview.
- [ ] A developer can install an asset using package, source, or hybrid installation where supported.
- [ ] The CLI resolves dependencies and reports the files and configuration changes.
- [ ] Installed source can be inspected and customized directly.
- [ ] The installation record tracks versions and installed files.
- [ ] The CLI can identify modifications and produce a safe update plan.
- [ ] The registry can distribute previously published versions independently of the repository's current branch state.

### Components, Blocks, and Design System

- [ ] UI components use the shared token system and provide consistent customization APIs.
- [ ] Functional blocks implement real behaviour and handle relevant interaction states.
- [ ] Logic remains isolated from presentation where practical.
- [ ] Integrations connect through defined contracts rather than tightly coupling the core implementation to vendors.
- [ ] The Agent Chat block works with a custom transport and a supported AI integration.
- [ ] The web application renders actual asset implementations in its previews.
- [ ] Theme Studio changes are reflected in real components and blocks and can be exported.

### Security and Extensibility

- [ ] The GitHub integration uses scoped permissions and protects credentials.
- [ ] Untrusted pull request workflows cannot access publishing credentials.
- [ ] The registry validates published assets and verifies artifact integrity.
- [ ] The installer safely handles file conflicts and configuration changes.
- [ ] The registry can represent multiple language and framework implementations without redesigning its core model.
- [ ] Published assets pass schema, installation, compatibility, security, and quality validation.
- [ ] The complete workflow works in a separate consuming application outside the simplify.dev monorepo.

The initial release is successful when developers can create and maintain libraries through GitHub, publish immutable versions to simplify.dev, and let other developers discover, install, connect, customize, and maintain complete functional features without rebuilding their underlying implementations from scratch.
