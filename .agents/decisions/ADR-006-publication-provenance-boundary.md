# ADR-006 — Local builds emit unverified provenance; immutable publication records belong to the registry

- Status: accepted
- Date: 2026-11-21
- Owners: architect
- Related tasks: T-031, T-034, T-037 (transcription), Phase 8 (consumer of the immutable contract)

## Context

Observed facts (verified by inspection on branch `feat/ui-foundation-hardening`, working tree at
`b63b1b9` plus in-flight phase diffs):

- T-031 replaced the old placeholders (`owner: 'unknown'`, 40-zero SHA, `publisher: 'unknown'`) with
  fail-fast checks and a structured `PublicationProvenanceError`
  (`packages/tooling/src/library-builder/index.ts:56-76,264-276`, diff confirmed in the working tree).
  That part is correct and is retained.
- `resolveCommitSha` returns any non-empty `GITHUB_SHA` verbatim
  (`packages/tooling/src/library-builder/index.ts:178-182`); the detached-HEAD branch alone checks
  40 hex (`:203`), while the `ref:` branch returns any non-empty ref value (`:192-201`). The test
  at `packages/tooling/test/library-builder.test.ts:176-194` treats `github-sha-1234` as a valid SHA.
- `parseRepositoryIdentity` accepts any host from the untrusted `library.json`
  (`packages/tooling/src/library-builder/index.ts:89-126`; manifest field is `minLength: 1` only at
  `schemas/src/library.ts:27,79`). It silently takes the last two path segments, so `owner/a/b`
  yields `owner=b` (`:113-119`).
- `publisher` is chosen from `GITHUB_ACTOR`, a manifest maintainer name, or the manifest repository
  owner (`packages/tooling/src/library-builder/index.ts:256-262`). None of these is bound to the
  repository or commit; the manifest and env are untrusted inputs (`AGENTS.md:316`).
- The builder stamps `immutable: true` (`:399`) and passes local schema validation (`:402-409`), but
  it does not persist a version, does not verify the SHA against a repository, and cannot enforce
  immutability. The schema hard-codes `immutable: { const: true }` with `additionalProperties: false`
  (`schemas/src/publication.ts:28,65-91`); other fields are only `minLength: 1` (`:44-48,88`).
- Phase 8 is blocked (no GitHub credentials: `ADR-004:23`, `.agents/ledger.yaml:676`) and there is no
  downstream consumer that trusts immutability (task context T-041). The immutable record is
  currently an inert, unverified claim.
- The only in-repo consumer of `BuildResult` is the CLI `library-build` command
  (`packages/cli/src/commands/library-build.ts:2,54,59-90`), which reads `artifacts`, `metadata.*`
  and `deterministic` only. The `publicationRecord` fields in
  `packages/cli/test/library-build.test.ts:30,32` are unused mock data.
- Publishing responsibility is already assigned elsewhere: "Registry API service ... hosts
  webhook ingestion and publishing coordination endpoints" and "Registry stores immutable
  publication records" (`docs/architecture/github-integration.md:19-23`); the per-version
  provenance list is in `docs/MODEL.md:491-502`.
- There is a latent competing representation for `repositoryId`: the builder emits a URL
  (`packages/tooling/src/library-builder/index.ts:387`) while the registry fixture uses a GitHub node
  id (`packages/registry/test/validation.test.ts:177`); both pass `minLength: 1`
  (`schemas/src/publication.ts:44`). This ADR does not change that field.

Intended behavior vs proposed change: the intended behavior is correct provenance
(`AGENTS.md:248-252,833`; `docs/MODEL.md:491-508`). The current local build cannot establish it. The
proposal below is a bounded correction; no behavior is invented and no credential is added.

## Decision

### 1. Local build output is a provenance _candidate_, not a publication record

`buildLibrary` must stop emitting `PublicationRecord` and stop asserting `immutable: true`. Change
`BuildMetadata.publicationRecord` and `BuildResult.publicationRecord`
(`packages/tooling/src/library-builder/index.ts:42,48`) to a tooling-owned
`ProvenanceCandidate` (rename the field to `provenance`), containing only locally observable data:
`source` (repository identity + SHA), `publisher` (attributed claim), `generatedAt`, and `artifact`
(integrity hash). It has **no `immutable` field and no `verified` flag** — absence of the claim is the
representation, so no schema change is needed. Export `ProvenanceCandidate` and
`PublicationProvenanceError` from `packages/tooling/src/index.ts:1-8` (additive; the error is already
`export`ed from its module at `index.ts:62`). Keep `generatedAt`, hashes and `deterministic`
unchanged so artifact behavior stays identical. Remove now-dead null handling (`:278,430`) as
cleanup only.

`immutable: true` may be stamped **only** by the publishing service (Phase 8) after: (a) the
repository identity is verified through an authenticated GitHub App installation for `owner/name`;
(b) the commit SHA is confirmed to exist in that repository and to match the stored artifact
snapshot; (c) the publisher is bound to that authenticated installation/actor; (d) the version is
written once with its integrity hash. Tooling must not perform (a)-(d).

### 2. Exact local validation rules (no network, no credentials, no new dependency)

Reuse the existing `PublicationProvenanceError` code `publication_provenance_unavailable`
(`index.ts:56,63`) for all failures below; put the specific reason in `message`/`missing`. Do not add
a second error code (consumer compatibility).

**Commit SHA** — apply one validator to both env and `.git` sources at `index.ts:178-208`:

- Accept only `/^[0-9a-f]{40}$/i`; normalize to lowercase in the output.
- Reject empty, wrong length, non-hex, and all-zero (`^0{40}$`).
- `github-sha-1234` therefore becomes a rejection case; the positive no-`.git` test uses a real
  40-hex value.

**Repository host/identity** — at `index.ts:89-126`:

- Allowlist the host exactly `github.com` (case-insensitive), for URL form (`parsed.hostname`),
  scp form (`git@github.com:owner/name.git`) and bare `owner/name` form. Any other host is rejected.
- For URL form require `protocol === 'https:'`; reject `username`, `password`, non-empty `port`,
  `search` and `hash` (blocks `user@github.com`, `github.com:8443`, `github.com.evil`, query tricks).
- Require exactly two path segments after trimming slashes and stripping a single trailing `.git`.
- Owner must match `^[A-Za-z0-9][A-Za-z0-9-]{0,38}$`; name must match
  `^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$` after `.git` stripping; reject `.` and `..`.
- Keep the emitted `url`/`repositoryId` as the normalized `https://github.com/<owner>/<name>`
  (`:124,387`); do not reinterpret `repositoryId`.

**Publisher** — at `index.ts:256-262`:

- Keep precedence `GITHUB_ACTOR` → first non-empty maintainer name → repository owner, but treat the
  result strictly as an _attributed claim_ (field name and docs say so; no security property is
  attached to it).
- When `GITHUB_ACTIONS === 'true'` and `GITHUB_REPOSITORY` is set, require
  `GITHUB_REPOSITORY.toLowerCase() === '<owner>/<name>'` from the validated manifest repository;
  mismatch throws `PublicationProvenanceError`. This correlates runner-provided evidence with the
  manifest (both `GITHUB_SHA` and `GITHUB_ACTOR` are already read); it is **correlation, not
  authentication**, and requires no credential or network call.
- Keep the existing fail-fast check at `:264-276` when any of the three values is absent.
- Residual (accepted, not fixable here): in a local non-Actions build, env and manifest values can
  still be forged. That is precisely why no `immutable` claim is emitted and why downstream trust is
  deferred to Phase 8.

### 3. Boundary ownership (unchanged direction)

- `packages/tooling/src/library-builder` owns: local build, artifact integrity, syntactic
  provenance validation, and the unverified candidate.
- `apps/registry-api` / `packages/github` (Phase 8) own: authenticated verification and publishing.
- `packages/registry` / schemas own: the `PublicationRecord` contract and its validation
  (`packages/registry/src/validation.ts:9,46`). Its validator and fixture
  (`packages/registry/test/validation.test.ts:171-193`) stay as-is.
- No new package, no new workspace dependency, no GitHub SDK import into tooling, no schema edit.
  Dependency direction from `AGENTS.md:113-176` is preserved.

## Alternatives considered

| Alternative                                                                                                     | Why rejected                                                                                                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keep `immutable: true` and only tighten SHA/host validation                                                     | Still asserts a trust property the local tool cannot enforce; the publisher-binding finding remains. Security T-034 stays blocked.                                                                                                     |
| Change schema to `immutable: boolean` / add `verification: 'verified' \| 'unverified'`                          | Correct long-term design but changes a published contract (`schemas/src/publication.ts:28,89`) plus validator/fixtures/docs (`AGENTS.md:851-853`). Unnecessary now: no consumer trusts the flag. Defer to a separate ADR with Phase 8. |
| Emit the existing `DevelopmentSnapshot` (`schemas/src/publication.ts:31-37,93-107`) as the provisional artifact | Loses publisher, repository identity and artifact integrity, and requires plumbing a `branch` the builder does not currently resolve. Larger change with less information.                                                             |
| Fetch/verify the commit via the GitHub API to bind identity                                                     | Requires credentials and network in a phase explicitly blocked on credentials (`ADR-004:23`); over-engineering and violates isolation of untrusted input.                                                                              |
| Treat `GITHUB_ACTOR`/maintainer as an authenticated publisher                                                   | Unfounded: both are untrusted strings (`AGENTS.md:316`).                                                                                                                                                                               |
| New `provenance` package or shared validation package                                                           | No independent boundary; violates `AGENTS.md:180-181,352-383`. One authoritative validator stays in the builder.                                                                                                                       |

## Consequences

Positive: the blocking security finding is resolved without credentials; a single local validator
rejects malformed/forged-looking provenance; no fake immutability claim; boundary between build and
publish becomes explicit; CLI behavior is unchanged.

Negative / new obligations: `BuildResult`/`BuildMetadata` gain a small public contract change
(`publicationRecord: PublicationRecord` → `provenance: ProvenanceCandidate`), so tooling test mocks
must be updated; external consumers (none observed in-repo) that read `publicationRecord` would need
migration. Phase 8 must mint the `PublicationRecord` and perform the four verification steps before
any consumer may trust `immutable`.

Neutral: `deterministic`, artifact hashes and exclusion behavior are unchanged.

## Boundary and dependency impact

- Changed public surface (`@simplify-dev/tooling`): `BuildResult.publicationRecord` and
  `BuildMetadata.publicationRecord` become `provenance: ProvenanceCandidate`; `ProvenanceCandidate`
  and `PublicationProvenanceError` added to `packages/tooling/src/index.ts:1-8`.
- Removed edge: `packages/tooling/src/library-builder` no longer calls
  `validatePublicationRecord` (`index.ts:9,402-409`) at build time; schema validation of the real
  record moves to the publishing boundary (Phase 8).
- Added edge: `packages/tooling/src/library-builder` reads `GITHUB_REPOSITORY` (and optionally
  `GITHUB_ACTIONS`) as env correlation inputs — same trust tier as the already-read `GITHUB_SHA`/
  `GITHUB_ACTOR`, no new package edge.
- Unchanged: CLI → tooling (`packages/cli/src/commands/library-build.ts:2`); registry → schemas
  validation; no edge to `packages/github`, `apps/web` or any new package.

## Migration plan (each step keeps the system working)

1. In `packages/tooling/src/library-builder/index.ts`, add the SHA/host/publisher validators and
   apply them at `:178-208`, `:89-126`, `:256-262`; keep `PublicationProvenanceError` and its code.
2. Replace the `PublicationRecord` construction at `:382-400` with `ProvenanceCandidate`; delete the
   local `validatePublicationRecord` call at `:402-409` and the unused import at `:9`. Keep the
   artifact/exclusion pipeline (`:281-380,411-450`) byte-for-byte unchanged.
3. Update `BuildMetadata`/`BuildResult` (`:34-50`) and re-export the two types from
   `packages/tooling/src/index.ts:1-8`.
4. Update tooling tests (list in §Verification) and the two stale mock fields in
   `packages/cli/test/library-build.test.ts:30,32`. CLI source (`library-build.ts`) needs no change.
5. Run targeted gates, then coordinator-wide gates; security T-034 re-reviews the diff.
6. Phase 8 (separate change, credentials required) mints the immutable `PublicationRecord` at the
   publishing boundary. No schema migration is required for steps 1-5; rollback is per commit.

## Risks

- Risk: external tooling consumers read `publicationRecord`. Likelihood: low (pre-release scope, no
  in-repo consumer reads it). Mitigation: additive type export, documented change, coordinator
  review of re-exports.
- Risk: `GITHUB_REPOSITORY` correlation gives false confidence. Likelihood: medium if read as
  authentication. Mitigation: document it as correlation only; never derive `immutable` from it.
- Risk: SHA-256 Git object ids (64 hex) are rejected. Likelihood: low (not in locked baseline).
  Mitigation: revisit with an ADR when the baseline requires them.
- Risk: unchanged `repositoryId` representation drift (URL vs node id). Likelihood: low impact now.
  Mitigation: separate ADR before Phase 8 publishes records.

## Verification

Implementation gates (owned by the T-031 follow-up): `pnpm --filter @simplify-dev/tooling test`,
`pnpm --filter @simplify-dev/cli test`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, then
full `pnpm test` / `pnpm build` by the coordinator.

Exact test changes:

- `packages/tooling/test/library-builder.test.ts:176-194`: change the `github-sha-1234` case from a
  positive assertion to `PublicationProvenanceError` (`missing` contains `commitSha`, no output file
  written). Add a positive case using a real 40-hex `GITHUB_SHA` without `.git`.
- Add SHA rejection cases: wrong length, non-hex, all-zero; add uppercase-hex accepted and
  lowercase-normalized.
- Add host rejection cases: `https://evil.example/o/n`, `git@evil.example:o/n.git`,
  `https://github.com.evil/o/n`, `https://u:p@github.com/o/n`, `https://github.com:8443/o/n`,
  `https://github.com/o/n?x=1`, one-segment path, `.`/`..` segments. Add positive cases for
  `https://github.com/o/n`, `git@github.com:o/n.git`, `o/n`.
- Add publisher cases: `GITHUB_ACTIONS=true` with mismatching `GITHUB_REPOSITORY` rejects; matching
  accepts; `GITHUB_ACTIONS` absent preserves the existing actor/maintainer/owner behavior
  (`:275-314`) unchanged.
- `packages/tooling/test/library-builder.test.ts:222-239`: remove
  `expect(...immutable).toBe(true)`; assert `result.provenance` carries source/publisher/integrity
  and `expect('immutable' in result.provenance).toBe(false)`. Rename the test accordingly.
- `packages/tooling/test/library-builder.test.ts:275-291`: read `result.provenance.source`; keep all
  "not unknown"/"not zero SHA" assertions.
- `packages/cli/test/library-build.test.ts:30,32`: remove the two unused `publicationRecord` mock
  fields; optional guard at `:113-117` that `--json` metadata has no `immutable` claim.
- `packages/registry/test/validation.test.ts:171-193`: no change; do not weaken immutable validation.

Architectural property check: grep confirms no `immutable: true` written from
`packages/tooling/src/**`, no `validatePublicationRecord` call there, no new dependency in
`packages/tooling/package.json`, and no GitHub SDK import in tooling.

## Architecture review (T-041, recorded inline under lease)

status: needs_review (of the current T-031 diff; approved only when the decision above is applied)
scope: `packages/tooling/src/library-builder/**`, `packages/tooling/test/**`, `schemas/src/publication.ts`,
`packages/cli/src/commands/library-build.ts`, `packages/cli/test/library-build.test.ts`
verdict: T-031 correctly removed placeholders, but the builder still accepts forged-looking SHAs,
any host, unbound publisher strings, and stamps an unenforceable `immutable: true`.

### Observed structure

- `packages/tooling/src/library-builder/index.ts:56-76` — structured provenance error already present.
- `packages/tooling/src/library-builder/index.ts:178-208` — unvalidated GITHUB_SHA / partial .git validation.
- `packages/tooling/src/library-builder/index.ts:89-126` — any host accepted from untrusted manifest.
- `packages/tooling/src/library-builder/index.ts:256-262` — publisher not identity-bound.
- `packages/tooling/src/library-builder/index.ts:382-409` — `immutable: true` stamped and locally validated.
- `schemas/src/publication.ts:28,65-91` — schema cannot express provisional; no edit proposed.
- `packages/cli/src/commands/library-build.ts:54,59-90` — CLI does not consume `publicationRecord`.

### Findings

- [blocker] Unverifiable immutability claim — `index.ts:399` + `schemas/src/publication.ts:89` — required change: stop emitting a `PublicationRecord`; emit `ProvenanceCandidate` without `immutable` (Decision §1).
- [critical] Arbitrary SHA accepted — `index.ts:178-182,192-201` + test `:176-194` — required change: single 40-hex validator, reject all-zero (§2).
- [critical] Arbitrary repository host — `index.ts:89-126` — required change: `github.com` allowlist + URL hygiene + exact two segments (§2).
- [major] Unbound publisher — `index.ts:256-262` — required change: attributed-claim typing + Actions `GITHUB_REPOSITORY` correlation (§2).
- [minor] Competing `repositoryId` representation — `index.ts:387` vs `packages/registry/test/validation.test.ts:177` — follow-up ADR before Phase 8, not this fix.
- [note] T-031's fail-fast error and placeholder removal (`index.ts:56-76,264-276`) are correct and retained.

### Boundary and dependency impact

- Changed: tooling public types (`BuildResult`, `BuildMetadata`); added additive exports.
- Removed: tooling → `validatePublicationRecord` edge at build time.
- Added: tooling reads `GITHUB_REPOSITORY`/`GITHUB_ACTIONS` env (same trust tier as existing env reads).
- Unchanged: CLI → tooling, registry → schemas, no new package/dependency.

### Recommended design

Smallest correct structure: keep one builder file; add three pure validation helpers beside the
existing `parseRepositoryIdentity`/`nonEmpty`; replace one object literal; rename one field; update
tests. No rewrite, no package, no schema change.

### Migration sequence

1. Add validators and apply at the three call sites.
2. Replace the immutable record with the provenance candidate; drop the local schema validation call.
3. Update public types/exports and the two CLI test mocks.
4. Update/add tests; run targeted gates, then full gates; T-034 re-reviews.
5. Phase 8 mints the immutable record at the publishing boundary.

### ADRs

- This document (`.agents/decisions/ADR-006-publication-provenance-boundary.md`); transcribe to
  `docs/architecture/` in T-037. No amendment to ADR-004/005 is needed.

### Risks

- Public type change — mitigate with additive exports and coordinator diff review.
- False confidence in env correlation — document as correlation, not authentication.
- SHA-256 unsupported — defer with ADR if the baseline changes.

### Open questions

- Should Phase 8 also normalize `PublicationSource.repositoryId` to one stable representation?
  Needed before the first immutable record is published; not needed for T-031.
- Should `--json` CLI output expose the provenance candidate by name? Cosmetic; decide with T-037.
