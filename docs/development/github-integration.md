# GitHub Integration Guide

This guide describes how simplify.dev connects GitHub accounts and repositories, validates
libraries, synchronizes development snapshots, and publishes stable releases.

GitHub is the canonical source of library implementation code and history. simplify.dev owns
registry metadata, discovery, validation, distribution, and installation. Connecting a
repository never moves ownership of the source code away from GitHub.

> **Implementation status**
>
> This guide documents the code that exists on this branch. Some commands currently use
> in-memory stores that do not persist between CLI invocations, and the hosted registry
> submission endpoint is not wired yet. Those limitations are called out explicitly in
> [Known limitations](#known-limitations). Do not treat the affected commands as a complete
> end-to-end publishing service.

## Current implementation status

| Area                                       | Status                                                                     |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| GitHub App configuration and installation  | Implemented in `@simplify-dev/github` (`config.ts`, `auth.ts`).            |
| GitHub OAuth helpers                       | Implemented (`oauth.ts`); the web/API surface that calls them is pending.  |
| Repository discovery and linking           | Implemented (`repositories.ts`); CLI link state is in-memory per process.  |
| Repository metadata refresh                | Implemented (`metadata.ts`); link state is in-memory per process.          |
| Connect/create/disconnect/status CLI       | Implemented; lifecycle state does not persist across CLI invocations.      |
| Development snapshot synchronization       | Implemented in the CLI; snapshots are in-memory per process.               |
| Stable release validation and build        | Implemented (`library-publish`, `library-build`, tooling).                 |
| Publishing authentication                  | Implemented; installation tokens or scoped publish tokens.                 |
| Publishing and synchronization attempts    | Implemented; attempt and provenance history is in-memory per process.      |
| Registry artifact submission               | Pending. `library-publish` builds and validates a publication record only. |
| GitHub Actions workflow template           | Implemented (v1) via `simplify library-workflow` and library scaffolding.  |
| Webhook ingestion                          | Implemented in `apps/registry-api` with an in-memory delivery store.       |
| Account OAuth UI, manual retry/sync in web | Pending.                                                                   |

## Prerequisites

- Node.js 20 LTS.
- pnpm 9.x for repositories that use pnpm in CI.
- A GitHub repository containing a simplify.dev library.
- The simplify.dev GitHub App installed on the account or organization that owns the
  repository.
- The GitHub App installation ID for the account or organization.

## GitHub App configuration

The GitHub integration reads its credentials from environment variables. Never commit these
values; set them in your shell, CI secret store, or local `.env.local` file.

| Variable                    | Required | Purpose                                                                    |
| --------------------------- | -------- | -------------------------------------------------------------------------- |
| `GITHUB_APP_ID`             | Yes      | Numeric GitHub App ID. Must be a positive integer.                         |
| `GITHUB_APP_PRIVATE_KEY`    | Yes      | GitHub App private key in PEM format. Literal `\n` sequences are accepted. |
| `GITHUB_APP_CLIENT_ID`      | Yes      | OAuth client ID used by the GitHub App authorization helpers.              |
| `GITHUB_APP_CLIENT_SECRET`  | Yes      | OAuth client secret. Never expose this to browser clients or logs.         |
| `GITHUB_APP_WEBHOOK_SECRET` | Yes      | Secret used to verify `X-Hub-Signature-256` on webhook deliveries.         |
| `GITHUB_APP_SLUG`           | No       | GitHub App slug, used when building public App URLs.                       |
| `GITHUB_INSTALLATION_ID`    | No       | Installation ID used by most library CLI commands when the flag is absent. |

`loadGitHubAppConfig` requires all five required variables even when a command only uses the
App ID and private key. If any required value is missing, the CLI fails with
`CONFIG_INCOMPLETE` (the GitHub package itself raises `config_missing`).

### Register and authorize the GitHub App

The App is registered once per environment (local development, staging, production):

1. Create a GitHub App with the callback and setup URLs that point at the environment that
   handles account authorization.
2. Configure the webhook URL. The hosted service in this repository exposes
   `POST /webhooks/github` (default port `3002`, override with `PORT`).
3. Generate a private key and store it outside the repository.
4. Configure a webhook secret and store it outside the repository.
5. Set the five required `GITHUB_APP_*` environment variables (and optionally
   `GITHUB_APP_SLUG`).

Register only the permissions the workflow needs. For the code in this repository:

- **Repository metadata**: read — repository identity, default branch, visibility, and
  installation repository listing.
- **Contents**: read — reading branches and validating repository contents. Write access is
  not required for pull request validation.
- **Administration**: write — only if you intend to use `simplify library-create` to create
  repositories through the installation token.
- **Webhook events**: pushes, tag creation, releases, repository lifecycle, and GitHub App
  installation events.

Do not grant write access to contents or workflows merely to validate a library. Validation
runs read-only.

### Connect a GitHub account

Account connection is a platform concern handled by the GitHub App. The
`@simplify-dev/github` package exposes the building blocks:

- `buildGitHubAuthorizationUrl` builds the GitHub App web-flow authorization URL.
- `exchangeGitHubAuthorizationCode` exchanges the authorization code for a token set.
- `createGitHubAppClient(...).getInstallation(...)` verifies an installation.
- `createGitHubAppClient(...).listInstallationRepositories(...)` lists repositories the
  installation can access.

The web application and registry API do not yet expose a user-facing "Sign in with GitHub"
flow. Until that surface exists, connect an account by installing and authorizing the App
directly on GitHub:

1. Open the App's public installation page and choose the account or organization.
2. Select the repositories the App may access (or all repositories).
3. Complete the installation. GitHub redirects to the App's setup URL with an
   `installation_id` parameter.
4. Record that installation ID. The GitHub App installation settings page also shows it.
5. Export it for CLI use:

   ```sh
   export GITHUB_INSTALLATION_ID=<installation-id>
   ```

Installation IDs are account-specific. Reinstalling the App or changing the selected
repositories can change the installation, so re-check the ID if commands report that a
repository is not accessible.

## Connect an existing repository

Use `library-connect` to associate an existing GitHub repository with a simplify.dev library.
The repository stays canonical.

```sh
simplify library-connect <owner/name> \
  --installation-id <installation-id> \
  [--library-id <library-id>] \
  [--target-dir <path>] \
  [--dry-run] \
  [--json]
```

Behavior:

1. The repository argument must use the `owner/name` format. Anything else fails with
   `INVALID_REPOSITORY`.
2. The command loads the GitHub App configuration and verifies that the repository is
   accessible to the installation. If the direct lookup fails, it falls back to listing the
   installation's repositories and matching by owner and name.
3. It reads `simplify/library.json` from `--target-dir` (default: the current directory).
4. If a manifest exists, `--library-id` must match the manifest `id` or the command fails
   with `LIBRARY_ID_MISMATCH`.
5. If no manifest exists, the command derives a library ID from `--library-id` or the
   repository name and scaffolds:
   - `simplify/library.json`
   - `simplify/assets/library/example.asset.json`
   - `simplify/assets/library/README.md`
   - `README.md` (only when absent)
6. It validates the library manifest and any asset manifests already listed in it.
7. It records the repository-to-library association and reports the repository URL, default
   branch, visibility, and the number of detected asset manifests.

`library-connect` does not generate the GitHub Actions workflow for an existing repository.
Run `simplify library-workflow --target-dir <path>` after connecting and commit the result.

Because link state is currently in-memory per invocation, the association created by
`library-connect` is not visible to later CLI processes. See
[Known limitations](#known-limitations).

## Create a new library repository

Use `library-create` to create a GitHub repository through the installation and scaffold a
library at the same time.

```sh
simplify library-create \
  --owner <owner> \
  --name <repository-name> \
  [--description <text>] \
  [--visibility public|private] \
  [--library-id <library-id>] \
  --installation-id <installation-id> \
  [--target-dir <path>] \
  [--dry-run] \
  [--json]
```

Behavior:

1. `--owner` and `--name` are required. Repository names must match
   `[a-zA-Z0-9._-]+`.
2. If the repository already exists and is accessible, the command reuses it instead of
   creating a duplicate.
3. Otherwise it creates the repository with `auto_init: false`. It first attempts
   `POST /orgs/<owner>/repos`, then falls back to `POST /user/repos` for a user account.
4. It scaffolds the local library:
   - `simplify/library.json`
   - `simplify/assets/library/example.asset.json`
   - `simplify/assets/library/README.md`
   - `src/index.ts`
   - `README.md`
   - `CHANGELOG.md`
   - `package.json`
   - `.github/workflows/simplify.yml`
5. It validates the generated manifests, records the repository link, and reports the
   repository URL and next steps.

The command never pushes the local scaffold to GitHub. Commit and push the generated files
yourself. GitHub remains the canonical source.

`--dry-run` does not create a remote repository. If the repository already exists it is
reused and the command reports the planned steps; if it does not exist the command reports
`DRY_RUN_REMOTE` and stops.

> **Known scaffold defect**
>
> The current `library-connect` and `library-create` scaffolds write an example asset with
> `category: "library"` and `id: "library/example"`. The asset schema only allows
> `ui`, `blocks`, `logic`, `integrations`, `recipes`, and `templates`, so validation reports
> `INVALID_MANIFEST`. `library-create` runs that validation after scaffolding and therefore
> currently fails at the final validation step even though the repository and files were
> created. Replace the example asset with a schema-valid manifest before continuing, or use
> `simplify library-init --category <supported-category>` and connect the repository
> afterwards.

## Expected repository structure

A library repository contains a root manifest, one manifest per asset, and implementation
files referenced by those manifests. The exact source layout can vary; the registry reads the
manifests rather than assuming a directory layout.

```text
library-repository/
├── simplify/
│   ├── library.json
│   └── assets/
│       ├── blocks/
│       │   └── agent-chat.asset.json
│       ├── logic/
│       │   └── chat-controller.asset.json
│       └── ui/
│           └── button.asset.json
├── src/
├── docs/
├── examples/
├── previews/
├── .github/
│   └── workflows/
│       └── simplify.yml
├── README.md
├── CHANGELOG.md
└── package.json
```

`library-connect` detects asset manifests by scanning `simplify/assets/**` for files ending in
`.asset.json`, in addition to the paths listed in the library manifest.

### Root manifest: `simplify/library.json`

The library manifest declares identity, version, assets, and publishing rules:

```json
{
  "schemaVersion": 1,
  "id": "agent-chat",
  "name": "Agent Chat",
  "description": "Reusable agent chat blocks, logic, and integrations.",
  "version": "1.0.0",
  "license": "MIT",
  "maintainers": [{ "name": "Example Maintainer", "url": "https://github.com/example" }],
  "assets": [
    "simplify/assets/blocks/agent-chat.asset.json",
    "simplify/assets/logic/chat-controller.asset.json"
  ],
  "publishing": {
    "include": ["src/**", "simplify/**", "README.md", "CHANGELOG.md"],
    "exclude": ["**/node_modules/**", "**/.env*", "**/.simplify/**"]
  },
  "documentation": {
    "readme": "README.md",
    "examples": ["examples/"],
    "changelog": "CHANGELOG.md"
  }
}
```

Required fields are `schemaVersion`, `id`, `name`, `description`, `version`, `license`,
`assets`, and `publishing`. The `id` must be kebab-case, asset paths must be unique,
repository-relative, and must not contain `..`, and `version` must be valid SemVer. See
[`../specifications/library-manifest.md`](../specifications/library-manifest.md).

### Asset manifest

Each asset manifest declares a category, identity, version, targets, implementations, and
installation metadata. Valid categories are `ui`, `blocks`, `logic`, `integrations`,
`recipes`, and `templates`. Asset IDs use `<category>/<kebab-case-name>`.

```json
{
  "schemaVersion": 1,
  "id": "blocks/agent-chat",
  "category": "blocks",
  "name": "Agent Chat",
  "description": "A customizable agent conversation interface.",
  "version": "1.0.0",
  "publisher": "example",
  "status": "community",
  "license": "MIT",
  "targets": [{ "language": "typescript", "framework": "react", "runtime": "browser" }],
  "implementations": [
    {
      "id": "react",
      "target": { "language": "typescript", "framework": "react" },
      "mode": "source",
      "entry": "src/blocks/agent-chat/index.tsx"
    }
  ],
  "installation": {
    "modes": [
      {
        "mode": "source",
        "files": [
          { "source": "src/blocks/agent-chat/index.tsx", "target": "blocks/agent-chat/index.tsx" }
        ]
      }
    ]
  },
  "documentation": { "readme": "README.md" },
  "preview": { "entry": "previews/agent-chat.tsx" }
}
```

See [`../specifications/asset-manifest.md`](../specifications/asset-manifest.md) for the
complete field set.

### Publishing include and exclude rules

`publishing.include` is required and selects the files that may enter a build.
`publishing.exclude` is optional. The library builder also applies default excludes:

```text
**/.env*
**/.git/**
**/node_modules/**
**/dist/**
```

Generated scaffolds use:

```json
{
  "include": ["src/**", "simplify/**", "README.md", "CHANGELOG.md"],
  "exclude": ["**/node_modules/**", "**/.env*", "**/.simplify/**"]
}
```

Never include secrets, environment files, Git internals, dependencies, or generated build
output in a library build.

### Validate and build locally

```sh
simplify asset validate --library --path .
simplify library-build --path .
```

`asset validate --library` validates the library manifest and every referenced asset
manifest. `library-build` resolves files, applies include/exclude rules, writes artifacts to
`./dist/simplify-build` by default, and generates integrity hashes and a publication record.
Building is separate from publishing so artifacts can be inspected first.

## Generated GitHub Actions workflow

Generate the canonical v1 workflow with:

```sh
simplify library-workflow \
  [--target-dir <path>] \
  [--output .github/workflows/simplify.yml] \
  [--force] \
  [--dry-run] \
  [--json]
```

`library-init` and `library-create` also write the workflow. The template source is
`packages/cli/src/workflows/simplify-library.ts`; keep
`packages/cli/src/workflows/simplify-library.yml` in sync with it. The workflow is versioned
(v1), non-interactive, and usable in repositories that were not created through simplify.dev.

### Triggers

| Event                | Behavior                                                        |
| -------------------- | --------------------------------------------------------------- |
| `push` to `main`     | Runs validation only. Ordinary pushes never publish or release. |
| `push` of `v*` tag   | Runs validation, then publishes a stable release.               |
| `pull_request`       | Runs validation only. Never publishes.                          |
| `release: published` | Runs validation, then publishes a stable release.               |
| `workflow_dispatch`  | Runs validation only in the v1 template.                        |

Both a tag push and the matching published release can trigger the publish job. Use one
release trigger as the source of truth for a version; do not rely on in-memory duplicate
detection in CI.

### Jobs and steps

The `validate` job:

1. Checks out with `actions/checkout@v4` and `fetch-depth: 0` so tag and history information
   is available.
2. Configures pnpm 9 with `pnpm/action-setup@v4`.
3. Configures Node.js 20 with `actions/setup-node@v4` and pnpm caching.
4. Installs the CLI globally with
   `npm install --global @simplify-dev/cli@${SIMPLIFY_CLI_VERSION}`.
5. Runs `simplify asset validate --library`.
6. Installs dependencies when `package.json` exists (`pnpm install --frozen-lockfile` when a
   lockfile exists, otherwise `pnpm install`).
7. Runs `pnpm run --if-present test`.

The `publish` job has the same checkout, pnpm, Node.js, and CLI setup, then runs:

```sh
simplify library-build
simplify library-publish "${LIBRARY_ID}" --tag "${GITHUB_REF_NAME}"
```

It is gated with `needs: validate` and only runs for a `v*` tag push or a published release.
It never runs for `pull_request`.

The workflow sets `permissions: contents: read` globally and for both jobs. Validation is
read-only. The template does not request write permissions for contents, packages, or
workflows.

### Template contract versus current wiring

- `SIMPLIFY_CLI_VERSION` pins the CLI version. The template currently ships with the
  placeholder `'0.0.0'`; replace it with a published CLI version before relying on CI.
- `SIMPLIFY_LIBRARY_ID` is optional. When empty, the publish step reads `id` from
  `simplify/library.json`.
- The publish step maps `SIMPLIFY_PUBLISH_TOKEN`, `SIMPLIFY_PUBLISH_LIBRARY_ID`,
  `SIMPLIFY_PUBLISH_REPOSITORY`, and the `GITHUB_APP_*` variables from repository or
  organization secrets and variables. When `SIMPLIFY_PUBLISH_TOKEN` is set it is used for
  publisher authentication; otherwise `library-publish` uses the GitHub App installation
  token. Tag resolution always uses the GitHub App installation and needs `GITHUB_APP_ID`,
  `GITHUB_APP_PRIVATE_KEY`, `GITHUB_INSTALLATION_ID`, and the other configured App variables.
- The current `library-publish` command builds and validates a publication record but does
  not upload it to a registry endpoint. See [Known limitations](#known-limitations).

## Pull request validation

Pull requests run the `validate` job only:

- Manifest and asset validation.
- Referenced file, dependency, and version checks.
- Library tests when `package.json` is present.

The workflow uses read-only `contents` permission and does not reference publishing secrets
in the validate job. The publish job is explicitly excluded from `pull_request` events, so
workflows triggered by forked pull requests cannot access publishing credentials or publish
stable or development versions. GitHub also withholds secrets from fork pull request
workflows by default; keep it that way.

## Development synchronization

Development synchronization records the branch and exact commit SHA of a development
snapshot. It is separate from stable releases and never participates in stable version
resolution.

```sh
simplify library-sync <library-id> \
  [--branch <branch>] \
  [--installation-id <installation-id>] \
  [--target-dir <path>] \
  [--dry-run] \
  [--json]
```

Behavior:

1. The command requires a connection for `<library-id>`. With the current in-memory link
   store it reports `NOT_CONNECTED` in a fresh process.
2. The branch defaults to the repository default branch.
3. If a local `simplify/library.json` exists, its `id` must match `<library-id>` or the
   command fails with `LIBRARY_ID_MISMATCH`.
4. It reads the latest commit SHA for the branch and records a development snapshot with
   `kind: "development"`.
5. It records a `synchronization` publishing attempt, including validation results or the
   failure, publisher identity, and an optional workflow run from `GITHUB_RUN_ID` /
   `GITHUB_SERVER_URL` / `GITHUB_REPOSITORY`. `library-status` can then show the attempt.
6. Repeating the command for the same library, branch, and commit within the same process
   reports `up-to-date` instead of creating a duplicate.

Automatic synchronization is disabled by default: ordinary pushes and `main` branch pushes
only run validation. Run `library-sync` explicitly, or add a workflow step that calls it.
The v1 workflow template does not contain a development-sync job.

Snapshots are currently held in memory for the lifetime of the process and are not visible
to later CLI invocations.

## Stable release publishing

Stable releases are published from Git tags or GitHub releases. The default tag convention
is `v<version>`, for example `v1.2.0` for manifest version `1.2.0`.

```sh
simplify library-publish <library-id> [tag|version]
  [--tag <tag>]
  [--version <version>]
  [--path <library-root>]
  [--installation-id <installation-id>]
  [--dry-run]
  [--json]
```

The tag or version can be passed positionally or with `--tag` / `--version`. If omitted, the
CLI uses the version from `simplify/library.json`.

Behavior:

1. The library must be connected to a repository.
2. The tag defaults to `v<manifest-version>`. A supplied tag is normalized to `v<version>`.
3. The tag version must match the manifest version exactly. A mismatch fails with
   `TAG_VERSION_MISMATCH` and suggests the correct tag.
4. The CLI resolves the tag through the GitHub App installation. Annotated tags are peeled to
   their commit. The published source is the exact commit referenced by the tag, not the
   current branch head.
5. It authenticates the publisher using `SIMPLIFY_PUBLISH_TOKEN` when present, otherwise the
   GitHub App installation token. Authentication failures fail with
   `PUBLISHING_UNAUTHORIZED`.
6. It validates the complete library and all referenced assets before publishing.
7. It builds an immutable publication artifact and validates the publication record.
8. It records the published version and publisher provenance and reports the tag, commit SHA,
   registry URL, credential kind, and `immutable: true`.

Published versions are immutable. An attempt to publish the same library version again
fails with `ALREADY_PUBLISHED` and requires a new version, normally a patch bump. The current
duplicate check uses an in-memory store, so it only protects repeated attempts within one
process; the hosted registry must enforce immutability durably once submission is wired.

Corrections require a new version. Do not move or reuse a published tag.

### Publishing and synchronization status

`library-status` reports the latest validation, build, publish, and synchronization attempts
recorded in the current process, along with the latest publication provenance and any
available GitHub Actions run URL:

```sh
simplify library-status <library-id> \
  --installation-id <installation-id> \
  [--refresh] \
  [--json]
```

The JSON output includes `publishing.latestAttempts`, `publishing.latestPublication`, and
`publishing.historyScope: "process"`. Attempt history does not survive the process. Failed
operations can be retried by running `library-sync` or `library-publish` again; the CLI uses
idempotency keys within a process to avoid duplicate attempts.

## Publishing authentication and secrets

### Local CLI

The library lifecycle commands need:

- All required `GITHUB_APP_*` variables from
  [GitHub App configuration](#github-app-configuration).
- An installation ID, supplied with `--installation-id` or `GITHUB_INSTALLATION_ID`.
  `library-disconnect` currently requires the `--installation-id` flag directly.

GitHub App installation tokens are short-lived and are created on demand. They are not
written to disk or logs by these commands. Never commit a private key, client secret, webhook
secret, installation token, or publishing token.

`library-publish` authenticates with `SIMPLIFY_PUBLISH_TOKEN` when it is set, otherwise with
a GitHub App installation token. A publish token is checked against the in-memory credential
store first. If it is not stored and no credential issuance endpoint is available, the CLI
accepts it only when a configured scope matches the requested library and repository:

| Name                          | Purpose                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------- |
| `SIMPLIFY_PUBLISH_LIBRARY_ID` | Scopes the publish token to one library. Falls back to `SIMPLIFY_LIBRARY_ID`.               |
| `SIMPLIFY_PUBLISH_REPOSITORY` | Scopes the publish token to one `owner/name` repository. Falls back to `GITHUB_REPOSITORY`. |
| `SIMPLIFY_PUBLISHER`          | Publisher identity recorded in provenance. Falls back to `GITHUB_ACTOR`.                    |

An unrecognized token without a configured scope fails with `PUBLISHING_UNAUTHORIZED` and a
`credential_invalid` detail. `@simplify-dev/github` provides credential issue, rotate, revoke,
and fingerprint helpers, but no CLI command or hosted credential-management endpoint is wired
yet. The default local CLI credential store is also in-memory.

### GitHub Actions

Configure these in the library repository or organization:

| Name                          | Type       | Required | Purpose                                                                    |
| ----------------------------- | ---------- | -------- | -------------------------------------------------------------------------- |
| `SIMPLIFY_CLI_VERSION`        | env        | Yes      | CLI version to install in the workflow. Replace the `0.0.0` placeholder.   |
| `SIMPLIFY_LIBRARY_ID`         | var/secret | No       | Override the library ID read from the manifest.                            |
| `GITHUB_INSTALLATION_ID`      | secret     | Yes      | Installation used to resolve tags and repository metadata.                 |
| `GITHUB_APP_ID`               | secret     | Yes      | GitHub App ID.                                                             |
| `GITHUB_APP_PRIVATE_KEY`      | secret     | Yes      | GitHub App private key.                                                    |
| `GITHUB_APP_CLIENT_ID`        | secret     | Yes      | OAuth client ID.                                                           |
| `GITHUB_APP_CLIENT_SECRET`    | secret     | Yes      | OAuth client secret.                                                       |
| `GITHUB_APP_WEBHOOK_SECRET`   | secret     | Yes      | Webhook verification secret.                                               |
| `SIMPLIFY_PUBLISH_TOKEN`      | secret     | Fallback | Scoped publishing credential; installation tokens are used when unset.     |
| `SIMPLIFY_PUBLISH_LIBRARY_ID` | var/secret | Fallback | Scope for `SIMPLIFY_PUBLISH_TOKEN`; defaults to `SIMPLIFY_LIBRARY_ID`.     |
| `SIMPLIFY_PUBLISH_REPOSITORY` | env        | Fallback | Scope for `SIMPLIFY_PUBLISH_TOKEN`; the template sets `github.repository`. |
| `SIMPLIFY_PUBLISHER`          | var/secret | No       | Publisher identity recorded in provenance; defaults to the GitHub actor.   |

Least-privilege guidance:

- Keep the workflow `contents` permission at `read`.
- Store secrets as repository or organization secrets, not in workflow files.
- Do not add secrets to jobs that run on `pull_request`.
- Rotate the App private key and publishing token if exposure is suspected.
- The CLI does not log secret values, and hosted services must not expose installation tokens
  to browser clients.

## Disconnect and reconnect a repository

Disconnect with either the repository ID or the library ID:

```sh
simplify library-disconnect <repositoryId|libraryId> \
  --installation-id <installation-id> \
  [--dry-run] \
  [--json]
```

Behavior:

1. The command requires `--installation-id`.
2. A numeric argument is treated as a repository ID. A non-numeric argument is resolved as a
   library ID through its existing repository link.
3. If no link exists, it fails with `LINK_NOT_FOUND`.
4. Disconnecting removes the association and preserves published versions. It does not delete
   the GitHub repository, the local manifest, or any published artifacts.
5. The repository can be reconnected later with `library-connect`.

Reconnect by running `library-connect` again after the disconnect, or after installing or
authorizing the App again. Ensure the same library ID and repository are used; conflicting
links fail with `REPOSITORY_ALREADY_LINKED` or `LIBRARY_ALREADY_LINKED`.

If the App is uninstalled or repository access is revoked, published versions remain
available. Repository status can be `active`, `inaccessible`, `deleted`, or `transferred`.
`library-status --refresh` refreshes metadata and reports inaccessible repositories instead
of silently accepting stale data.

Because link state is currently in-memory per invocation, disconnect and status in a fresh
CLI process cannot see links created by an earlier process. See
[Known limitations](#known-limitations).

## Webhooks and registry API

The hosted registry API exposes:

- `GET /healthz` — health check.
- `POST /webhooks/github` — GitHub webhook ingestion.

Webhook requests must include `X-GitHub-Event`, `X-GitHub-Delivery`, and a valid
`X-Hub-Signature-256`. The handler:

1. Verifies the HMAC SHA-256 signature against `GITHUB_APP_WEBHOOK_SECRET`.
2. Rejects missing or invalid payloads.
3. Treats previously seen delivery IDs as duplicates.
4. Records push events as non-stable, and tag creation / release events as stable release
   candidates.
5. Records repository and installation events.

The current webhook handler records observed events and delivery status only; repository
lifecycle changes are not applied to a durable store, and webhook events are not connected to
the CLI's in-memory publishing or snapshot stores. Durable storage and publishing
coordination are pending.

## Known limitations

- **In-memory lifecycle stores.** `library-connect`, `library-create`, `library-status`,
  `library-sync`, `library-publish`, and `library-disconnect` each construct a fresh
  `InMemoryRepositoryLinkStore`. A link created in one CLI invocation is not visible in the
  next. The snapshot, published-version, publishing credential, attempt, and provenance
  stores are also process-local. Until a persistent store is wired, these commands are not a
  complete multi-invocation workflow.
- **Registry submission is pending.** `library-publish` builds and validates an immutable
  publication record, authenticates the publisher, and prints the artifact URL, but it does
  not POST the record to a registry endpoint.
- **Publishing credentials are managed in memory only.** Issue, rotate, revoke, and
  fingerprint helpers exist in `@simplify-dev/github`, but there is no CLI command or hosted
  management endpoint, and the default CLI credential store does not persist. A
  `SIMPLIFY_PUBLISH_TOKEN` that is not in the store is accepted only when the configured
  library/repository scope matches.
- **Attempt and provenance history is process-local.** `library-status` shows only attempts
  recorded by the current process (`historyScope: "process"`); another CLI invocation starts
  with empty history.
- **Immutability is only enforced in memory.** `ALREADY_PUBLISHED` relies on the process-local
  published-version store. Durable duplicate prevention must be enforced by the registry.
- **OAuth/account UI is pending.** OAuth helpers exist, but there is no user-facing sign-in
  or App-installation page in this repository yet.
- **No web-based manual retry or synchronization.** Retry and sync are CLI commands; the web
  application does not provide manual retry or sync controls yet.
- **Workflow dispatch validates only.** The v1 template has no development-sync job and its
  `workflow_dispatch` trigger runs validation only.
- **Webhooks are not durable.** The registry API uses an in-memory delivery store and does
  not apply repository lifecycle changes to persistent records.
- **Scaffold asset category defect.** The `library-connect` and `library-create` example asset
  uses the unsupported `library` category and fails asset schema validation. Replace it with
  a supported category before publishing.

## Troubleshooting

### Missing or invalid GitHub App configuration

Symptom: `CONFIG_INCOMPLETE` or `config_missing`.

Confirm that `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_CLIENT_ID`,
`GITHUB_APP_CLIENT_SECRET`, and `GITHUB_APP_WEBHOOK_SECRET` are set in the current
environment. `GITHUB_APP_ID` must be a positive integer. For PEM keys supplied through a
single-line variable, literal `\n` sequences are converted to newlines; otherwise include
real newlines.

### Missing installation ID

Symptom: `MISSING_OPTION` for `--installation-id`.

Pass `--installation-id` explicitly or export `GITHUB_INSTALLATION_ID`. `library-disconnect`
requires the flag. Re-check the installation ID after reinstalling the App or changing
repository access.

### Invalid repository format

Symptom: `INVALID_REPOSITORY`.

Use exactly `owner/name`, with no URL scheme, trailing slash, or extra path segments.

### Invalid repository name

Symptom: `INVALID_REPOSITORY_NAME`.

Use only letters, numbers, dots, underscores, and hyphens.

### Repository is not accessible

Symptom: `REPOSITORY_NOT_ACCESSIBLE`, `repository_not_found`, or a GitHub 404.

Check that the App is installed on the correct account or organization, that the repository is
included in the installation's selected repositories, and that the installation ID belongs to
that account. Renamed, transferred, or deleted repositories also stop resolving under the old
owner/name.

### Library is not connected

Symptom: `LIBRARY_NOT_CONNECTED`, `NOT_CONNECTED`, or `LINK_NOT_FOUND`.

Connect the repository first. In the current build, expect this error in a fresh process even
after a successful connect because link state is in-memory. Use `--installation-id` and
reconnect within the same process only for testing; durable persistence is pending.

### Library ID mismatch

Symptom: `LIBRARY_ID_MISMATCH`.

The `--library-id` or positional ID does not match `simplify/library.json`. Either omit the
flag so the manifest ID is used, or update the manifest and repository link to the same
kebab-case ID.

### Conflicting repository or library links

Symptom: `REPOSITORY_ALREADY_LINKED` or `LIBRARY_ALREADY_LINKED`.

A repository can link to only one library, and a library can link to only one repository.
Disconnect the existing link first or use the correct library ID.

### Invalid or failing manifests

Symptom: `INVALID_MANIFEST` or `VALIDATION_FAILED`.

Run `simplify asset validate --library --path .` and fix the reported file, path, and field.
Common causes include an unsupported asset category, a non-SemVer version, an asset path that
does not exist, or the scaffold example asset described in
[Known limitations](#known-limitations).

### Dry run cannot create a remote repository

Symptom: `DRY_RUN_REMOTE`.

`library-create --dry-run` can reuse an existing repository but cannot create a new remote
repository. Run it without `--dry-run` when you are ready to create the repository.

### Tag not found or tag/version mismatch

Symptom: `INVALID_TAG`, `TAG_VERSION_MISMATCH`, or `FETCH_TAG_FAILED`.

Confirm the tag exists in the connected repository and that the App installation can read it.
A tag `v1.2.0` requires manifest version `1.2.0`. Push the tag to GitHub before publishing and
wait for the tag to be visible through the API.

### Version already published

Symptom: `ALREADY_PUBLISHED`.

Published versions are immutable. Publish a new version, normally a patch release, with a new
manifest version and matching tag. Do not move an existing tag. Durable duplicate detection
will be enforced by the registry once submission is wired.

### Publishing authentication fails

Symptom: `PUBLISHING_UNAUTHORIZED` with `credential_missing`, `credential_invalid`,
`credential_revoked`, or `credential_expired`.

Provide `SIMPLIFY_PUBLISH_TOKEN` or a GitHub App installation token. For a scoped fallback
token, set `SIMPLIFY_PUBLISH_LIBRARY_ID` and `SIMPLIFY_PUBLISH_REPOSITORY` to the library and
`owner/name` repository being published. Rotate revoked or expired credentials. The CLI never
prints credential values.

### Build failure

Symptom: `BUILD_FAILED`.

Run `simplify library-build` locally for the full error. Check the library manifest, asset
manifests, included file paths, and referenced implementation entries. Confirm that included
paths are not excluded by the default or library-specific exclude rules.

### Workflow file already exists

Symptom: `FILE_EXISTS` from `library-workflow`.

Pass `--force` to overwrite, or choose a different `--output` path.

### Workflow validation or publish job fails

Check:

- `SIMPLIFY_CLI_VERSION` points to a published CLI version, not the `0.0.0` placeholder.
- The workflow uses Node.js 20 and pnpm 9 as generated.
- `simplify asset validate --library` passes locally.
- The `publish` job has all required secrets configured.
- `SIMPLIFY_PUBLISH_TOKEN`, when used, is scoped by `SIMPLIFY_PUBLISH_LIBRARY_ID` and
  `SIMPLIFY_PUBLISH_REPOSITORY` and is not revoked or expired.
- The run is a trusted `v*` tag push or a published release, not a pull request.
- The repository and library IDs match the manifest.
- The GitHub App installation can read the repository and the tag.

Pull request workflows from forks intentionally cannot access publishing secrets and must not
publish. Do not try to work around that restriction by passing secrets to pull request jobs.

### Webhook returns 401 or 400

- `401 invalid_signature`: the payload signature does not match
  `GITHUB_APP_WEBHOOK_SECRET`. Verify that the secret in GitHub matches the environment and
  that the raw request body is used for verification.
- `400 invalid_payload`: the event or delivery headers are missing, the JSON is invalid, or
  the payload exceeds the 1 MB limit.
- `500 github_app_not_configured`: the service cannot load the required App configuration.

## Related documentation

- [`../architecture/github-integration.md`](../architecture/github-integration.md) — GitHub App,
  repository connections, webhooks, and publishing responsibilities.
- [`../architecture/github-workflow.md`](../architecture/github-workflow.md) — GitHub-first
  library lifecycle and version mapping.
- [`../specifications/library-manifest.md`](../specifications/library-manifest.md) — root
  manifest contract.
- [`../specifications/asset-manifest.md`](../specifications/asset-manifest.md) — asset manifest
  contract.
- [`../specifications/versioning-and-publication.md`](../specifications/versioning-and-publication.md)
  — publication records and immutable versions.
- [`../../packages/github/README.md`](../../packages/github/README.md) — GitHub package
  responsibilities and boundaries.
