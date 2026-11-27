# I-F1.8-R — React 18 peer declaration research

- Task ID: I-F1.8-R
- Role: explore (READ-ONLY)
- Status: COMPLETE
- Scope: `registry/**`, CLI asset scaffolding/generator sources and tests, dependency docs/schemas, workspace manifests, and lockfiles.

## Commands and exact outcomes

- `git ls-files registry` — 12 tracked files, including five asset manifests.
- `grep -RInE 'peerDependencies|peer[^a-zA-Z]' registry schemas packages/cli docs` — found seven authoritative React 18 peer declarations in four registry manifests plus generic schema/test matches.
- `grep -RInE '\^18|18\.0\.0|18\.2\.0|18\.3\.1' packages/cli/src packages/cli/test registry` — found the generator default and several generic test fixtures.
- `pnpm exec prettier --check "registry/**/*.json" "packages/cli/src/commands/asset-create.ts" "packages/cli/test/asset-create.test.ts" "docs/specifications/dependency-model.md"` — `All matched files use Prettier code style!`
- Working tree was unchanged by the research agent.

## Observed facts

- Locked baseline is React 19: `AGENTS.md:90`, `package.json:45-46,52-53`, `packages/ui/package.json:32-35`, `packages/blocks/package.json:27-30`, `pnpm-lock.yaml:50-55`.
- Authoritative stale peer declarations:
  - `registry/blocks/agent-chat/@1.0.0/asset.json:26-27` — `react`/`react-dom` `^18.3.1`, `peer`.
  - `registry/recipes/agent-chat-postgres/@1.0.0/asset.json:36-37` — `react`/`react-dom` `^18.3.1`, `peer`.
  - `registry/ui/button/@1.0.0/asset.json:22-23` — `react`/`react-dom` `^18.3.1`, `peer`.
  - `registry/integrations/vercel-ai/@1.0.0/asset.json:23` — `react` `^18.3.1`, `peer`.
- Generator defect: `packages/cli/src/commands/asset-create.ts:198-206` emits `react@^18.2.0` as a peer for generated UI assets.
- Peer-specific fixtures: `packages/cli/test/installation-planner.test.ts:97,200,216-218` and `packages/cli/test/hybrid-installer.test.ts:105`.
- `asset-create.test.ts:73-102,215-225` validates generated manifests but does not assert the React peer version.
- CLI install path consumes these values: `packages/registry/src/client/index.ts:34-35,130-140`, `packages/registry/src/resolver/index.ts:384-385,397-399,417-419,457-458`, `packages/cli/src/installation/planner.ts:152-154,176-184,267-274`, `packages/cli/src/commands/add.ts:140-146,174-182`, `packages/cli/src/installation/hybrid-installer.ts:304-338`, `packages/cli/src/installation/package-installer.ts:163-185`. Only `optional` dependencies are skipped; `peer` dependencies are installed.
- Dependency docs/schemas are framework-neutral and intentionally permit arbitrary versions: `docs/specifications/dependency-model.md:20-41`, `docs/specifications/asset-manifest.md:22-34`, `schemas/src/dependency.ts:34-46`, `schemas/src/asset.ts:89-125`.

## Facts vs inference

- Fact: React 19 is authoritative; four checked-in manifests and the generator still emit React 18 peers; CLI treats peers as required installs.
- Inference: Do not change root `package.json`, any lockfile, schemas, dependency-model docs, detection/doctor fixtures, or generic package-installer/phase9 fixtures. Those React 18 strings are compatibility/legacy coverage, not stale authoritative peer declarations.
- Inference: Use `^19.0.0`, matching existing workspace peers; `^19.3.1` would overconstrain consumers to the development baseline.
- Inference: Adding `react-dom` to generated UI assets is a separate consistency question and is not required to remove the React 18 defect.

## Risks and open questions

- Installing React 18 peers into React 19 consumers can produce peer conflicts or unintended downgrades.
- Fixing manifests without the generator permits reintroduction.
- Broad removal of all React 18 literals would reduce intentional legacy detection coverage.
- `registry/README.md:21-23` describes official assets as an unpublished scaffold; no published immutable snapshot was found.

## Next safe action

Delegate bounded task I-F1.8 to `bugfixer`: update seven peer declarations and the generator default to `^19.0.0`, update peer-specific fixtures, add a generated-manifest regression assertion, and run CLI targeted tests plus formatting/typecheck/lint. No lockfile, schema, or docs changes are required.
