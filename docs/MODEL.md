# simplify.dev

## 1. Overview

simplify.dev is a registry-driven developer platform for discovering, installing, customizing, and connecting reusable software building blocks.

It provides more than UI components. Developers can install complete interface blocks, reusable logic, integrations, libraries, and application templates instead of repeatedly building common functionality from scratch.

The platform is designed around three principles:

- Reusability: Build useful software capabilities once and make them available for installation across projects.
- Customizability: Give developers access to implementation details when needed, without sacrificing the convenience of managed packages.
- Composability: Make independently developed components, logic, and integrations work together through clearly defined interfaces.

The primary ecosystem will be TypeScript, React, and Next.js, but the registry and installation architecture must support implementations for other languages and frameworks.

simplify.dev consists of:

1. A registry that defines, indexes, versions, and distributes libraries and other installable assets.
2. A CLI that detects projects, resolves dependencies, and installs assets.
3. A web application for discovering, previewing, configuring, and installing assets.
4. A GitHub integration for creating, connecting, versioning, and publishing libraries from GitHub repositories.
5. A design system and token infrastructure for consistent, customizable interfaces.
6. An extensible ecosystem for publishing implementations across different languages and frameworks.

GitHub will be the primary way to create and maintain libraries. Developers should be able to use their existing GitHub repositories, branches, commits, tags, releases, and GitHub Actions workflows while using simplify.dev as the distribution and discovery platform.

The platform should not require developers to create or maintain all their library source code directly inside simplify.dev.

The central objective is to make it possible to install a substantial, well-engineered feature, connect it to an application's existing services, and customize it without rebuilding the entire feature.

## 2. Why simplify.dev Exists

Developers repeatedly implement similar functionality across different applications.

This includes:

- Authentication interfaces and flows.
- Agent chat interfaces and conversation management.
- Dashboards and navigation systems.
- Forms and validation.
- Data tables and filtering.
- File managers and upload workflows.
- Notifications and command palettes.
- Workflow orchestration and background processing.
- API clients and external service integrations.
- Storage adapters and reusable application logic.

Many of these implementations require considerable engineering effort. They involve more than writing a few components: they require state management, error handling, loading states, accessibility, responsive behaviour, integration logic, and edge-case handling.

Existing component libraries often focus on reusable visual elements. Some provide prebuilt blocks, but the underlying functionality may be limited or tightly coupled to a particular framework or service.

simplify.dev aims to make more substantial pieces of software reusable.

For example, a developer should be able to install:

- A provider-independent agent chat interface.
- Its reusable conversation and streaming logic.
- An integration with Vercel AI SDK.
- A storage integration for PostgreSQL.

The developer should not need to implement the entire chat system manually. They should configure the provider, credentials, database, and application-specific behaviour.

The same approach should apply to other categories of software, including non-visual logic and integrations.

### 2.1 GitHub as the Library Development Environment

Libraries should be developed and maintained using familiar software development workflows.

A developer should be able to:

1. Create a library from an existing GitHub repository or create a new repository for it.
2. Add simplify.dev metadata and organize its assets.
3. Continue developing locally or through GitHub's development tools.
4. Commit and push changes using normal Git workflows.
5. Use GitHub Actions to validate and publish library versions.
6. Connect the repository to a simplify.dev account.
7. Make published assets discoverable and installable through the registry.

This approach gives developers ownership of their source code and lets them benefit from GitHub's existing collaboration, review, automation, and version-control features.

simplify.dev should manage registry metadata, asset discovery, compatibility, distribution, and installation without replacing GitHub's role in source-code management.

## 3. Core Concepts

simplify.dev organizes installable assets into distinct categories. Each category has a specific responsibility.

### 3.1 UI Components

UI components are reusable visual building blocks.

Examples:

- Button
- Input
- Select
- Dialog
- Drawer
- Tooltip
- Dropdown Menu
- Tabs
- Data Table
- Scroll Area
- Form Field

Components provide polished default styles, accessible interactions, and consistent APIs.

They should work independently and be composable into larger interfaces.

### 3.2 Blocks

Blocks are larger, functional interface compositions built from multiple components and reusable logic.

Examples:

- Agent Chat Interface
- Dashboard Shell
- Application Navigation
- Authentication Forms
- Notification Center
- File Manager
- Multi-step Form
- Activity Feed
- Command Palette
- Onboarding Flow

A block should provide meaningful functionality, not just a static visual layout.

For example, an Agent Chat block should account for message rendering, conversation state, submission, streaming, cancellation, retry, loading, errors, and empty states.

Application-specific business rules, credentials, authorization, and persistence should remain configurable or owned by the consuming application.

### 3.3 Logic

Logic assets provide reusable behaviour without requiring a particular visual implementation.

Examples:

- Chat controller
- Form validation engine
- Workflow execution engine
- Pagination state
- Search and filtering
- File upload manager
- Retry and backoff utilities
- Conversation state management

Logic should be usable independently of UI components wherever possible.

### 3.4 Integrations

Integrations connect reusable components or logic to external technologies.

Examples:

- Vercel AI SDK
- Authentication providers
- PostgreSQL
- SQLite
- Object storage
- Payment providers
- External APIs
- Queue systems

Integrations should implement defined interfaces or adapters instead of forcing the core implementation to depend directly on a particular service.

An integration should clearly declare its dependencies, configuration requirements, supported environments, and setup instructions.

### 3.5 Recipes

Recipes combine multiple assets into a ready-to-configure solution.

For example:

`agent-chat-postgres`

Could combine:

- Agent Chat block.
- Chat logic.
- Vercel AI SDK integration.
- PostgreSQL conversation storage.

A recipe should describe the relationship between its dependencies and coordinate their installation and configuration.

It should not duplicate the implementations of the assets it combines.

### 3.6 Templates

Templates provide larger starting points for applications or substantial application sections.

Examples:

- SaaS Dashboard
- Admin Application
- AI Application Starter
- Documentation Platform
- Authentication Starter

Templates should be composed from existing assets whenever possible rather than independently reimplementing their functionality.

### 3.7 Libraries

A library is a distributable collection of related assets or a standalone reusable implementation.

A library may contain components, blocks, logic, integrations, or other related resources.

Libraries are the primary units developers create, maintain, and publish through simplify.dev.

A library should have:

- A unique identity.
- A connected source repository.
- Its own version history.
- One or more assets.
- Metadata and documentation.
- Declared dependencies and compatibility.
- A publishing configuration.

A library may contain multiple assets, and each asset should remain independently identifiable and installable where appropriate.

The registry should support both individual assets and libraries containing multiple assets.

## 4. Platform Architecture

The platform should be divided into independent systems with clearly defined responsibilities.

### 4.1 Registry

The registry is the central distribution and discovery system.

It stores metadata describing available assets and their implementations.

It should not be limited to storing a list of downloadable files. It must describe how an asset is installed, what it depends on, which environments it supports, and what configuration is required.

The registry is responsible for:

- Asset discovery and metadata.
- Library identity and ownership.
- Version information.
- Language and framework compatibility.
- Dependency relationships.
- Installation instructions.
- Source file references.
- Package dependencies.
- Environment requirements.
- Configuration requirements.
- Documentation references.
- Preview information.
- Licensing and attribution information.
- Published source snapshots or artifact references.

The registry should be independent of any particular programming language.

An asset can have multiple implementations for different languages or frameworks while retaining a shared identity and documentation structure.

The registry should also maintain a relationship between published versions and their original GitHub repository, commit, tag, or release.

GitHub remains the source of truth for repository history. The registry maintains the information required to discover and install published versions reliably.

### 4.2 CLI and Installer

The CLI is responsible for interacting with a developer's local project.

It should:

- Detect the project language and framework.
- Identify the package manager.
- Read the simplify.dev configuration.
- Resolve requested assets and dependencies.
- Select compatible implementations.
- Download source files where required.
- Install package dependencies.
- Apply supported configuration changes.
- Track installed assets.
- Detect installation conflicts.
- Compare installed versions with registry versions.
- Validate project configuration.
- Inspect library metadata.
- Initialize and validate library projects.
- Publish libraries when authorized.

The installer should be safe and predictable. It must not silently overwrite important project files, replace environment secrets, or execute arbitrary registry-provided scripts.

### 4.3 Web Application

The web application provides the visual interface for exploring and managing the registry.

It should allow developers to discover assets, inspect their implementations, preview their functionality, configure their appearance, and obtain installation instructions.

It should also provide library management capabilities, including:

- Connecting GitHub repositories.
- Creating libraries from repositories.
- Viewing repository and publishing information.
- Inspecting published versions.
- Managing library metadata.
- Viewing synchronization and publishing status.
- Managing connected repositories and permissions.

The web application and CLI must use the same registry definitions and installation metadata.

The website must not maintain separate implementations of components or blocks just for demonstration purposes.

### 4.4 GitHub Integration

GitHub is the primary source-control and library-development environment for simplify.dev.

The integration should allow developers to connect repositories to their simplify.dev accounts and publish libraries through familiar GitHub workflows.

It is responsible for:

- GitHub account authorization.
- Repository discovery and selection.
- Repository-to-library association.
- Initial library setup.
- Repository metadata synchronization.
- Commit and tag tracking.
- GitHub Actions publishing workflows.
- Release synchronization.
- Publishing validation.
- Webhook processing.
- Repository access and permission management.

The integration should not attempt to replace GitHub's Git functionality.

Developers should continue using GitHub for commits, branches, pull requests, code reviews, issues, releases, and collaboration.

simplify.dev should consume the relevant repository information and published source to power its registry.

### 4.5 Design System and Tokens

The design system provides the shared visual foundation for UI implementations.

It defines:

- Colors and semantic color roles.
- Typography.
- Spacing.
- Border radii.
- Shadows and elevations.
- Motion and transition values.
- Surface styles.
- Density and sizing conventions.
- Light and dark themes.

The token system should be independent of React and capable of generating framework-specific outputs.

This makes it possible to maintain a consistent visual identity across TypeScript applications, .NET applications, and future language ecosystems without forcing them to share the same UI implementation.

## 5. GitHub Integration and Library Lifecycle

GitHub should be the first-class environment for creating and maintaining libraries.

The integration should be designed around repository ownership, reproducible publishing, and clear version relationships.

### 5.1 Connecting GitHub

Developers should be able to connect their GitHub accounts to simplify.dev.

The preferred approach is a GitHub App installation with explicitly requested repository permissions.

This allows simplify.dev to interact with repositories the developer authorizes without requiring unrestricted access to their entire GitHub account.

The connection flow should:

1. Allow the developer to authorize simplify.dev through GitHub.
2. Let the developer select which repositories simplify.dev can access.
3. Retrieve repository metadata and relevant configuration files.
4. Allow the developer to create a new library or connect the repository to an existing library.
5. Validate the repository structure and library manifest.
6. Display the resulting library configuration and connection status.

Repository access should be limited to the permissions required by the integration.

Developers should be able to disconnect repositories or revoke access through GitHub.

### 5.2 Creating a Library from GitHub

GitHub should be the default library creation method.

A developer should be able to create a library in two ways:

Connect an existing repository

The developer selects an existing repository and imports it into simplify.dev.

The platform should inspect the repository, locate or generate the required library manifest, and guide the developer through configuring the library.

The existing repository structure should be preserved wherever possible.

Create a new repository for a library

The developer starts the library creation process from simplify.dev.

The platform can guide them through creating a new GitHub repository, initializing the required library structure, and connecting it to their simplify.dev account.

In both cases, the repository becomes the primary source for the library's implementation.

The platform should not require developers to maintain a separate copy of their library source code inside simplify.dev.

### 5.3 Repository Structure

A library should have a predictable structure.

For example:

```
agent-chat/
├── simplify/
│   ├── library.json
│   └── assets/
│       ├── blocks/
│       │   └── agent-chat.json
│       ├── logic/
│       │   └── chat-controller.json
│       └── integrations/
│           ├── vercel-ai.json
│           └── postgres.json
├── src/
│   ├── blocks/
│   │   └── agent-chat/
│   ├── logic/
│   │   └── chat-controller/
│   └── integrations/
│       ├── vercel-ai/
│       └── postgres/
├── docs/
├── examples/
├── previews/
├── README.md
├── CHANGELOG.md
└── package.json
```

The exact layout may vary by language and framework.

The registry must be able to understand the library independently of its source directory structure through its manifest and file mappings.

The platform should provide sensible defaults without forcing developers to adopt an unnecessarily rigid repository layout.

### 5.4 Repository Manifest

Every library should have a root manifest describing its identity, assets, and publishing configuration.

For example:

```
{
  "$schema": "https://simplify.dev/schema/library.json",
  "id": "agent-chat",
  "name": "Agent Chat",
  "description": "Reusable agent conversation interfaces and logic.",
  "version": "1.0.0",
  "license": "MIT",
  "assets": [
    "simplify/assets/blocks/agent-chat.json",
    "simplify/assets/logic/chat-controller.json",
    "simplify/assets/integrations/vercel-ai.json"
  ],
  "publishing": {
    "include": [
      "src/**",
      "simplify/**",
      "docs/**",
      "README.md",
      "CHANGELOG.md"
    ],
    "exclude": [
      "**/node_modules/**",
      "**/.env*",
      "**/.git/**",
      "**/dist/**"
    ]
  }
}
```

This is an initial conceptual schema. The final library specification should define validation rules, supported values, version compatibility, and the complete set of fields.

The manifest should describe the library rather than duplicate all the implementation details of its assets.

Each asset should have its own manifest describing its implementation and installation requirements.

### 5.5 Source of Truth

The connected GitHub repository should remain the authoritative source for library source code.

simplify.dev should maintain a relationship between a library version and the exact repository state from which it was published.

For each published version, the registry should record:

- GitHub repository identity.
- Repository owner and name.
- Source branch where relevant.
- Git commit SHA.
- Git tag or release, when applicable.
- Library version.
- Manifest version.
- Publication timestamp.
- Published artifact or immutable source snapshot.
- Validation results.

This ensures that an installed library version can be traced back to its original source.

The registry should not depend on a repository's current branch state to serve an older published version.

Published versions must remain reproducible even if the repository changes, branches are deleted, or newer commits are pushed.

### 5.6 Versioning

Library versions should follow Semantic Versioning where appropriate.

For example:

```
1.0.0
1.1.0
1.1.1
2.0.0
```

Developers should be able to use normal Git workflows to manage their source history.

Git tags and GitHub releases should be the preferred release markers for published library versions.

A publishing workflow should validate that the library version in its manifest matches the intended release version.

For example:

```
v1.2.0
```

Should correspond to:

```
{
  "version": "1.2.0"
}
```

The registry should prevent accidental duplicate or conflicting releases.

A published version should be immutable. If a release contains an error, the developer should publish a new version rather than silently replacing the existing one.

### 5.7 Publishing Through GitHub Actions

GitHub Actions should be the primary automated publishing mechanism.

simplify.dev should provide a reusable GitHub Action or publishing CLI command that developers can include in their repositories.

The workflow should support:

- Validation on pull requests.
- Validation on pushes to selected branches.
- Publishing development snapshots.
- Publishing stable releases from Git tags.
- Manual publishing through workflow dispatch.
- Publishing status reporting.

A typical workflow could look like:

```
name: Publish simplify.dev Library

on:
  push:
    tags:
      - "v*"

  workflow_dispatch:

permissions:
  contents: read

jobs:
  publish:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Publish library
        uses: simplify-dev/publish@v1
        with:
          token: ${{ secrets.SIMPLIFY_TOKEN }}
```

The example is illustrative. The final Action interface, authentication mechanism, and supported inputs should be defined separately.

The checkout step is important because the publishing process must operate on the exact repository commit associated with the workflow run.

The publishing Action should:

1. Validate the repository and library manifest.
2. Resolve the commit and intended version.
3. Validate referenced asset manifests and source files.
4. Check dependencies and implementation targets.
5. Exclude files that should not be published.
6. Create a reproducible publication artifact.
7. Submit the artifact and metadata to simplify.dev.
8. Wait for registry validation and publication results.
9. Report the resulting library version and registry URL.

The Action should fail clearly when validation or publication fails.

### 5.8 Automatic Synchronization

Developers should have control over how repository changes are synchronized with simplify.dev.

The integration should support multiple synchronization strategies.

Release-based publishing

Only Git tags or GitHub releases trigger stable publication.

This should be the default strategy for production libraries.

Branch-based development publishing

Pushes to configured branches can publish development snapshots.

For example, a push to `main` may produce a development version associated with its commit SHA.

These snapshots should be distinguishable from stable releases and should not silently replace stable versions.

Manual publishing

Developers can trigger a publication from GitHub Actions or the simplify.dev web application.

This is useful when a library requires an explicit release decision.

Webhook-based synchronization

simplify.dev can use GitHub webhooks to receive repository events.

Relevant events may include:

- Push.
- Tag creation.
- Release publication.
- Repository rename.
- Repository deletion.
- Installation permission changes.

Webhooks should primarily keep repository and library metadata current, trigger appropriate validation, and update synchronization status.

They should not publish every repository change as a stable release.

All webhook processing must be authenticated, idempotent, and resilient to retries and out-of-order delivery.

### 5.9 GitHub Features Remain Available

Connecting a repository to simplify.dev should not restrict how developers use GitHub.

Developers should continue to use:

- Branches.
- Commits.
- Pull requests.
- Code reviews.
- GitHub Issues.
- GitHub Projects.
- GitHub Discussions.
- GitHub Actions.
- Git tags.
- GitHub Releases.
- Repository visibility and access controls.

simplify.dev should complement these capabilities.

A developer should not have to edit source code through the simplify.dev website or use simplify.dev as their only library development environment.

The website should provide library management, discovery, configuration, and publishing visibility while GitHub remains the primary development environment.

### 5.10 Library Creation Without GitHub

GitHub should be the primary and recommended library creation method.

However, the platform should avoid making GitHub a permanent architectural requirement.

A future implementation may support direct CLI publishing or other Git hosting providers.

These alternative methods should use the same library manifest, validation rules, versioning model, and registry publishing contracts.

The registry should not depend on GitHub-specific concepts for its fundamental asset model.

## 6. Installation Architecture

Installation should support three modes.

### 6.1 Package Installation

Package installation uses conventional package managers such as npm, pnpm, or yarn.

Example:

```
pnpm add @scope/ui
pnpm add @scope/blocks
```

The implementation remains inside the installed package and is consumed through its public API.

This mode is suitable for:

- Stable UI primitives.
- Shared utilities.
- Token packages.
- Independently maintained libraries.
- Implementations that do not require frequent internal modifications.

Package users should still have customization options through themes, variants, props, slots, callbacks, and supported extension points.

### 6.2 Source Installation

Source installation downloads an asset's implementation and places it inside the consuming project.

Example:

```
simplify add ui/button
simplify add blocks/agent-chat
simplify add logic/chat-controller
```

The developer owns the installed source and can modify its implementation directly.

This mode is particularly useful for:

- Complex UI blocks.
- Application-specific feature implementations.
- Reusable logic that may need modification.
- Integrations requiring project-specific adjustments.

Source installation should not require copying every dependency into the project. Dependencies that are better maintained as packages should remain external package dependencies.

### 6.3 Hybrid Installation

Hybrid installation combines source installation with package dependencies.

For example, installing an Agent Chat integration may:

1. Copy the chat interface and selected logic into the project.
2. Install the required AI SDK packages.
3. Add the required integration adapter.
4. Update simplify.dev installation metadata.
5. Generate or update environment-variable examples.
6. Provide instructions for configuring external services.

This should be the preferred installation mode for many functional blocks and integrations.

### 6.4 Installation Configuration

The project should have a configuration file such as:

`simplify.config.json`

Example:

```
{
  "$schema": "https://simplify.dev/schema/config.json",
  "version": 1,
  "project": {
    "language": "typescript",
    "framework": "next"
  },
  "installation": {
    "defaultMode": "source",
    "packageManager": "auto"
  },
  "paths": {
    "ui": "@/components/ui",
    "blocks": "@/components/blocks",
    "logic": "@/lib",
    "integrations": "@/lib/integrations",
    "hooks": "@/hooks",
    "styles": "@/styles"
  },
  "registries": {
    "@simplify": "https://simplify.dev/r/{name}.json"
  }
}
```

The installer should automatically detect common project settings and provide sensible defaults.

Developers should be able to override paths, installation modes, registries, and other settings when necessary.

It should also support monorepos, multiple applications, custom source directories, and different import aliases.

For example, a monorepo might place UI blocks inside an application's source directory while keeping reusable logic inside a shared package.

### 6.5 Installation Commands

The CLI should expose a consistent command structure.

Illustrative commands:

```
simplify init

simplify add ui/button
simplify add blocks/agent-chat
simplify add logic/chat-controller
simplify add integrations/agent-chat/vercel-ai
simplify add recipes/agent-chat-postgres

simplify list
simplify info blocks/agent-chat
simplify diff blocks/agent-chat
simplify update blocks/agent-chat
simplify remove blocks/agent-chat
simplify doctor
```

Library-related commands may include:

```
simplify library init
simplify library connect
simplify library validate
simplify library build
simplify library publish
simplify library info
```

Commands should support options for installation mode, target paths, versions, dry runs, and other relevant configuration.

The installer should show a summary of files, dependencies, and configuration changes before applying them when appropriate.

### 6.6 Tracking Installed Assets

Source-installed assets must be tracked so that the CLI can identify their original versions and manage updates.

A local directory can contain installation metadata:

```
.simplify/
├── lock.json
└── metadata/
```

An illustrative lock file:

```
{
  "version": 1,
  "installed": [
    {
      "id": "blocks/agent-chat",
      "version": "1.0.0",
      "mode": "source",
      "files": [
        "src/components/blocks/agent-chat/index.tsx",
        "src/components/blocks/agent-chat/message.tsx"
      ]
    }
  ]
}
```

The lock file should record enough information to identify installed assets, versions, files, dependencies, and relevant installation decisions.

Updates must account for user modifications.

The CLI should compare the installed implementation with the new registry version and identify modified files before applying changes.

It should not automatically overwrite customized source files.

A future implementation can support three-way merging and more advanced update conflict resolution.

## 7. Creating and Publishing Libraries

Creating new libraries and adding assets to the registry should be a first-class workflow.

The platform should support official libraries maintained by simplify.dev and external libraries published by independent developers.

GitHub should be the primary library creation and publishing environment.

### 7.1 Library Structure

A library should have a predictable structure.

For example:

```
agent-chat/
├── simplify/
│   ├── library.json
│   └── assets/
│       ├── blocks/
│       │   └── agent-chat.json
│       ├── logic/
│       │   └── chat-controller.json
│       └── integrations/
│           ├── vercel-ai.json
│           └── postgres.json
├── src/
│   ├── blocks/
│   │   └── agent-chat/
│   ├── logic/
│   │   └── chat-controller/
│   └── integrations/
│       ├── vercel-ai/
│       └── postgres/
├── docs/
├── examples/
├── previews/
├── README.md
├── CHANGELOG.md
└── package.json
```

The exact layout may vary by language and framework, but the registry must be able to understand the library independently of its source directory structure.

### 7.2 Asset Manifest

Every published asset should have a manifest describing its implementation and requirements.

Example:

```
{
  "id": "blocks/agent-chat",
  "name": "Agent Chat",
  "version": "1.0.0",
  "kind": "block",
  "description": "A customizable agent conversation interface.",
  "targets": [
    {
      "language": "typescript",
      "framework": "react",
      "runtime": ["browser"]
    },
    {
      "language": "typescript",
      "framework": "next",
      "runtime": ["browser"]
    }
  ],
  "installation": {
    "modes": ["source", "hybrid"]
  },
  "registryDependencies": [
    "logic/chat-controller"
  ],
  "packageDependencies": [],
  "files": [
    {
      "source": "src/agent-chat.tsx",
      "target": "blocks/agent-chat/index.tsx"
    }
  ],
  "documentation": {
    "readme": "README.md"
  },
  "preview": {
    "entry": "previews/agent-chat.tsx"
  }
}
```

This is an initial conceptual schema. The final registry specification should define validation rules, supported values, version compatibility, and the complete set of fields.

Manifests should support:

- Asset identity and metadata.
- Version and release information.
- Asset category.
- Language, framework, and runtime targets.
- Installation modes.
- Package dependencies.
- Registry dependencies.
- Source file mappings.
- Configuration requirements.
- Environment variables.
- Setup instructions.
- Database migrations where applicable.
- Documentation and examples.
- Preview information.
- Licensing and attribution.

### 7.3 Adding a New Asset

A contributor should be able to add a new asset to a library without changing the registry implementation.

An illustrative workflow:

```
simplify library init
simplify asset create
simplify asset validate
simplify library build
```

The author should be able to define the asset category, implementation targets, dependencies, installation requirements, documentation, and preview.

The publishing process should validate the manifest, verify referenced files, check dependency declarations, and ensure that supported installation modes are correctly defined.

### 7.4 Publishing a Library

A library should be published from a known repository state.

The recommended workflow is:

1. Develop the library locally or through GitHub.
2. Commit and push changes to the connected repository.
3. Run validation through GitHub Actions.
4. Create a Git tag or GitHub release for the intended version.
5. Trigger the simplify.dev publishing workflow.
6. Validate the library and its assets.
7. Publish an immutable version to the registry.
8. Make the published version available for discovery and installation.

The simplify.dev website should display the publishing status and the corresponding GitHub commit, tag, or release.

Publishing should not require developers to manually upload every source file through the website.

### 7.5 Library Versioning

Libraries and assets should use explicit versions.

The registry should support:

- Versioned releases.
- Compatibility declarations.
- Dependency version constraints.
- Deprecation notices.
- Release notes.
- Version-specific metadata.
- GitHub repository and commit references.

Installed source should remain reproducible. A developer should be able to inspect which version was installed and understand what changed between releases.

The platform should avoid silently replacing an implementation with a newer version.

## 8. Web Application: Registry Browser and Theme Studio

The web application is an important part of simplify.dev.

It should function as a discovery platform, documentation system, installation interface, library management environment, and configuration environment.

Its experience can take inspiration from shadcn's component browsing and installation model, while extending that model to support functional blocks, logic, integrations, and multi-language libraries.

### 8.1 Asset Discovery

Developers should be able to browse assets by category:

- UI Components
- Blocks
- Logic
- Integrations
- Recipes
- Templates
- Libraries

The registry browser should support:

- Search.
- Category filters.
- Language and framework filters.
- Installation-mode filters.
- Compatibility information.
- Version information.
- Library pages.
- Author and publisher information.

The website should make the difference between a component, block, integration, and complete recipe clear.

### 8.2 Asset Detail Pages

Each asset should have a dedicated documentation and preview page.

A page should provide:

1. Asset overview and purpose.
2. Live preview.
3. Installation command.
4. Supported languages and frameworks.
5. Supported installation modes.
6. Dependencies and requirements.
7. Configuration instructions.
8. Customization documentation.
9. Available variants and states.
10. Usage examples.
11. Implementation information.
12. Version history.
13. Source repository and relevant GitHub references.

For blocks and integrations, the page should also explain the built-in logic, supported adapters, callbacks, and responsibilities that remain with the consuming application.

### 8.3 Library Pages

Each library should have a dedicated page containing:

- Library description and documentation.
- Publisher information.
- Connected GitHub repository.
- Available assets.
- Latest published version.
- Version history.
- Supported languages and frameworks.
- Dependencies and compatibility.
- Installation instructions.
- Release notes.
- License information.
- Source and issue-tracker links, where available.

The library page should make it clear whether a library is maintained by simplify.dev or an external publisher.

### 8.4 Live Previews

The web application should render the actual implementation that developers will install or consume.

Previews should not be separate mock implementations.

For TypeScript and React assets, the documentation application can load compatible implementations from the registry's development or published package sources.

The preview system should support:

- Interactive previews.
- Different sizes and variants.
- Light and dark themes.
- Loading, empty, error, and success states.
- Responsive viewport sizes.
- Configurable props.
- Customization examples.
- Code examples corresponding to the preview.

Where an asset requires external services, its preview should use safe demonstration data or a controlled mock adapter. It must not expose credentials or depend on a developer's private services.

### 8.5 Installation Instructions

Every asset page should provide the appropriate installation commands.

For example:

```
simplify add blocks/agent-chat
```

The website should clearly show what the command installs, which dependencies are required, and which configuration steps remain.

Installation instructions should be derived from the registry metadata rather than manually maintained separately.

### 8.6 Theme Studio

Theme Studio allows developers to configure the visual appearance of compatible UI components and blocks.

It should provide live previews so that changes are immediately reflected across the rendered interface.

Developers should be able to configure:

- Primary and secondary colors.
- Accent colors.
- Background and foreground colors.
- Muted surfaces and text.
- Card and popover surfaces.
- Borders and focus rings.
- Success, warning, danger, and informational colors.
- Typography and type scale.
- Border radii.
- Spacing and density.
- Shadows and elevation.
- Motion and transition preferences.
- Light and dark themes.

Theme Studio should provide simple and advanced configuration modes.

The simple mode should allow developers to define a small set of primary design choices and derive suitable supporting tokens.

The advanced mode should expose individual semantic tokens for finer control.

Semantic roles must remain distinct. For example, changing the primary brand color should not change destructive or error colors.

Theme presets should be available as starting points.

### 8.7 Exporting Themes

The theme editor should export the configuration in reusable formats.

Possible outputs include:

- CSS custom properties.
- JSON theme configuration.
- TypeScript theme definitions.
- Generated framework-specific resources.

The generated theme must use the same token definitions as the component and block implementations.

This prevents the documentation website, preview system, and installed packages from maintaining separate theme implementations.

## 9. Building Customizable UI Components

UI components must be designed to provide both good defaults and meaningful customization.

The objective is not to expose every internal implementation detail as a prop. It is to define stable extension points that allow developers to adapt components without fighting their internal structure.

### 9.1 Design Tokens

Components should consume semantic design tokens instead of hardcoded brand values.

For example:

```
:root {
  --sd-primary: #202020;
  --sd-primary-foreground: #ffffff;

  --sd-background: #ffffff;
  --sd-foreground: #171717;

  --sd-muted: #f5f5f5;
  --sd-muted-foreground: #737373;

  --sd-border: #e5e5e5;
  --sd-ring: #737373;

  --sd-radius-sm: 0.375rem;
  --sd-radius-md: 0.625rem;
  --sd-radius-lg: 0.875rem;
}
```

These values are illustrative. Actual themes should be generated from the shared token definitions.

Components should use the semantic tokens rather than defining their own unrelated color and spacing systems.

### 9.2 Compound Components

Components that contain multiple related parts should support clear composition.

For example:

```
<Dialog.Root open={open} onOpenChange={setOpen}>
  <Dialog.Trigger>
    Open dialog
  </Dialog.Trigger>

  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Confirm action</Dialog.Title>
      <Dialog.Description>
        Review this operation before continuing.
      </Dialog.Description>
    </Dialog.Header>

    <Dialog.Footer>
      <Dialog.Close>Cancel</Dialog.Close>
      <Button>Continue</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
```

Compound components should provide predictable relationships between their parts, appropriate accessibility behaviour, and sensible default styling.

Their internal implementation should remain encapsulated.

### 9.3 Controlled and Uncontrolled State

Components should support controlled state where applications need to manage behaviour externally.

They should also provide sensible internal defaults for common usage.

For example:

```
<Dialog.Root defaultOpen={false}>
  ...
</Dialog.Root>
```

And:

```
<Dialog.Root
  open={open}
  onOpenChange={setOpen}
>
  ...
</Dialog.Root>
```

State ownership must be clear. Components should not create hidden state conflicts between internal and external controllers.

### 9.4 Customization APIs

The public component API should use a consistent set of customization mechanisms.

These should include:

- `className` for root-level styling.
- Slot-level style overrides.
- `slotProps` for configuring internal elements.
- `slots` for replacing meaningful sections.
- Variants and sizes.
- Theme tokens.
- Controlled state and callbacks.

For example:

```
<AgentChat
  controller={chatController}
  slots={{
    header: <CustomHeader />,
    emptyState: <WelcomeScreen />,
    message: CustomMessageRenderer,
    composer: <CustomComposer />
  }}
/>
```

Slots should represent meaningful extension points rather than every DOM element inside the component.

A component should be customizable without requiring an excessive number of unrelated props.

### 9.5 Accessibility

Accessibility is part of component functionality, not an optional styling feature.

Components should account for:

- Appropriate semantic HTML.
- Accessible names and descriptions.
- Keyboard navigation.
- Focus management.
- Focus restoration.
- Screen-reader announcements.
- Correct dialog and menu behaviour.
- Reduced-motion preferences.
- Accessible form labels and validation messages.

Headless foundations may be used where appropriate, but simplify.dev should maintain consistent public APIs and behaviour across its own components.

### 9.6 Component Implementation Boundaries

Components should have clear internal boundaries.

A typical component may separate:

```
dialog/
├── dialog.tsx
├── dialog-content.tsx
├── dialog-trigger.tsx
├── dialog-header.tsx
├── dialog-footer.tsx
├── dialog.styles.ts
├── dialog.types.ts
└── index.ts
```

The exact file layout should be based on component complexity rather than enforcing unnecessary file separation for every small component.

Public exports should be deliberate. Internal utilities should not automatically become part of the public API.

## 10. Functional Blocks and Logic Isolation

Blocks should be treated as complete reusable feature units.

They must provide meaningful interaction behaviour while remaining independent of application-specific business logic.

### 10.1 Separate Presentation from Behaviour

A block should not have to own every part of its functionality.

For example, an Agent Chat implementation can be divided into:

```
agent-chat/
├── ui/
│   ├── agent-chat.tsx
│   ├── message-list.tsx
│   ├── message-item.tsx
│   ├── composer.tsx
│   └── states/
├── logic/
│   ├── chat-controller.ts
│   ├── message-state.ts
│   └── conversation-state.ts
├── adapters/
│   ├── transport.ts
│   └── storage.ts
├── types/
│   └── index.ts
└── index.ts
```

This is a conceptual organization. The actual structure should keep independently reusable logic separate from UI-specific implementation.

The UI should consume a stable controller or state interface.

The controller should not depend on React rendering details unless it is explicitly a React-specific adapter.

### 10.2 Integration Boundaries

The core chat functionality should not depend directly on Vercel AI SDK, OpenAI, or another provider.

Instead, define interfaces for communication and storage.

For example:

```
interface ChatTransport {
  send(
    messages: Message[],
    options?: SendOptions
  ): Promise<ChatResponse>;
}

interface ConversationStore {
  load(conversationId: string): Promise<Message[]>;
  save(
    conversationId: string,
    messages: Message[]
  ): Promise<void>;
}
```

These interfaces are illustrative and should be adapted to the requirements of streaming, cancellation, error handling, and persistence.

An AI provider integration can implement the transport contract.

A database integration can implement the storage contract.

This keeps the feature independent of specific vendors and allows applications to use existing services.

### 10.3 Example Usage

A developer should be able to use the block with their own implementation:

```
const chat = useChatController({
  transport: myTransport,
  storage: myConversationStore
});

<AgentChat controller={chat} />
```

Or install a supported integration that provides the controller configuration:

```
const chat = useVercelAIChat({
  api: "/api/chat"
});

<AgentChat controller={chat.controller} />
```

The exact APIs should be defined by the asset contracts.

The important requirement is that the interface, reusable chat behaviour, AI integration, and storage implementation remain separate.

### 10.4 Application-Owned Responsibilities

The platform should not assume ownership of application-specific concerns.

Unless an asset explicitly provides a configurable implementation, the consuming application remains responsible for:

- Authentication.
- Authorization.
- User permissions.
- Credentials and secrets.
- Business rules.
- Database ownership.
- Deployment configuration.
- Application-specific persistence policies.
- Data protection and retention policies.

Integrations should make these responsibilities easier to implement without hiding them.

### 10.5 Avoid Unnecessary Global Dependencies

A mandatory global provider should not be required for basic components.

Theme styling should primarily use CSS custom properties and theme attributes.

Component-specific state should remain internal or controlled.

Feature-specific controllers should be provided by the relevant logic package or block.

A global provider should only be introduced for shared runtime infrastructure that genuinely requires it.

This keeps the core UI lightweight and allows developers to install only the capabilities they need.

## 11. Performance and Runtime Requirements

Performance must be considered during implementation, packaging, installation, and rendering.

The platform should not become a large runtime that every consuming application must load.

### 11.1 Package Size

Packages should support tree-shaking and deliberate public exports.

Optional features should not be pulled into an application just because the developer imports one component.

Heavy dependencies should remain optional or isolated behind separate integration packages where appropriate.

### 11.2 React and Next.js

React should be the primary UI target.

Next.js compatibility must be considered during component design and packaging.

Components should preserve appropriate server and client boundaries.

Client-only behaviour should be marked and bundled deliberately rather than applying client directives indiscriminately across the entire library.

Server-compatible components should not unnecessarily require client-side JavaScript.

### 11.3 Rendering

Components should avoid unnecessary rerenders, excessive state duplication, unnecessary context updates, and expensive work during rendering.

Feature logic should not be tightly coupled to visual rendering when it can be implemented independently.

Large or optional features should use dynamic imports or lazy loading where appropriate.

### 11.4 Styling

The default styling system should be predictable and efficient.

Components should avoid broad global resets that unintentionally change the consuming application's styles.

If Tailwind is used for implementation, generated classes must be discoverable by the consumer's build process or included through a compatible compiled CSS output.

The public installation process should not require consumers to reverse-engineer internal styling configuration.

### 11.5 Animation

Motion should be purposeful and consistent.

The platform should provide shared motion tokens and sensible animation conventions.

Animations should:

- Clarify interactions and state changes.
- Respect reduced-motion preferences.
- Avoid unnecessary layout recalculations.
- Remain responsive on lower-powered devices.
- Avoid forcing heavy animation dependencies on components that do not need them.

Scrolling, carousels, swipe interactions, and drag behaviour should be implemented as deliberate capabilities rather than making every scrollable region behave like a carousel.

## 12. Multi-language and Framework Support

TypeScript, React, and Next.js will be the primary implementation targets.

However, the registry, manifest format, and installer should be designed to support other languages and frameworks without requiring a separate platform for each ecosystem.

### 12.1 Language-Aware Assets

An asset should declare its supported language, framework, and runtime.

For example:

```
agent-chat/
├── typescript/
│   ├── react/
│   └── next/
├── python/
│   ├── fastapi/
│   └── django/
└── dotnet/
    └── aspnet/
```

Not every asset needs implementations for every language.

The registry should allow one logical asset to have multiple implementations, each with its own dependencies, configuration, and compatibility requirements.

### 12.2 Framework-Specific Implementations

Implementations should follow the conventions of their target ecosystems.

A React component should use React APIs.

A Python service should use appropriate Python patterns.

A .NET library should follow .NET conventions.

The platform should not attempt to force identical internal implementations or APIs across languages.

What should remain consistent is:

- Asset identity.
- Registry metadata.
- Installation model.
- Versioning.
- Documentation structure.
- Dependency declarations.
- Compatibility information.
- Integration contracts where cross-language communication is required.

### 12.3 Cross-Language Integration

Different implementations should be able to work together through documented contracts.

For example, a React chat interface could communicate with a Python FastAPI backend.

The React implementation and Python implementation would remain separate assets, connected through a defined HTTP or streaming protocol.

The registry should be able to describe these relationships so the installer can select compatible combinations.

### 12.4 Progressive Ecosystem Expansion

TypeScript and React should receive the earliest and deepest implementation support.

Other ecosystems should be introduced as genuine implementations become available and can be tested properly.

The platform should not claim support for a language or framework merely because a registry manifest can describe it.

Each published implementation must have its own validation, documentation, compatibility requirements, and installation tests.

## 13. Registry and Web Application Scalability

The platform should be designed so that new asset categories, libraries, languages, and integrations can be introduced without redesigning its core systems.

### 13.1 Registry Extensibility

The registry should use a stable asset metadata contract with extensible, validated target-specific metadata.

The core registry should not contain special installation logic for every individual library.

An asset's manifest should describe its requirements, while the installer should interpret supported metadata consistently.

New asset categories should be introduced through explicit schema extensions rather than ad hoc fields.

### 13.2 Documentation Extensibility

The documentation website should discover assets through the registry.

Adding a new component or block should not require creating an entirely new documentation page implementation.

Each asset should provide documentation, preview information, and supported metadata using a shared format.

The website should select the appropriate renderer for the asset category and implementation target.

Some assets may require specialized preview renderers, particularly non-visual logic or implementations that cannot run safely in the browser.

### 13.3 Independent Services

The registry, CLI, documentation application, preview infrastructure, GitHub integration, and token tooling should have clear boundaries.

They should communicate through defined contracts rather than importing each other's internal implementation.

The CLI should not depend on the documentation application's internal code.

The documentation website should consume registry data instead of maintaining its own asset catalogue.

The GitHub integration should handle repository authorization and synchronization without owning the registry's fundamental asset model.

Token generation should not depend on React.

This separation allows the platform to evolve each system independently.

### 13.4 Storage and Distribution

Registry metadata, documentation assets, and implementation files should be distributed through an appropriate versioned storage and delivery system.

The design should allow the registry catalogue and asset files to be cached independently.

The platform should support versioned, reproducible downloads and avoid making every installation depend on a live documentation application or GitHub repository.

GitHub should remain the source for library development, while simplify.dev should maintain reliable published artifacts for distribution.

## 14. Security and Trust

Because simplify.dev installs source code and dependencies into other people's projects, registry security is a core requirement.

GitHub integration introduces additional responsibilities around repository access, publishing credentials, and automated workflows.

The platform should:

- Validate manifests before publishing.
- Verify referenced files and package dependencies.
- Clearly identify publishers.
- Track asset versions and changes.
- Display required permissions and configuration.
- Avoid silently executing arbitrary installation scripts.
- Avoid overwriting project secrets.
- Show file modifications before applying potentially destructive changes.
- Support license and attribution metadata.
- Provide a way to report malicious or compromised assets.
- Support deprecation and removal of unsafe versions.
- Clearly distinguish official simplify.dev assets from community-published assets.

### 14.1 GitHub Authorization

The GitHub integration should request only the permissions it needs.

Repository access should be explicitly authorized by the repository owner or an organization administrator with appropriate permissions.

The platform should:

- Use a GitHub App where practical.
- Avoid requesting unrestricted account access.
- Store credentials securely.
- Support access revocation.
- Handle repository permission changes.
- Avoid exposing installation tokens or credentials to the browser.
- Avoid logging sensitive authorization data.

### 14.2 Publishing Authentication

GitHub Actions must authenticate securely when publishing to simplify.dev.

The initial implementation may use a dedicated, scoped publishing token stored as a GitHub Actions secret.

The token should:

- Be limited to publishing operations.
- Be associated with the relevant account or library.
- Be revocable.
- Have a clear expiration or rotation policy.
- Never be committed to the repository.
- Never be exposed in workflow logs.

A future implementation should consider short-lived credentials through a trusted identity mechanism such as GitHub Actions OIDC, reducing the need for long-lived publishing secrets.

### 14.3 Workflow and Source Validation

GitHub Actions workflows and repository contents should be treated as untrusted input.

The publishing service should not execute arbitrary repository code as part of registry ingestion.

The publishing process should:

- Validate manifest structure.
- Verify source paths remain within the repository.
- Reject prohibited or sensitive files.
- Exclude credentials, environment files, and unnecessary build artifacts.
- Validate dependency declarations.
- Enforce artifact size limits.
- Verify the repository and commit associated with the publication.
- Prevent duplicate or conflicting version publication.
- Record the publishing identity and source commit.

External libraries should be treated as third-party code.

A reviewed or verified status should only be assigned after an actual review process.

## 15. Recommended Repository Structure

The platform should use a monorepo initially, with clear package and application boundaries.

An illustrative structure:

```
simplify/
├── apps/
│   ├── web/
│   │   ├── app/
│   │   ├── features/
│   │   │   ├── registry/
│   │   │   ├── libraries/
│   │   │   ├── github/
│   │   │   ├── theme-studio/
│   │   │   ├── previews/
│   │   │   └── installation/
│   │   └── components/
│   │
│   └── registry-api/
│
├── packages/
│   ├── registry/
│   │   ├── schema/
│   │   ├── resolver/
│   │   └── client/
│   │
│   ├── github/
│   │   ├── authorization/
│   │   ├── repositories/
│   │   ├── webhooks/
│   │   └── publishing/
│   │
│   ├── cli/
│   │   ├── commands/
│   │   ├── detection/
│   │   ├── installation/
│   │   ├── dependency-resolution/
│   │   └── updates/
│   │
│   ├── tokens/
│   │   ├── source/
│   │   ├── generators/
│   │   └── outputs/
│   │
│   ├── ui/
│   │   ├── src/
│   │   │   ├── primitives/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── internal/
│   │   │   └── index.ts
│   │   └── styles/
│   │
│   ├── interaction/
│   │   ├── chat/
│   │   ├── forms/
│   │   ├── navigation/
│   │   └── state/
│   │
│   ├── blocks/
│   │   ├── chat/
│   │   ├── dashboard/
│   │   ├── navigation/
│   │   └── forms/
│   │
│   └── tooling/
│       ├── asset-validator/
│       ├── library-builder/
│       └── preview-runtime/
│
├── registry/
│   ├── ui/
│   ├── blocks/
│   ├── logic/
│   ├── integrations/
│   ├── recipes/
│   └── templates/
│
├── schemas/
│   ├── registry/
│   ├── configuration/
│   ├── assets/
│   └── libraries/
│
├── docs/
│   ├── architecture/
│   ├── specifications/
│   └── development/
│
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

This structure is a starting point, not a requirement to create every package immediately.

Packages should be introduced when they represent a meaningful boundary or independently reusable capability.

For example, the interaction package should only be separated when the logic is sufficiently independent from the UI implementation.

The GitHub integration should remain separate from the registry's core asset and versioning contracts.

The monorepo should not become an excuse to split every module into a separate package.

## 16. Development and Quality Standards

Every published asset should meet the standards appropriate to its category.

### 16.1 UI Quality

UI components and blocks must have a consistent visual standard.

The design direction should be calm, professional, mature, and premium.

Implementations should prioritize:

- Clear visual hierarchy.
- Consistent typography.
- Deliberate spacing.
- Restrained and meaningful color usage.
- Balanced surfaces and borders.
- Readable content.
- Responsive layouts.
- Smooth and purposeful transitions.
- Consistent interaction feedback.

The goal is to provide interfaces that can be used in serious applications without requiring developers to redesign every installed block.

### 16.2 Interaction States

Applicable components and blocks must account for relevant states.

These include:

- Initial loading.
- Skeleton loading.
- Empty data.
- Errors.
- Pending actions.
- Success.
- Disabled states.
- Network interruption.
- Long content.
- Responsive layouts.

State implementations should be configurable and replaceable where appropriate.

Skeletons should reflect the content they represent instead of relying exclusively on generic placeholder shapes.

### 16.3 Testing

Tests should cover more than successful rendering.

Depending on the asset category, validation should include:

- Unit tests.
- Integration tests.
- Accessibility checks.
- Keyboard interaction.
- State transitions.
- Loading and error scenarios.
- Responsive behaviour.
- Package installation.
- Source installation.
- Dependency resolution.
- Framework compatibility.
- Update and conflict handling.

Visual regression testing should be used for important UI components and blocks.

### 16.4 Publishing Requirements

Before publication, an asset should have:

- Valid metadata.
- Version information.
- Dependency declarations.
- Documentation.
- Supported implementation targets.
- Installation instructions.
- Appropriate tests.
- Licensing information.

A block that only renders a static example should not be presented as a fully functional block.

Library publishing should additionally validate:

- The root library manifest.
- All referenced asset manifests.
- Source file mappings.
- Repository and commit identity.
- Version consistency.
- Required dependencies.
- Publication file inclusion and exclusion rules.
- License and attribution metadata.

A successful GitHub Actions run should not automatically mean an asset is trusted or reviewed. It means the configured validation and publishing process completed successfully.

## 17. Initial Implementation Strategy

Development should proceed by validating the platform's most important architectural capabilities before expanding its asset catalogue.

### 17.1 Platform Foundations

Implement:

- Monorepo structure.
- Registry metadata schema.
- Asset identity and versioning.
- Library manifest schema.
- Registry storage and retrieval.
- Initial project detection.
- Basic CLI structure.
- simplify.dev configuration format.

Goal: Establish a stable foundation for describing and distributing assets.

### 17.2 GitHub Integration and Library Creation

Implement:

- GitHub App registration and authorization.
- Repository selection and connection.
- Existing repository import.
- New repository initialization workflow.
- Library manifest generation.
- Repository-to-library association.
- Commit and tag tracking.
- Basic webhook processing.
- GitHub Actions publishing workflow.
- Scoped publishing authentication.

Goal: Make GitHub the primary environment for creating, maintaining, and publishing libraries.

### 17.3 Installation Engine

Implement:

- Package installation.
- Source installation.
- Hybrid installation.
- Dependency resolution.
- File mapping.
- Installation tracking.
- Dry-run and diff support.
- Basic update conflict detection.

Goal: Reliably install assets into real projects.

### 17.4 Design System and Core UI

Implement:

- Shared design tokens.
- CSS token generation.
- Light and dark themes.
- Core UI package.
- Accessible primitives.
- Component customization APIs.
- Package exports and build pipeline.

Goal: Establish the visual and technical foundation for UI assets.

### 17.5 Functional Blocks and Integrations

Build a limited set of complete examples:

1. Agent Chat.
2. Dashboard Shell.
3. Application Navigation.

For Agent Chat, implement:

- Provider-independent UI.
- Reusable conversation logic.
- Loading, streaming, empty, and error states.
- Transport interface.
- Vercel AI SDK integration.
- Optional persistent storage integration.

Goal: Prove that simplify.dev can distribute complete, composable features rather than just visual components.

### 17.6 Documentation and Registry Browser

Implement:

- Registry browsing.
- Search and filters.
- Asset detail pages.
- Library detail pages.
- Live previews.
- Installation commands.
- Documentation rendering.
- Version information.
- GitHub repository references.

Goal: Make assets and libraries discoverable and understandable.

### 17.7 Theme Studio

Implement:

- Token editing.
- Live component previews.
- Theme presets.
- Light and dark configuration.
- Advanced semantic token controls.
- CSS and JSON export.

Goal: Allow developers to configure the actual design system used by their installed assets.

### 17.8 Library Publishing and Management

Expand:

- Library initialization.
- Asset creation.
- Manifest validation.
- Library building.
- Versioned publishing.
- GitHub release synchronization.
- Development snapshots.
- Publishing history.
- External registry support.
- Publisher metadata.

Goal: Provide a complete and reliable library lifecycle for simplify.dev and external developers.

### 17.9 Ecosystem Expansion

Expand into additional languages, frameworks, integrations, recipes, and templates.

Each expansion should be supported by real implementations and appropriate tests.

Goal: Grow the platform without weakening compatibility, performance, or developer ownership.

## 18. Product Boundaries

### simplify.dev Is

- A registry-driven distribution platform.
- A customizable UI and design system.
- A source and package installer.
- A platform for reusable functional blocks.
- A distribution system for reusable non-visual logic.
- An integration ecosystem.
- A documentation and configuration environment.
- A GitHub-connected library publishing platform.
- A multi-language and multi-framework platform.

### simplify.dev Is Not

- Just a component library.
- Just a collection of static templates.
- A replacement for GitHub.
- A framework intended to replace React, Next.js, or other ecosystems.
- A system that requires every feature to use the same backend.
- A platform that forces all application logic into its own runtime.
- A collection of tightly coupled vendor-specific implementations.
- A requirement for developers to adopt one particular application architecture.

The consuming application should retain control over its architecture, data, business rules, services, and deployment.

Developers should retain ownership of their library source code and repository history.

simplify.dev provides reusable implementations, distribution infrastructure, and clear integration boundaries.

## 19. Long-Term Direction

simplify.dev should become a place where developers can find and install meaningful pieces of software, understand how they work, customize their implementations, and connect them to existing applications.

The platform should make it practical to assemble substantial application functionality from independently maintained building blocks.

A developer should be able to:

1. Create a library from an existing GitHub repository or start a new one.
2. Organize the library into reusable assets.
3. Develop and maintain its source code using normal Git workflows.
4. Validate changes through GitHub Actions.
5. Publish versioned releases to simplify.dev.
6. Discover and inspect the published library.
7. Preview its assets and documentation.
8. Configure their appearance and behaviour.
9. Install assets using a package, source, or hybrid mode.
10. Install compatible integrations and dependencies.
11. Connect application-specific services.
12. Customize the implementation when necessary.
13. Update or maintain it through the CLI.

GitHub should provide the development, collaboration, and version-control foundation.

simplify.dev should provide the registry, asset discovery, publishing infrastructure, installation experience, and ecosystem that make those libraries useful across projects.

The TypeScript, React, and Next.js ecosystem will be the first implementation focus, while the registry and installation architecture will support additional languages and frameworks over time.

The central engineering requirement is that every asset has clear responsibilities, stable interfaces, controlled dependencies, and well-defined customization points.

The objective is to reduce repeated engineering work without sacrificing implementation quality, performance, flexibility, or developer ownership.
