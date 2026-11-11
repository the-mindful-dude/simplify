````txt
# AGENTS.md

Mandatory instructions for all AI agents, coordinators, subagents, and contributors working in the simplify.dev repository.

These rules govern planning, architecture, implementation, testing, review, and delivery. They are mandatory, not suggestions.

The priorities are correctness, architectural consistency, complete implementation, strict module boundaries, maintainability, security, scalability, and verifiable results.

Never reduce requirements for convenience, substitute incomplete work for a real implementation, or report something as complete without evidence.

---

# 1. Sources of Truth

Before starting any task, read the relevant sources in this order:

1. `AGENTS.md` — mandatory engineering and agent operating rules.
2. `docs/MODEL.md` — product model, architecture, and non-negotiable principles.
3. `TODO.md` — implementation roadmap, task ordering, and acceptance criteria.
4. `docs/architecture/` — established technical decisions and contracts.
5. `README.md` — product overview and public positioning.
6. Relevant source code, tests, schemas, and configuration.

Each source has a distinct responsibility:

- `AGENTS.md` defines how agents must work.
- `docs/MODEL.md` defines what the product is and its architectural foundations.
- `TODO.md` defines what must be implemented and in what order.
- `docs/architecture/` records resolved architectural decisions.
- Source code and tests establish local implementation conventions but must not override the product model or architecture.

When requirements conflict:

- Identify the conflict and check whether an existing architecture decision resolves it.
- Never silently choose the easiest interpretation.
- Do not implement something that violates a higher-priority architectural requirement.
- Resolve the conflict explicitly and update affected architecture documentation when a contract changes.

Existing code is not automatically correct. Correct existing bugs, outdated patterns, and architectural violations rather than preserving them simply because they already exist.

---

# 2. Product Definition and Principles

simplify.dev is a registry-driven platform for discovering, installing, customizing, and connecting reusable software building blocks.

It distributes:

- UI Components
- Blocks
- Logic
- Integrations
- Recipes
- Templates
- Libraries

Three principles govern every decision:

1. **Reusability** — build useful capabilities once.
2. **Customizability** — expose meaningful implementation details without sacrificing managed-package convenience.
3. **Composability** — connect independent assets through explicit, stable interfaces.

Primary targets are TypeScript, React, and Next.js. The registry, manifests, validation system, and installer must remain extensible to other languages and frameworks.

Do not treat simplify.dev as merely a React component library, a collection of copied snippets, or a platform tightly coupled to GitHub or one framework.

Prioritize:

- Correctness and architectural consistency.
- High cohesion and low coupling.
- Reusability and composability.
- Maintainability and extensibility.
- Security and accessibility.
- Predictable behavior and professional implementation quality.

Consider long-term scalability without introducing speculative infrastructure, unnecessary abstractions, or complexity without a real requirement.

---

# 3. Locked Technical Decisions

The following decisions are established architectural constraints:

| Area | Decision |
| --- | --- |
| Package scope | `@simplify-dev/*` |
| CLI executable | `simplify` from `@simplify-dev/cli` |
| Runtime | Node.js 20 LTS |
| TypeScript | 5.x, strict |
| React / Next.js | React 18.x / Next.js 14.x |
| Package manager | pnpm 9.x workspaces |
| Build orchestration | Turborepo |
| Tests | Vitest |
| Lint / format | ESLint + Prettier |
| Module format | ESM only |
| Styling | CSS custom properties + CSS Modules |
| Headless UI | Radix UI |
| Registry distribution | Static versioned metadata and artifacts first |
| GitHub authorization | GitHub App |

Exact versions are pinned in repository configuration.

Do not silently change the runtime, framework baseline, package manager, module format, or established tooling. Do not introduce competing tools or unnecessary dependencies.

Any change to a locked decision requires an explicit architectural justification documenting motivation, alternatives, consequences, compatibility, and migration requirements in `docs/architecture/`.

---

# 4. Architecture and Module Boundaries

All packages, applications, modules, and integrations must follow deliberate boundaries and dependency direction.

## 4.1 Dependency Direction

The intended dependency structure is:

```text
apps/web
  └── registry client, ui, tokens, preview runtime

apps/registry-api
  └── registry, github

packages/github
  └── registry contracts only

packages/cli
  └── registry client/resolver, tooling

packages/tooling
  └── schemas, registry contracts

packages/blocks
  └── ui, interaction, integration contracts

packages/ui
  └── tokens

packages/interaction
  └── framework-independent code only

packages/tokens
  └── framework-independent code only

packages/registry
  └── schemas only

schemas
  └── no runtime dependencies
````

Mandatory rules:

* No circular dependencies, direct or indirect.

* The registry and asset model must not depend on GitHub-specific concepts.

* GitHub integration must not own or redefine the registry asset model.

* The CLI must not import web application internals.

* The web application must consume registry data rather than maintain a separate catalogue.

* Framework-independent logic must not import React, UI components, or framework-specific code.

* Core logic must not import provider SDKs or database clients directly.

* Integrations must implement declared contracts and remain optional where appropriate.

* Cross-package imports must use deliberate public entry points.

* Never import another package's `internal/` directory or arbitrary deep paths.

* Infrastructure details must not leak into domain-level contracts.

Depend on the smallest stable interface that provides the required capability.

### 4.2 Package and Module Responsibilities

A package must represent a meaningful responsibility or dependency boundary. Do not create packages merely to organize files or match a proposed directory structure.

Every module must have:

* A clearly defined responsibility.

* Explicit dependencies.

* A predictable input/output contract.

* A limited public interface.

* Ownership of a coherent part of the system.

* Appropriate tests.

Keep modules cohesive and loosely coupled. Avoid god modules, god classes, god functions, catch-all utility files, duplicated business logic, hidden dependencies, unnecessary shared state, and excessive fragmentation.

Separate responsibilities where appropriate:

* Domain models and business rules.

* Application workflows and orchestration.

* External service adapters.

* Data access and persistence.

* Transport and communication.

* Validation and error handling.

* Presentation and state management.

* Configuration and infrastructure.

Do not introduce layers mechanically. Choose boundaries based on actual responsibilities.

Modules must own their implementation details. Other modules must use declared public interfaces rather than accessing private implementations.

Keep exports deliberate. Do not expose internal utilities accidentally.

### 4.3 Asset and Library Model

An asset is an independently installable implementation. A library is a distributable collection of related assets.

* One logical asset may have implementations for different languages or frameworks.

* Recipes compose existing assets; they must not duplicate implementations.

* Templates should compose existing assets whenever possible.

* Assets must have explicit identities and independently manageable versions.

* The registry must understand libraries independently of repository directory layout.

Application-owned concerns remain outside distributed assets unless an explicit contract defines an integration boundary. These include authentication, authorization, permissions, secrets, application-specific business rules, database ownership, deployment, persistence policy, and data protection.

Assets may provide reusable interfaces, adapters, UI, and logic for these concerns, but must not silently assume ownership of the consuming application's policies or infrastructure.

### 4.4 Manifests and Versioning

* Libraries use `simplify/library.json`.

* Assets use category-specific manifests.

* Manifests describe identity, targets, dependencies, installation, files, documentation, preview, license, and attribution.

* Validate manifests and external metadata at system boundaries.

* Published versions must be immutable and reproducible.

* Record repository identity, commit SHA, tag or release, version, timestamp, artifact or snapshot, and validation results.

* Distinguish development snapshots from stable releases.

* Use Semantic Versioning for stable releases.

* Detect missing dependencies, incompatible versions, and dependency cycles.

* Provide actionable errors instead of silently accepting invalid metadata or dependency combinations.

### 4.5 Installation Safety

Supported installation modes are package, source, and hybrid.

The installer must:

* Never overwrite user-modified files without an explicit decision.

* Never replace secrets or environment values.

* Never execute arbitrary registry-provided scripts.

* Restrict target paths and prevent path traversal.

* Validate installation plans before applying them.

* Prefer safe writes, backups, and rollback for multi-file operations.

* Apply only supported, declarative configuration changes.

* Show a plan before destructive operations.

* Track installed versions, files, hashes, and dependencies in `.simplify/`.

* Detect modified and missing files before updates or removals.

* Preserve consumer customizations.

* Provide predictable recovery for interrupted operations.

Distinguish unchanged managed files, modified files, missing files, user-owned conflicts, new files, and asset dependencies.

Never assume a file is safe to replace merely because simplify.dev originally installed it.

### 4.6 GitHub-First Workflow

GitHub is the canonical source for library source code and history. simplify.dev owns registry metadata, validation, distribution, and installation.

* Support connecting existing repositories and creating new ones.

* Use a GitHub App with explicitly requested, least-privilege permissions.

* GitHub Actions is the primary validation and publishing environment.

* Ordinary pushes must never trigger unintended stable releases.

* Publishing must follow explicit versioning and validation.

* Webhooks must be authenticated, idempotent, and resilient to retries and out-of-order delivery.

* Preserve published versions when repositories are renamed, deleted, or inaccessible.

* Distinguish repository state from published registry state.

* Treat repository contents, workflows, manifests, and webhook payloads as untrusted input.

* Keep GitHub-specific implementation inside the GitHub integration.

* The core registry must remain usable without GitHub.

GitHub is an integration and source-of-truth mechanism for library source code, not the owner of simplify.dev's core asset model.

### 4.7 UI and Logic Isolation

Presentation and behavior must remain independently understandable.

* Components consume semantic design tokens; do not hardcode brand values.

* Keep business logic outside presentation components where appropriate.

* Framework-independent logic must not depend on React.

* UI consumes stable controller, state, or behavior interfaces.

* Define transport and storage contracts; provider and database adapters implement them.

* Avoid mandatory global providers.

* Use CSS custom properties and theme attributes where appropriate.

* Preserve React server/client boundaries deliberately.

* Do not mark every component client-only.

* Keep imports tree-shakeable and heavy dependencies isolated or optional.

Where appropriate, support deliberate customization through `className`, slots, `slotProps`, variants, sizes, tokens, controlled state, and callbacks.

Accessibility is functionality. Account for semantics, accessible names, keyboard interaction, focus management, screen-reader announcements, reduced motion, labels, validation, and loading, pending, and disabled states.

### 5\. Repository Structure

Follow the structure defined in `docs/MODEL.md`. The intended layout is:

```text
apps/
  web/                         Registry browser, docs, Theme Studio
  registry-api/                Hosted registry service, when needed

packages/
  registry/                    Schemas, resolver, registry client
  github/                      Authorization, repositories, webhooks, publishing
  cli/                         Commands, detection, installation, updates
  tokens/                      Token source, generators, outputs
  ui/                           Primitives, components, hooks, styles
  interaction/                  Framework-independent feature logic
  blocks/                       Functional React compositions
  tooling/                      Asset validator, library builder, preview runtime

registry/                       Official asset source layout
schemas/                        Registry, configuration, asset, library schemas

docs/
  architecture/                 Architecture decisions and contracts
  development/                  Development and contribution setup
```

This is a responsibility guide, not a requirement to create empty packages.

Before introducing a package, establish its responsibility, public API, dependencies, relationship to existing packages, justification, and testing/build boundaries.

Do not create fake implementations or placeholder packages. Do not move functionality across boundaries without understanding and documenting the consequences.

### 6\. Reasoning and Implementation Process

Agents must understand and plan before modifying the repository.

### 6.1 Understand and Inspect

Before implementation:

* Read the task and relevant sources of truth.

* Identify the roadmap item and acceptance criteria.

* Understand expected behavior and existing functionality.

* Inspect the current branch, working tree, and uncommitted changes.

* Inspect relevant modules, public interfaces, dependencies, tests, and documentation.

* Identify architectural, security, and compatibility constraints.

* Run relevant baseline checks and record existing failures.

Never overwrite or discard unrelated user changes. Never assume existing code is correct without inspection.

### 6.2 Design Before Coding

Determine:

* Which module owns the responsibility.

* Which existing contracts should be reused.

* Which public interfaces are required.

* Which dependencies are necessary.

* Whether the implementation belongs in a package or application.

* Whether logic should remain framework-independent.

* How errors and relevant edge cases should behave.

* How the implementation will be tested.

* Whether compatibility or migration concerns exist.

* Whether dependency direction is preserved.

Choose the smallest complete design that satisfies the requirements without compromising architecture or maintainability.

Do not overengineer or underengineer. Do not choose an inferior implementation merely because it is easier or faster.

### 6.3 Consider Failure Cases

Do not design only for the happy path. Consider relevant cases such as invalid or missing data, conflicts, unavailable services, permission failures, network errors, retries, duplicate events, concurrency, interrupted operations, and recovery.

Every relevant failure case must have intentional behavior.

### 6.4 Engineering Judgment

Distinguish verified facts, repository evidence, assumptions, and proposed decisions.

Do not invent APIs, dependency capabilities, test results, or framework behavior. Verify external behavior against authoritative documentation or the installed implementation.

Record important assumptions, architectural decisions, trade-offs, compatibility implications, and unavoidable limitations. Provide concise, reviewable decision summaries rather than unnecessary reasoning dumps.

### 7\. Implementation Standards

Every implementation must satisfy professional engineering standards.

### 7.1 Correctness and Completeness

Implement the actual requested behavior, not merely something that compiles.

* Preserve existing functionality unless a change is required.

* Validate untrusted input at system boundaries.

* Use explicit contracts and deliberate error handling.

* Avoid hidden side effects, silent failures, and undocumented assumptions.

* Do not substitute mock behavior for required production functionality.

* Do not leave required functionality as placeholders or TODO comments.

A feature is not complete because its interface, skeleton, or happy path exists.

### 7.2 Types and Interfaces

* Use strict TypeScript.

* Prefer explicit, meaningful types.

* Avoid `any`; isolate and justify it when unavoidable.

* Prefer `unknown` for untrusted data and narrow it through validation.

* Avoid unsafe assertions and overly broad interfaces.

* Ensure types accurately represent runtime behavior.

* Remember that TypeScript types do not validate external data at runtime.

Public interfaces must be small, deliberate, and designed for their expected consumers.

### 7.3 Errors and Side Effects

Use structured, actionable errors where appropriate. Preserve useful context without exposing secrets. Do not swallow exceptions or turn failures into false success responses.

Keep side effects explicit. Separate pure logic from filesystem, network, database, process, browser, and other external operations where appropriate. Avoid unnecessary global or shared mutable state.

### 7.4 Maintainability and Abstraction

Avoid duplicated business logic, monolithic components, large functions with unrelated responsibilities, broad utility modules, premature abstractions, and unnecessary dependencies.

An abstraction must improve clarity, consistency, or reuse. Do not generalize speculative requirements or split trivial operations into excessive layers.

Code must be understandable and maintainable by engineers who did not write it.

### 7.5 No Fake Implementations

The following do not count as completed production functionality:

* Empty methods or placeholder functions.

* Hardcoded mock responses.

* Interfaces without working implementations.

* Static UI without required behavior.

* Buttons or forms without functional actions.

* Unconnected integrations.

* Missing error handling.

* Stubbed services presented as operational.

* Disabled tests used to hide failures.

Mocks and stubs are acceptable for controlled tests, not as substitutes for required implementations.

### 8\. Mandatory Coordinator and Subagent Model

This section is strictly enforced.

Every implementation task must use a coordinator-and-subagent workflow.

The coordinator plans, delegates, reviews, verifies, tracks, and delivers. Subagents implement.

### 8.1 Coordinator Responsibilities

The coordinator must:

* Read the task and relevant sources of truth.

* Inspect repository state and establish the verification baseline.

* Identify responsibilities, boundaries, dependencies, and acceptance criteria.

* Design the implementation plan and execution order.

* Divide the work into clearly scoped tasks.

* Delegate all implementation work to dedicated subagents.

* Review actual changes and subagent reports.

* Identify incomplete work, defects, and architectural violations.

* Delegate corrections and integration work.

* Run repository-level quality gates.

* Update `TODO.md` only after verified completion.

* Commit and push coherent changes.

* Report actual results and remaining blockers.

The coordinator is accountable for the final result and must independently verify subagent work.

### 8.2 Coordinator Must Never Implement

The coordinator must not directly write, create, or modify:

* Source code or implementation modules.

* Tests.

* Application or package logic.

* Package configuration as implementation work.

* Manifests or schemas as implementation work.

* Integrations.

* Architecture or implementation documentation that forms part of the change.

All such work must be delegated, including trivial fixes and documentation changes.

The coordinator may read and inspect files, run commands and tests, analyze errors, plan, delegate, review diffs, request corrections, update `TODO.md`, and perform Git operations.

If an implementation file needs changing, delegate the change. Never bypass this rule because a fix appears small.

### 8.3 Delegation Requirements

Every implementation task must have a dedicated subagent with a clearly defined scope.

Each delegation prompt must specify:

* Objective and expected behavior.

* Relevant requirements and acceptance criteria.

* Files and modules to inspect and own.

* Interfaces and architectural boundaries to preserve.

* Required edge cases and tests.

* Quality gates to run.

* Files or responsibilities not to modify.

* Required completion report.

Provide enough context for the subagent to work without guessing about the product model.

### 8.4 Subagent Responsibilities and Restrictions

Every subagent must read the relevant instructions and architecture, inspect existing code, plan its solution, implement its complete responsibility, add or update tests, run relevant checks, inspect its changes, and report actual results.

Subagents must not:

* Modify `TODO.md`.

* Commit, push, or open pull requests.

* Expand into another agent's scope without approval.

* Modify unrelated modules.

* Violate architecture to simplify implementation.

* Claim tests passed without running them.

* Hide failures or present placeholders as completed work.

Each subagent must report its objective, implementation summary, changed files, interface changes, tests, commands and results, known defects, limitations, and incomplete work.

### 8.5 Isolation and Parallel Work

* Assign clear file and module ownership.

* Parallelize only independent tasks.

* Execute dependent or overlapping work in the correct order.

* Use isolated worktrees or equivalent isolation when appropriate.

* Never allow agents to overwrite each other's work.

* Review compatibility before integrating results.

If a subagent discovers that another module must change, it must report the dependency to the coordinator instead of silently expanding scope.

### 8.6 Independent Review and Delegation Failure

The coordinator must inspect actual diffs and verify completeness, interfaces, dependency direction, tests, error handling, security, documentation, and regressions.

Never accept a result merely because a subagent says it is finished.

If subagent capability is unavailable, do not implement the task as coordinator or fabricate delegation. Report the blocker and leave affected implementation and TODO items incomplete.

### 9\. Mandatory Workflow and Task Completion

Every task must follow this sequence:

* Understand: Read requirements, roadmap, architecture, and existing implementation.

* Inspect: Check Git state, dependencies, tests, and existing failures.

* Plan: Define responsibilities, interfaces, acceptance criteria, and verification.

* Delegate: Assign implementation to appropriately scoped subagents.

* Review: Inspect actual changes and delegate corrections.

* Verify: Run all applicable repository quality gates.

* Document: Update affected documentation, architecture contracts, schemas, and manifests.

* Track: Update `TODO.md` only after verified completion.

* Deliver: Commit, push, and report actual results.

### 9.1 Completion Is Strictly Evidence-Based

A task, subtask, phase, or milestone may be marked complete only when:

* Every requirement and acceptance criterion is satisfied.

* All necessary modules are implemented and integrated.

* Relevant edge cases and errors are handled.

* Required tests exist and pass.

* Applicable formatting, lint, type-check, and build gates pass.

* Architecture and security requirements are satisfied.

* Required documentation and contracts are updated.

* The coordinator has reviewed and independently verified the result.

* No known relevant defect remains.

The existence of code, interfaces, UI, endpoints, or passing happy-path tests does not prove completion.

Never:

* Mark partially implemented work complete.

* Skip difficult requirements.

* Reduce acceptance criteria for convenience.

* Mark a parent task complete while required child tasks remain incomplete.

* Mark tests complete without executing them.

* Claim completion based on a subagent report alone.

* Remove requirements simply to make progress appear greater.

### 9.2 Acceptance Criteria and Evidence

Break substantial tasks into verifiable acceptance criteria before implementation.

Derive criteria from the task, product model, architecture contracts, expected behavior, security requirements, and relevant edge cases. Do not invent easier criteria that exclude required behavior.

The coordinator must retain meaningful evidence for completed work, including relevant implementation files, tests, executed commands, results, and documentation changes.

`TODO.md` must reflect actual project status, not intended progress.

### 9.3 Incomplete or Blocked Work

If a task cannot be completed because of a genuine external blocker:

* Keep it incomplete.

* Mark it blocked where supported.

* Identify the exact blocker and affected requirements.

* Record completed work and verification evidence.

* Explain what is required to unblock it.

* Exhaust reasonable alternatives before declaring a blocker.

Implement independent portions where possible, but never mark the overall task complete while required work remains outstanding.

### 10\. Testing and Quality Assurance

Testing is part of implementation, not an optional final step.

Every applicable change must pass:

* Formatting.

* Linting.

* Type checking.

* Tests.

* Builds.

Inspect repository scripts before running commands. Use actual configured commands and never claim a check passed unless it was executed and its result verified.

Before implementation, establish the relevant baseline. Before completion, the coordinator must run all applicable repository-wide checks, not merely rely on subagent-level verification.

Expected coverage includes:

* Registry/tooling: valid and invalid schemas, manifests, resolution, dependencies, version conflicts, validation, and reproducible artifacts.

* CLI: commands, argument validation, project detection, dry runs, conflicts, path safety, rollback, updates, and removal.

* GitHub: webhook signatures, idempotency, retries, event ordering, permissions, repository lifecycle, and publishing.

* UI: accessibility, keyboard, focus, reduced motion, themes, responsiveness, and component states.

* Blocks: loading, empty, error, pending, success, disabled, streaming, and cancellation.

* Logic: framework-independent unit tests, state transitions, validation, and failure handling.

* Integrations: contract tests, controlled services, adapter behavior, and provider failures.

* Installation: package, source, hybrid, fresh and existing projects, modified files, conflicts, updates, removal, rollback, and path safety.

Visual regression coverage is required for important UI components and blocks.

### Test Integrity

Never hide defects by:

* Deleting or disabling failing tests without valid justification.

* Weakening assertions to accommodate incorrect behavior.

* Replacing meaningful tests with trivial tests.

* Mocking the exact behavior a test must verify.

* Suppressing type errors instead of fixing their cause.

* Excluding broken packages from quality gates without justification.

* Treating skipped or unexecuted tests as passing.

When a test exposes a defect, fix the implementation. When a test itself is incorrect, update it with a clear justification while preserving intended coverage.

If a quality gate fails, investigate the root cause, delegate the fix, rerun the failed check, and rerun affected dependent checks.

### 11\. Mandatory Defect Resolution

Agents must investigate and fix every defect they discover, including pre-existing issues.

This applies to:

* Runtime bugs and incorrect behavior.

* Type, build, test, lint, and formatting errors.

* Broken imports and exports.

* Circular dependencies and architecture violations.

* Security weaknesses and unsafe filesystem operations.

* Invalid schemas, manifests, and configuration.

* Broken interfaces and integrations.

* Incorrect error handling.

* Duplicated or contradictory business logic.

* Dead code and unhandled relevant edge cases.

* Incorrect or misleading documentation.

* Missing required tests.

* Any reproducible issue that compromises correctness, security, maintainability, or expected behavior.

Do not dismiss an issue because it predates the current task or falls outside its original scope.

For every discovered defect:

* Establish or reproduce the problem.

* Identify its root cause and affected modules.

* Determine the correct architectural owner.

* Assess security and regression risks.

* Design a proper fix.

* Delegate implementation to an appropriate subagent.

* Add or update tests.

* Verify the fix and run regression checks.

* Integrate and document significant changes.

Do not hide symptoms through broad suppressions, unsafe casts, disabled checks, discarded exceptions, weakened validation, or fake success responses.

A defect may remain unresolved only when a genuine external blocker, explicit decision, or safety concern prevents a responsible fix. Record the exact issue, impact, attempted solutions, and required action. Keep affected completion criteria incomplete.

Do not use "pre-existing issue" or "outside scope" as excuses to knowingly leave defects unresolved.

### 12\. Security, Documentation, and Compatibility

### 12.1 Security

Security must be considered at every trust boundary.

* Validate manifests, paths, dependencies, artifacts, and external input.

* Verify webhook signatures and reject unauthenticated events.

* Use least-privilege GitHub permissions and scoped publishing tokens.

* Never expose or log secrets and credentials.

* Never commit secrets or environment values.

* Treat repositories, workflows, and external payloads as untrusted.

* Do not execute arbitrary repository code during registry ingestion.

* Forked pull request workflows must not access publishing credentials.

* Record publisher identity and publication provenance.

* Distinguish official, community, verified, deprecated, and compromised assets.

* Prevent path traversal and unsafe command execution.

* Separate authorization from presentation.

* Do not expose sensitive internal errors to public clients.

Never sacrifice security to simplify implementation.

### 12.2 Documentation and Contracts

Documentation must describe actual behavior.

Update relevant documentation whenever public APIs, configuration, CLI behavior, installation, integrations, developer workflows, or asset authoring requirements change.

Update `docs/architecture/` whenever package responsibilities, dependency direction, public interfaces, registry contracts, asset identity, manifests, versioning, installation, GitHub integration, publishing, data ownership, or security boundaries change.

When schemas or published contracts change, update validation, fixtures, tests, examples, and documentation together.

Never document incomplete functionality as available or claim unverified compatibility.

### 12.3 Dependencies and Compatibility

Before adding or changing a dependency:

* Check whether existing capabilities are sufficient.

* Verify compatibility with the locked baseline.

* Consider security, maintenance, licensing, bundle size, and runtime impact.

* Determine whether it belongs in core or optional dependencies.

* Avoid unnecessary transitive dependencies.

Do not import provider SDKs into domain-level code or make optional integrations mandatory without justification.

When changing public interfaces, identify affected consumers, update tests and documentation, and consider backward compatibility. Do not introduce breaking changes merely for convenience.

### 13\. Git Workflow

This repository requires incremental, reviewable history.

### Branching

* Do not work directly on `main`.

* Create a descriptive branch for each major task, phase, package, or independent feature.

* Reuse the current feature branch for small fixes within the same scope.

* Inspect the working tree before switching branches.

* Never overwrite unrelated user changes.

### Committing and Pushing

* Commit after every coherent, working change.

* Prefer small, focused commits with clear imperative messages.

* Each commit should leave the repository in a valid, buildable state where practical.

* Push immediately after every commit.

* Inspect all changes before committing.

* Never commit secrets, credentials, unintended generated data, or unrelated files.

If pushing fails, preserve the local commit, record the exact error, and report that the push did not succeed. Retry after subsequent commits as appropriate.

Never force-push, amend published commits, rewrite shared history, or delete branches containing unmerged work without explicit authorization.

Do not open pull requests unless explicitly requested.

Subagents must never commit, push, or open pull requests. The coordinator owns all Git operations.

### 14\. Definition of Done

A task is complete only when all applicable requirements are satisfied:

Implementation

* All requirements and acceptance criteria are implemented.

* Relevant edge cases and failure states are handled.

* All necessary modules are integrated.

* No required behavior remains as a placeholder.

Architecture and quality

* Module responsibilities and dependency direction are correct.

* No circular dependencies or unintended coupling exist.

* Public interfaces are deliberate.

* Types, validation, and error handling are correct.

* Security, readability, maintainability, and scalability requirements are satisfied.

Verification

* Required tests exist and pass.

* Formatting, lint, type checks, and relevant builds pass.

* Cross-package integration has been checked.

* No known relevant regression or unresolved defect remains.

Documentation and tracking

* Relevant documentation, schemas, and manifests are updated.

* Acceptance criteria are satisfied.

* Required child tasks are complete.

* Completion is supported by evidence.

Delegation and review

* Implementation was delegated.

* Subagent results and actual diffs were reviewed.

* Incomplete work was corrected.

* Coordinator-level verification was performed.

Git

* Changes are on the correct branch.

* User changes were preserved.

* Coherent changes were committed.

* Push was attempted and its result recorded.

If any applicable requirement remains unsatisfied, the task must remain incomplete.

### 15\. Final Operating Rules

Every agent must follow these principles:

* Understand and inspect before acting.

* Read the sources of truth before implementation.

* Design module boundaries before writing code.

* Keep modules cohesive, focused, and loosely coupled.

* Keep framework-independent logic isolated from UI and framework dependencies.

* Use explicit contracts and deliberate public interfaces.

* Avoid unnecessary packages, dependencies, abstractions, and infrastructure.

* Implement complete behavior, including relevant failure cases.

* Delegate all implementation work to dedicated subagents.

* Never allow the coordinator to bypass its responsibilities or implement directly.

* Independently review all delegated work.

* Fix discovered defects, including pre-existing issues.

* Never hide failures or weaken tests to create the appearance of success.

* Never mark partially implemented work complete.

* Never claim verification that was not performed.

* Keep documentation and architecture contracts accurate.

* Preserve user work and Git history.

* Commit coherent changes and push after every commit.

* Report blockers and incomplete work honestly.

* Prioritize correctness, security, professionalism, maintainability, and scalability over the appearance of speed or progress.

The coordinator is accountable for the final result. Subagents are accountable for their assigned implementations.

A task is complete only when it is fully implemented, properly integrated, independently reviewed, and verified against its actual requirements.

When something is broken, fix it. When something is incomplete, finish it. When something violates the architecture, correct it. When something cannot responsibly be completed, document the exact blocker and leave it incomplete.

Never choose the appearance of completion over actual completion.

End of AGENTS.md
