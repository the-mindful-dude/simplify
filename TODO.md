simplify.dev — Development TODO

This document defines the implementation roadmap for simplify.dev. Tasks are organized by dependency, from foundational architecture to the registry, installer, design system, UI ecosystem, web application, and multi-language support.

Tasks should be completed in order unless explicitly marked as independent. Each phase should have working, tested deliverables before dependent phases begin.

---

Phase 1 — Product Scope and Technical Decisions

1.1 Define the Initial Product Scope

- [ ] Define the initial asset categories: UI components, blocks, logic, integrations, recipes, templates, and libraries.
- [ ] Define the distinction between an asset and a library. An asset is an independently installable implementation; a library is a distributable collection of related assets.
- [ ] Define the relationship between blocks, logic, and integrations. Blocks may depend on logic, integrations may implement logic interfaces, and recipes may combine multiple assets.
- [ ] Define the three installation modes: package, source, and hybrid. Specify exactly what each mode installs and where the implementation lives.
- [ ] Define the initial supported ecosystem as TypeScript, React, and Next.js. Keep the architecture extensible for additional languages and frameworks without implementing them prematurely.
- [ ] Identify the initial asset set used to validate the platform: UI primitives, Agent Chat, Chat Logic, Vercel AI SDK Integration, PostgreSQL Storage Integration, and Dashboard Shell.
- [ ] Define the responsibilities that remain with consuming applications, including authentication, authorization, credentials, business rules, and deployment.
- [ ] Define the requirements for official assets versus externally published assets, including ownership, verification, and review status.

1.2 Establish Naming and Public Identifiers

- [ ] Choose the public npm package scope and CLI executable name. Check their availability before publishing.
- [ ] Define stable internal asset IDs that do not depend on the product name, package scope, or registry URL.
- [ ] Establish naming conventions for packages, libraries, assets, integrations, recipes, and templates.
- [ ] Define the public registry URL structure and versioned asset URL conventions.
- [ ] Keep product branding, package identifiers, registry identifiers, and internal implementation names independently configurable.

1.3 Define Technical Standards

- [ ] Choose TypeScript as the primary implementation language for platform services and tooling.
- [ ] Choose pnpm workspaces for package management and define the monorepo build strategy.
- [ ] Choose the build and task orchestration tools for development, testing, and publishing.
- [ ] Define supported Node.js, TypeScript, React, and Next.js versions for the initial release.
- [ ] Define coding conventions, module boundaries, error-handling patterns, and public API conventions.
- [ ] Establish the initial testing strategy for packages, CLI operations, UI components, integrations, and the registry.
- [ ] Define the minimum performance, accessibility, and security requirements for published assets.

---

Phase 2 — Repository and Development Foundation

2.1 Initialize the Monorepo

- [ ] Create the simplify.dev repository.
- [ ] Initialize the root "package.json" with workspace scripts and shared development dependencies.
- [ ] Configure "pnpm-workspace.yaml".
- [ ] Configure the monorepo build orchestration and task dependencies.
- [ ] Establish the initial directory structure for applications, packages, registry assets, schemas, and documentation.
- [ ] Configure TypeScript project references or an appropriate shared TypeScript configuration.
- [ ] Establish shared formatting, linting, and type-checking configurations.
- [ ] Configure environment variable handling for local development, testing, and deployment.
- [ ] Add root scripts for development, building, testing, linting, and type-checking.

2.2 Establish Development Infrastructure

- [ ] Configure a consistent test runner and test utilities for packages.
- [ ] Configure a CI workflow that validates formatting, linting, types, tests, and builds.
- [ ] Configure dependency installation and caching in CI.
- [ ] Establish environment-specific configuration without committing secrets.
- [ ] Add ".gitignore" rules for generated files, local registry data, build outputs, and environment files.
- [ ] Document local development setup and the responsibilities of each workspace package.
- [ ] Add repository-level contribution guidelines and pull request templates.

2.3 Create Initial Workspace Boundaries

- [ ] Create the initial "registry" package for registry contracts and asset resolution.
- [ ] Create the initial "cli" package for the command-line application.
- [ ] Create the "tokens" package for shared design-token definitions.
- [ ] Create the "ui" package for React components.
- [ ] Create the "interaction" package only for framework-independent feature logic that has a genuine reuse boundary.
- [ ] Create the "blocks" package for reusable functional React compositions.
- [ ] Create the "tooling" package for asset validation, library building, and preview utilities.
- [ ] Create the "apps/web" application for the registry browser and documentation.
- [ ] Create an "apps/registry-api" application only when hosted registry operations require a dedicated service. Avoid creating unused service boundaries.

---

Phase 3 — Registry Specifications and Asset Schemas

3.1 Define the Registry Data Model

- [ ] Define the registry's core asset identity model. Every asset must have a stable ID, category, name, version, and publisher.
- [ ] Define the library model, including library identity, description, maintainers, assets, versions, and licensing.
- [ ] Define the relationship between library versions and individual asset versions.
- [ ] Define asset categories and validate that each category has the required metadata.
- [ ] Define language, framework, runtime, and platform target descriptors.
- [ ] Define compatibility requirements, including supported version ranges.
- [ ] Define installation modes and their supported capabilities.
- [ ] Define documentation, example, preview, and changelog references.
- [ ] Define official, community, deprecated, and reviewed asset statuses.
- [ ] Define metadata schema versioning and backward-compatibility rules.

3.2 Define Dependency Specifications

- [ ] Define registry dependencies for assets that require other simplify.dev assets.
- [ ] Define package dependencies for external package-manager dependencies.
- [ ] Define peer dependencies and optional dependencies.
- [ ] Support version constraints for registry and package dependencies.
- [ ] Define dependency compatibility rules across language and framework targets.
- [ ] Define conflict detection for assets requiring incompatible dependency versions.
- [ ] Define circular dependency detection and reject invalid dependency graphs.
- [ ] Define how optional integrations and alternative implementations are represented.
- [ ] Define how recipes declare and resolve their component assets without duplicating them.

3.3 Define Installation and Configuration Metadata

- [ ] Define source-to-target file mappings for source installations.
- [ ] Define package installation metadata for package-based assets.
- [ ] Define generated configuration files and supported configuration transformations.
- [ ] Define environment-variable declarations, including descriptions, required status, and example values.
- [ ] Define database migration and schema references without allowing silent destructive database operations.
- [ ] Define setup instructions and post-installation requirements as declarative metadata.
- [ ] Reject arbitrary registry-provided executable installation scripts by default.
- [ ] Define how assets declare required runtime capabilities, such as browser, Node.js, server, or edge execution.

3.4 Implement Schema Validation

- [ ] Implement schemas for library manifests, asset manifests, project configuration, and installation metadata.
- [ ] Add runtime validation for registry responses and configuration files.
- [ ] Add validation for asset IDs, package identifiers, versions, paths, and dependency declarations.
- [ ] Validate that referenced files and documentation resources exist.
- [ ] Validate that each installation mode has the metadata necessary to execute it safely.
- [ ] Add schema tests using valid and invalid manifests.
- [ ] Add schema compatibility tests to prevent accidental breaking changes.
- [ ] Publish schema documentation and TypeScript types for asset authors.

---

Phase 4 — Registry Storage and Dependency Resolution

4.1 Implement the Initial Registry

- [ ] Define a canonical source layout for official registry assets.
- [ ] Implement registry metadata loading and validation.
- [ ] Implement asset lookup by stable ID and version.
- [ ] Implement library lookup and asset enumeration.
- [ ] Implement registry indexing by category, language, framework, and publisher.
- [ ] Implement immutable versioned asset metadata and source references.
- [ ] Implement retrieval of asset files and associated documentation.
- [ ] Implement a registry client API that can be used by the CLI and web application.
- [ ] Separate registry storage details from the client and resolver interfaces so the storage backend can change later.
- [ ] Start with a static, versioned registry distribution where practical. Add dynamic hosted registry services when publishing, discovery, or access-control requirements justify them.

4.2 Implement Dependency Resolution

- [ ] Resolve an asset's complete registry dependency graph.
- [ ] Resolve compatible asset versions based on the consuming project's target environment.
- [ ] Resolve package dependencies and their version constraints.
- [ ] Detect missing dependencies and incompatible versions.
- [ ] Detect circular dependencies.
- [ ] Detect duplicate assets and conflicting file targets.
- [ ] Support optional dependencies and alternative integrations.
- [ ] Resolve recipe dependencies into a single installation plan.
- [ ] Preserve explicit version selections and produce deterministic resolution results.
- [ ] Add tests for nested dependencies, conflicting versions, missing assets, and alternative integrations.

4.3 Define Registry Distribution and Caching

- [ ] Define a versioned URL convention for metadata and source files.
- [ ] Separate registry indexes, manifests, and file artifacts so they can be cached independently.
- [ ] Add content hashes or equivalent integrity metadata for distributed files.
- [ ] Add caching rules for immutable asset versions.
- [ ] Define registry cache invalidation for mutable discovery indexes.
- [ ] Ensure installations of pinned versions do not depend on the latest registry index remaining available.

---

Phase 5 — CLI Foundation and Project Detection

5.1 Build the CLI Application

- [ ] Create the CLI executable and configure its public command name.
- [ ] Implement command parsing, options, help output, and version output.
- [ ] Establish consistent output formatting for success, warnings, errors, and installation summaries.
- [ ] Implement structured error types and meaningful error messages.
- [ ] Add interactive prompts only where user decisions are necessary.
- [ ] Support non-interactive execution for CI and scripted workflows.
- [ ] Add verbose and debug modes without exposing secrets.
- [ ] Ensure CLI commands can be tested without launching a real terminal.

5.2 Implement Project Detection

- [ ] Detect the current project root and verify that it is a valid project directory.
- [ ] Detect TypeScript and JavaScript projects.
- [ ] Detect React and Next.js applications.
- [ ] Identify package managers from lockfiles and project metadata.
- [ ] Detect installed framework and runtime versions.
- [ ] Detect common source directories and application roots.
- [ ] Read TypeScript configuration and identify import aliases.
- [ ] Detect monorepo workspaces and identify the appropriate target application.
- [ ] Detect whether the project uses an existing simplify.dev configuration.
- [ ] Report unsupported or ambiguous project configurations instead of silently making assumptions.

5.3 Implement Project Configuration

- [ ] Define the "simplify.config.json" schema.
- [ ] Implement the "simplify init" command.
- [ ] Generate a minimal configuration using detected project information.
- [ ] Support configurable asset paths for UI, blocks, logic, integrations, hooks, and styles.
- [ ] Support package-manager selection and automatic detection.
- [ ] Support default installation modes and optional per-category overrides.
- [ ] Support custom registries and registry aliases.
- [ ] Validate configuration when loading it.
- [ ] Support configuration overrides for monorepo applications and custom source roots.
- [ ] Provide useful configuration errors with file and field references.

---

Phase 6 — Installation Engine

6.1 Implement Installation Planning

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

6.2 Implement Package Installation

- [ ] Implement package installation for supported package managers.
- [ ] Install the selected package and version.
- [ ] Respect the detected package manager and existing lockfile.
- [ ] Avoid installing optional dependencies that are not required by the selected asset.
- [ ] Handle package-manager errors and interrupted installations.
- [ ] Verify the resulting dependency state.
- [ ] Record package-based installations in simplify.dev metadata where tracking is required.

6.3 Implement Source Installation

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

6.4 Implement Hybrid Installation

- [ ] Combine source and package installation plans.
- [ ] Install source files and declared package dependencies as one coordinated operation.
- [ ] Apply supported configuration changes.
- [ ] Add documented environment-variable examples to ".env.example" without exposing or replacing actual secrets.
- [ ] Report required manual setup steps.
- [ ] Verify the resulting installation.
- [ ] Ensure failure in one installation step does not leave the project in an inconsistent state.
- [ ] Provide rollback for installer-managed changes where possible.

6.5 Implement Safe File and Configuration Operations

- [ ] Use temporary files or equivalent safe-write mechanisms when applying changes.
- [ ] Back up existing files before permitted replacement operations.
- [ ] Implement rollback for failed multi-file operations.
- [ ] Restrict asset target paths to approved project directories.
- [ ] Prevent path traversal and attempts to write outside the project root.
- [ ] Apply only supported declarative configuration changes.
- [ ] Preserve comments and unrelated settings where practical.
- [ ] Report changes that require manual intervention instead of guessing.
- [ ] Add tests for conflicts, permissions, interruptions, rollback, and path safety.

6.6 Implement Initial CLI Commands

- [ ] Implement "simplify add" for individual assets and recipes.
- [ ] Implement "simplify info" to inspect asset metadata and requirements.
- [ ] Implement "simplify list" to display installed assets.
- [ ] Implement "simplify doctor" to validate project configuration and installed assets.
- [ ] Implement installation options for mode, version, target path, and dry run.
- [ ] Add command tests covering successful and failed installation scenarios.

---

Phase 7 — Installation Tracking and Maintenance

7.1 Implement Local Installation Metadata

- [ ] Establish the ".simplify/" directory.
- [ ] Define the local lock-file schema.
- [ ] Record asset IDs, versions, installation modes, and resolved dependencies.
- [ ] Record installed file paths and their original content hashes.
- [ ] Record package dependencies introduced by source or hybrid installations.
- [ ] Record relevant configuration modifications.
- [ ] Ensure the lock file can reproduce the resolved installation state.
- [ ] Keep generated installation metadata separate from the registry's source manifests.

7.2 Implement Asset Inspection and Comparison

- [ ] Implement "simplify list" with asset version and installation-mode details.
- [ ] Implement "simplify info" for installed and available assets.
- [ ] Implement "simplify diff" to compare installed source with the selected registry version.
- [ ] Detect modified, deleted, and newly added files.
- [ ] Display package and registry dependency changes.
- [ ] Report breaking or potentially conflicting changes.
- [ ] Provide an option to inspect individual registry files before updating.

7.3 Implement Updates

- [ ] Implement version selection and update planning.
- [ ] Compare installed assets with available registry versions.
- [ ] Detect user modifications before applying updates.
- [ ] Identify files that can be updated safely and files that require manual review.
- [ ] Implement three-way merge support for source files where practical.
- [ ] Preserve user changes during updates.
- [ ] Update dependency metadata and lock information.
- [ ] Support rollback to a previously installed version where possible.
- [ ] Test updates across unchanged, modified, removed, and conflicting files.

7.4 Implement Removal

- [ ] Implement "simplify remove" for installed assets.
- [ ] Identify files owned by the selected asset.
- [ ] Check whether other installed assets depend on the selected asset.
- [ ] Preserve files modified by the developer unless explicitly instructed otherwise.
- [ ] Remove dependencies only when they are no longer required by other tracked assets.
- [ ] Update the lock file and installation metadata.
- [ ] Display the removal plan before applying destructive changes.

---

Phase 8 — Design Tokens and Theme Infrastructure

8.1 Define the Token Model

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

8.2 Implement Token Generation

- [ ] Create the canonical token source.
- [ ] Implement token schema validation.
- [ ] Generate CSS custom properties.
- [ ] Generate JSON token exports.
- [ ] Generate TypeScript token types and definitions.
- [ ] Design the generator interface to support future output formats, including Avalonia resources.
- [ ] Generate light and dark theme outputs.
- [ ] Add checks to ensure generated files are reproducible from the canonical source.
- [ ] Publish the token package with stable exports.

8.3 Implement Runtime Theme Support

- [ ] Define the CSS custom-property contract used by UI components.
- [ ] Implement theme selection through supported root attributes or classes.
- [ ] Support light, dark, and custom themes.
- [ ] Support theme overrides without requiring a global React provider.
- [ ] Define how nested theme scopes behave.
- [ ] Ensure token changes affect compatible components and blocks consistently.
- [ ] Add contrast validation for text, surfaces, borders, and focus indicators.
- [ ] Test theme inheritance and overrides.

---

Phase 9 — Core React UI Package

9.1 Establish the UI Package

- [ ] Configure the package's public name and exports.
- [ ] Define supported React and React DOM peer dependencies.
- [ ] Choose one primary headless foundation for the initial component set.
- [ ] Avoid overlapping headless libraries that duplicate the same component responsibilities.
- [ ] Configure JavaScript and TypeScript declaration builds.
- [ ] Configure CSS output and the "styles.css" package export.
- [ ] Define package-level dependency and externalization rules.
- [ ] Preserve appropriate React server and client boundaries.
- [ ] Verify package installation in a separate Next.js project.

9.2 Establish Component Conventions

- [ ] Define naming and export conventions for components and compound components.
- [ ] Standardize prop casing and naming.
- [ ] Define consistent variant, size, radius, and state APIs.
- [ ] Define "className", slot styling, "slotProps", and "slots" conventions.
- [ ] Define controlled and uncontrolled state conventions.
- [ ] Define component composition and accessibility requirements.
- [ ] Establish a consistent pattern for internal types, styling, hooks, and utilities.
- [ ] Define which APIs are public and which remain internal.

9.3 Implement Foundational Components

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

9.4 Implement Compound and Interactive Components

- [ ] Implement Dialog with accessible title, description, focus management, portals, and close behaviour.
- [ ] Implement Drawer with responsive placement and size options.
- [ ] Implement Dropdown Menu with keyboard navigation and accessible item behaviour.
- [ ] Implement Tabs with appropriate controlled and uncontrolled state.
- [ ] Implement Popover and related overlay components.
- [ ] Implement Field composition with labels, controls, descriptions, errors, and responsive layouts.
- [ ] Implement the remaining components based on actual reusable requirements.
- [ ] Ensure compound components provide consistent default styling and predictable composition.

9.5 Implement UI Customization

- [ ] Apply semantic tokens throughout the component package.
- [ ] Implement variants and sizes through shared style definitions.
- [ ] Implement root-level class overrides.
- [ ] Implement documented slot-level style overrides.
- [ ] Implement "slotProps" for supported internal elements.
- [ ] Implement "slots" for replaceable content and renderers.
- [ ] Ensure custom content does not break accessibility or component state.
- [ ] Avoid exposing unnecessary internal implementation details.
- [ ] Test customization through real consuming applications.

9.6 Establish UI Quality

- [ ] Define visual standards for typography, spacing, surfaces, borders, focus states, and density.
- [ ] Implement loading, disabled, success, and error states where relevant.
- [ ] Respect reduced-motion preferences.
- [ ] Ensure components work with keyboard and screen-reader interaction.
- [ ] Test components in light, dark, and custom themes.
- [ ] Test responsive behaviour and overflow handling.
- [ ] Add visual regression tests for important components.
- [ ] Measure package size and remove unnecessary runtime dependencies.
- [ ] Verify tree-shaking and ensure importing one component does not pull in unrelated components.

---

Phase 10 — Framework-Independent Logic and Integrations

10.1 Establish Logic Boundaries

- [ ] Define where framework-independent logic belongs.
- [ ] Keep reusable state machines, controllers, validation, and data transformation independent of React where practical.
- [ ] Define stable public interfaces between logic modules and their consumers.
- [ ] Avoid importing UI components into framework-independent logic.
- [ ] Avoid coupling core logic directly to external providers or databases.
- [ ] Define error, cancellation, retry, and lifecycle conventions.
- [ ] Define how logic modules expose state changes to framework-specific adapters.
- [ ] Add unit tests for independent logic modules.

10.2 Implement Core Logic Utilities

- [ ] Implement shared state and controller utilities only where required by multiple assets.
- [ ] Implement reusable form validation logic.
- [ ] Implement pagination, sorting, and filtering logic.
- [ ] Implement retry and backoff utilities.
- [ ] Implement reusable asynchronous operation state handling.
- [ ] Implement cancellation and timeout utilities where appropriate.
- [ ] Document each module's inputs, outputs, state ownership, and failure behaviour.
- [ ] Verify that modules can be used without a React runtime.

10.3 Define Integration Contracts

- [ ] Define standard interfaces for transports, storage adapters, and external service clients.
- [ ] Define configuration contracts for integration-specific settings.
- [ ] Define how secrets are provided by consuming applications.
- [ ] Define runtime requirements for browser, server, Node.js, and edge environments.
- [ ] Define error mapping between integrations and their underlying logic.
- [ ] Ensure integrations remain optional dependencies of the core feature.
- [ ] Document which responsibilities belong to the integration and which belong to the application.

10.4 Implement Initial Integrations

- [ ] Implement the Vercel AI SDK adapter for the chat transport contract.
- [ ] Implement streaming, cancellation, error, and retry behaviour for the selected AI integration.
- [ ] Implement provider configuration without hardcoding credentials.
- [ ] Implement a PostgreSQL conversation-storage adapter.
- [ ] Define database schemas and migrations for conversation persistence.
- [ ] Keep database operations separate from chat presentation and provider logic.
- [ ] Implement a custom transport example for applications with existing APIs.
- [ ] Add integration tests using controlled test services.
- [ ] Document installation and manual configuration requirements for every integration.

---

Phase 11 — Functional Blocks, Recipes, and Templates

11.1 Establish the Blocks Package

- [ ] Configure the blocks package to consume the core UI package and relevant logic modules.
- [ ] Define a consistent block composition API.
- [ ] Define how blocks expose state, callbacks, controlled props, and extension points.
- [ ] Define block-level styling and theme inheritance.
- [ ] Define loading, empty, success, error, and disabled state conventions.
- [ ] Keep application business logic and credentials outside block implementations.
- [ ] Ensure individual blocks can be imported without loading unrelated blocks.

11.2 Implement the Agent Chat Block

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

11.3 Implement the Dashboard Shell

- [ ] Define the Dashboard composition API.
- [ ] Implement responsive sidebar and main content layout.
- [ ] Implement collapsible navigation.
- [ ] Implement mobile navigation using the appropriate overlay behaviour.
- [ ] Implement header and content slots.
- [ ] Implement responsive content scrolling and overflow handling.
- [ ] Support application-provided routes, navigation items, and permissions.
- [ ] Ensure the shell does not impose application-specific dashboard content.

11.4 Implement Application Navigation

- [ ] Define navigation item and group contracts.
- [ ] Implement sidebar and top-navigation variants.
- [ ] Implement active route handling.
- [ ] Implement collapsible and responsive behaviour.
- [ ] Implement mobile navigation interactions.
- [ ] Support custom branding, navigation content, and footer slots.
- [ ] Keep route management and authorization in the consuming application.

11.5 Establish Recipe Support

- [ ] Define the recipe manifest and dependency model.
- [ ] Implement recipe validation and dependency resolution.
- [ ] Implement installation planning for recipes containing multiple assets.
- [ ] Detect overlapping file targets and incompatible dependencies.
- [ ] Define how shared configuration requirements are combined.
- [ ] Implement the "agent-chat-postgres" recipe using existing chat, AI, and storage assets.
- [ ] Verify that recipe installation does not duplicate asset implementations.

11.6 Establish Template Support

- [ ] Define the template manifest and installation responsibilities.
- [ ] Separate complete project templates from installable in-project blocks.
- [ ] Implement an initial application template only after the underlying assets are stable.
- [ ] Ensure templates use existing assets wherever possible.
- [ ] Document which application-level configuration and business logic developers must provide.

---

Phase 12 — Library Authoring and Publishing Tools

12.1 Implement Library Scaffolding

- [ ] Implement "simplify library init".
- [ ] Generate a valid library manifest and initial directory structure.
- [ ] Support library metadata, maintainer information, and license selection.
- [ ] Support libraries containing multiple asset categories.
- [ ] Generate examples and documentation scaffolding.
- [ ] Provide a minimal asset authoring example for each supported initial category.

12.2 Implement Asset Creation

- [ ] Implement "simplify asset create".
- [ ] Allow authors to select the asset category.
- [ ] Generate the appropriate manifest structure.
- [ ] Generate implementation, test, documentation, and example directories where applicable.
- [ ] Support language and framework target declarations.
- [ ] Support installation-mode declarations.
- [ ] Support registry and package dependencies.
- [ ] Support preview metadata for compatible UI assets.

12.3 Implement Asset Validation and Building

- [ ] Implement "simplify asset validate".
- [ ] Validate manifest schemas and required metadata.
- [ ] Verify referenced files and source mappings.
- [ ] Validate dependency declarations and target compatibility.
- [ ] Check for unsafe paths and unsupported installation instructions.
- [ ] Verify that declared package dependencies are used or justified.
- [ ] Check that required documentation and tests exist.
- [ ] Implement "simplify library build".
- [ ] Produce versioned registry metadata and distributable artifacts.
- [ ] Generate integrity hashes for files and built artifacts.
- [ ] Verify that the generated artifacts can be consumed by the registry client and CLI.

12.4 Implement Publishing

- [ ] Define the official publishing process for simplify.dev libraries.
- [ ] Define external publisher identities and registry namespaces.
- [ ] Implement authentication and authorization for publishing.
- [ ] Implement immutable version publishing.
- [ ] Validate the complete library before publication.
- [ ] Store versioned metadata and implementation artifacts.
- [ ] Publish or update the relevant registry indexes.
- [ ] Prevent accidental replacement of already published immutable versions.
- [ ] Add release notes and changelog support.
- [ ] Implement deprecation and withdrawal workflows.
- [ ] Display publisher and ownership information in registry metadata.

---

Phase 13 — Web Application and Registry Browser

13.1 Establish the Web Application

- [ ] Create the "apps/web" application.
- [ ] Configure the application framework, styling, and routing.
- [ ] Establish the website's visual design system and navigation structure.
- [ ] Consume the actual UI package and shared tokens.
- [ ] Configure the registry client.
- [ ] Implement loading, empty, error, and not-found states.
- [ ] Establish responsive layouts for desktop and mobile.

13.2 Implement Registry Discovery

- [ ] Implement the registry landing page.
- [ ] Implement asset browsing by category.
- [ ] Implement search across asset names, descriptions, tags, and identifiers.
- [ ] Implement filters for category, language, framework, installation mode, and compatibility.
- [ ] Implement library detail pages.
- [ ] Implement publisher and maintainer information.
- [ ] Display version and compatibility information.
- [ ] Clearly distinguish official and external assets.
- [ ] Implement asset status indicators for experimental, stable, deprecated, and other defined states.

13.3 Implement Asset Documentation Pages

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

13.4 Implement Installation Interface

- [ ] Display copyable CLI installation commands on supported asset pages.
- [ ] Generate commands from the selected asset, version, and installation mode.
- [ ] Show the expected files and dependencies associated with installation.
- [ ] Show required environment variables and manual setup steps.
- [ ] Allow developers to switch installation modes where supported.
- [ ] Allow developers to select compatible versions.
- [ ] Keep installation instructions synchronized with the registry manifest.

---

Phase 14 — Live Preview and Configuration Studio

14.1 Establish the Preview System

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

14.2 Implement Component and Block States

- [ ] Define preview scenarios for loading, empty, error, pending, success, and disabled states.
- [ ] Allow documentation authors to define the available scenarios for each asset.
- [ ] Add controls for switching between supported states.
- [ ] Ensure preview controls do not alter the actual installed implementation.
- [ ] Test previews at common viewport sizes.
- [ ] Verify that previews reflect the installed version of the asset.

14.3 Implement Theme Studio

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

---

Phase 15 — Security, Compatibility, and Quality Assurance

15.1 Registry Security

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

15.2 CLI Security

- [ ] Validate all registry data before applying installation operations.
- [ ] Prevent path traversal and writes outside the intended project.
- [ ] Protect existing files and configuration during installation.
- [ ] Avoid logging credentials, environment variables, or sensitive paths unnecessarily.
- [ ] Avoid replacing actual environment secrets.
- [ ] Require explicit decisions for destructive operations.
- [ ] Validate package-manager commands and arguments.
- [ ] Test malformed registry data, interrupted downloads, and partial installation failures.

15.3 UI and Runtime Quality

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

15.4 Installer and Registry Compatibility

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

---

Phase 16 — Multi-Language and Framework Expansion

16.1 Prepare the Registry for Additional Ecosystems

- [ ] Review the registry schema to ensure language and framework implementations are represented independently of TypeScript assumptions.
- [ ] Define implementation target identifiers and version compatibility rules.
- [ ] Define how framework-specific dependencies and build instructions are represented.
- [ ] Define installation adapters for package managers and language-specific tooling.
- [ ] Define cross-language integration metadata for assets that communicate through APIs or other documented contracts.
- [ ] Ensure the registry can associate multiple implementations with one logical asset.
- [ ] Avoid forcing identical implementation APIs across languages.

16.2 Implement Additional Installer Adapters

- [ ] Define an installer adapter interface.
- [ ] Keep the initial TypeScript installer independent from future language-specific adapters.
- [ ] Implement project detection for one additional ecosystem.
- [ ] Implement dependency resolution for its package manager.
- [ ] Implement source and package installation where appropriate.
- [ ] Implement its configuration and lock-file handling.
- [ ] Add tests for detection, installation, updates, and compatibility.
- [ ] Document ecosystem-specific limitations.

16.3 Add Initial Non-TypeScript Assets

- [ ] Select a practical first ecosystem, such as Python or .NET, based on a real asset use case.
- [ ] Build one independently useful implementation for the selected ecosystem.
- [ ] Publish its target-specific manifest and documentation.
- [ ] Verify that it can be discovered and installed through the existing registry workflow.
- [ ] Add a cross-language integration example where a TypeScript frontend communicates with the new backend implementation.
- [ ] Verify that adding the ecosystem does not require changes to unrelated registry or UI implementations.

16.4 Expand Ecosystem Support

- [ ] Add further language and framework adapters based on actual demand and available implementations.
- [ ] Establish a compatibility test strategy for each supported ecosystem.
- [ ] Require genuine implementations and tests before advertising support.
- [ ] Document language-specific installation and customization conventions.
- [ ] Support ecosystem-specific packages, modules, source layouts, and build tools.

---

Phase 17 — Release, Documentation, and Operations

17.1 Developer Documentation

- [ ] Write the platform overview and architecture documentation.
- [ ] Document the registry data model and asset manifest specification.
- [ ] Document project initialization and configuration.
- [ ] Document package, source, and hybrid installation.
- [ ] Document asset authoring and library publishing.
- [ ] Document component composition and customization.
- [ ] Document logic isolation and integration contracts.
- [ ] Document Theme Studio and theme export.
- [ ] Document supported languages, frameworks, and runtimes.
- [ ] Provide complete examples for installing and extending the Agent Chat block.
- [ ] Provide troubleshooting guides for common registry and installer errors.

17.2 Package and CLI Release

- [ ] Configure package publishing for the initial official packages.
- [ ] Configure CLI release builds for supported platforms.
- [ ] Verify package exports and declaration files.
- [ ] Verify styles and token assets are included in published packages.
- [ ] Test installation from the public package registry.
- [ ] Configure automated release checks.
- [ ] Establish semantic versioning and changelog conventions.
- [ ] Document package support and deprecation policies.

17.3 Registry and Website Deployment

- [ ] Configure production hosting for the documentation application.
- [ ] Configure registry metadata and artifact distribution.
- [ ] Configure versioned artifact storage and caching.
- [ ] Configure publishing authentication and authorization.
- [ ] Configure deployment and rollback procedures.
- [ ] Add monitoring for registry availability and artifact delivery.
- [ ] Monitor CLI installation failures and registry errors without collecting unnecessary project or secret data.
- [ ] Establish backup and recovery procedures for registry metadata and published artifacts.

17.4 Initial Public Release

- [ ] Publish the core UI package.
- [ ] Publish the initial logic and blocks packages where package distribution is appropriate.
- [ ] Publish the initial official asset collection.
- [ ] Release the CLI with project initialization and installation support.
- [ ] Launch the registry browser and asset documentation.
- [ ] Launch Theme Studio with the initial token controls.
- [ ] Publish the Agent Chat block and its Vercel AI SDK integration.
- [ ] Publish the PostgreSQL storage integration and combined recipe.
- [ ] Validate the complete workflow in a fresh Next.js application.
- [ ] Publish release notes and known limitations.
- [ ] Establish a process for collecting feedback, reviewing issues, and prioritizing improvements.

---

Phase 18 — Post-Release Expansion

18.1 Improve the Registry Ecosystem

- [ ] Add public library discovery and publisher profiles.
- [ ] Add external registry configuration and management.
- [ ] Add library publishing workflows for community contributors.
- [ ] Add improved dependency visualization.
- [ ] Add asset compatibility and version comparison views.
- [ ] Add asset deprecation and migration guidance.
- [ ] Add curated collections of related assets.
- [ ] Establish a review process for official and community-published assets.

18.2 Expand Functional Assets

- [ ] Add authentication and authorization integration assets.
- [ ] Add reusable form workflows and form builders.
- [ ] Add advanced data tables and filtering blocks.
- [ ] Add notification and command palette blocks.
- [ ] Add file management and upload blocks.
- [ ] Add workflow and background-processing logic.
- [ ] Add storage and API integrations.
- [ ] Add additional dashboard and application-layout blocks.
- [ ] Add recipes combining independently maintained assets.

18.3 Improve Developer Experience

- [ ] Add more advanced update and merge capabilities.
- [ ] Add asset dependency visualization in the web application.
- [ ] Add project-aware installation previews where feasible.
- [ ] Improve error diagnostics and installation recovery.
- [ ] Add compatibility reports for published assets.
- [ ] Improve documentation generation and preview authoring.
- [ ] Add reusable authoring and validation tooling for external contributors.

18.4 Expand Design and Runtime Capabilities

- [ ] Expand component and block coverage based on repeated real-world use cases.
- [ ] Add additional theme presets and token controls.
- [ ] Improve visual regression and interaction testing infrastructure.
- [ ] Add framework-specific token generators.
- [ ] Add native implementations for other UI frameworks where justified.
- [ ] Maintain a consistent design language without forcing cross-framework component reuse.

---

Completion Criteria

The initial platform should not be considered complete merely because the CLI can download component files or the website can display previews.

The first usable release must demonstrate the complete installation and customization workflow.

- [ ] A developer can initialize simplify.dev in a fresh supported project.
- [ ] A developer can discover a library or asset through the web application.
- [ ] A developer can inspect its documentation, implementation requirements, and live preview.
- [ ] A developer can install an asset using package, source, or hybrid installation where supported.
- [ ] The CLI resolves dependencies and reports the files and configuration changes.
- [ ] Installed source can be inspected and customized directly.
- [ ] The installation record tracks versions and installed files.
- [ ] The CLI can identify modifications and produce a safe update plan.
- [ ] UI components use the shared token system and provide consistent customization APIs.
- [ ] Functional blocks implement real behaviour and handle relevant interaction states.
- [ ] Logic remains isolated from presentation where practical.
- [ ] Integrations connect through defined contracts rather than tightly coupling the core implementation to vendors.
- [ ] The Agent Chat block works with a custom transport and a supported AI integration.
- [ ] The web application renders actual asset implementations in its previews.
- [ ] Theme Studio changes are reflected in real components and blocks and can be exported.
- [ ] The registry can represent multiple language and framework implementations without redesigning its core model.
- [ ] Published assets pass schema, installation, compatibility, security, and quality validation.
- [ ] The complete workflow works in a separate consuming application outside the simplify.dev monorepo.

The initial release is successful when developers can install, configure, connect, customize, and maintain a complete functional feature without rebuilding its underlying implementation from scratch.
