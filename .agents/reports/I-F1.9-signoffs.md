# I-F1.R6 / I-F1.S6 — I-F1.9 review and security sign-off

- Task: I-F1.9
- Reviewers: reviewer, security
- Status: APPROVE
- Scope: registry real-path containment, path-bearing error sanitization, and regression tests.

## Evidence

- Shared containment rule: `packages/registry/src/artifact-resolver.ts:50-59`; lexical and real-path enforcement at `:166-195`; all client reads guarded at `packages/registry/src/client/index.ts:59-73,91-92,123-124`.
- Sanitized messages/causes: `client/index.ts:26-33,99-119,131-141`; adapter cause stripping at `modules/registry/src/server/repository.ts:21-30`.
- Tests: `packages/registry/test/client-symlink.test.ts:113-240` and `modules/registry/test/server-error.test.ts:51-57` cover out-of-root file/index/intermediate symlinks, benign in-root symlink, symlinked root ancestor, missing file, invalid JSON, and cause-chain sanitization.
- Reviewer: all acceptance criteria PASS; no assertions weakened; public error-code behavior intentional and CLI-compatible.
- Security: original symlink escape and path disclosure findings resolved; no critical/high findings; no dependency, process, network, env, or secret changes.

## Residual risks

- TOCTOU between `realpathSync` and async `readFile` remains; static checked-in registry is the supported boundary.
- Dangling out-of-root symlinks yield `REGISTRY_FILE_NOT_FOUND`, not `PATH_ESCAPES_ROOT`; no path disclosure and requires the same write-access precondition.
- Resolver validation messages can echo caller-supplied values; not an internal host-path disclosure.

## Checks

- Reviewer observed: registry 7 files/112 tests; module 4 files/17 tests; CLI 16 files/208 tests; package typecheck/lint; format check.
- Security observed: registry and module tests/typechecks passed.
- Coordinator final full chain: format, lint, typecheck, test, and build passed; boundary self-test 27/27 and scan 196 files/0 findings.

## Outcome

APPROVE. Changes are committed in `d25dcb8`. Next safe action: keep I-F1.12 as the user-approved later-phase source-content exception.
