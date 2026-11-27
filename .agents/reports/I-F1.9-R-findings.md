# I-F1.9-R — Registry containment and error-cause research

- Task ID: I-F1.9-R
- Role: explore (READ-ONLY)
- Status: COMPLETE
- Scope: `packages/registry/src/**`, `packages/registry/test/**`, `modules/registry/src/server/repository.ts`, existing path-safety and error-chain tests.

## Commands and exact outcomes

- Globbed registry/module source and test trees: 8 source files and 6 tests in `packages/registry`; 13 source files and 3 tests in `modules/registry`.
- Grep for `realpath|lstat|symlink|isSymbolicLink` over TypeScript: only `packages/cli/test/init.test.ts:7,147`; no repository implementation resolves symlinks.
- Grep for path containment rules: `packages/registry/src/artifact-resolver.ts:17,153-170`; `packages/registry/src/validation.ts:71-77,123-129,148-153`; tests at `artifact-resolver.test.ts:74-105,124-133` and `validation.test.ts:76-90,123-130`.
- `find registry -type l -print` and Git mode `120000` check: no output; no checked-in symlinks today.
- Grep for `.cause` / error classes: `modules/registry/src/server/repository.ts:57`, `modules/registry/src/errors.ts:41,48`, `modules/core/src/errors.ts:23`.
- Grep for raw `error.message` in CLI: `cli.ts:253,257`, `add.ts:380`, `update.ts:93`, `diff.ts:288`, `doctor.ts:252`.
- No tests were run by the read-only research agent; proposed commands are listed below.

## Observed facts

- `modules/registry/src/server/repository.ts:85,96` delegates to `packages/registry/src/artifact-resolver.ts:154-170` (`resolve` + `relative`, no `realpath`) and then `packages/registry/src/client/index.ts:69,100` calls `readFile`, which follows symlinks.
- Existing tests cover only lexical traversal (`artifact-resolver.test.ts:74-105,124-133`; `client.test.ts:268-278`). `client.test.ts:1-3` mocks only `readFile`; `client-integration.test.ts:26-36` reads benign files.
- `modules/registry/src/server/repository.ts:51-59` catches a raw error and retains it as `cause` while rendering a static public message. The cause chain continues through `errors.ts:33-49` and `modules/core/src/errors.ts:22-27`.
- `packages/registry/src/client/index.ts:73-93,104-113` embeds absolute `filePath` in error messages; Node filesystem errors retained as causes can also carry paths.
- No client disclosure was found: `apps/web/components/registry-content.tsx:12-20` maps only `error.code`; `data-error.tsx:8-29` renders static copy.
- Boundary contract: `modules/registry/test/server-boundary.test.ts:42-52` requires the adapter to contain `RegistryClient`/`RegistryArtifactResolver` and no `readFile(`; path/validation ownership belongs to `packages/registry`.

## Facts vs inference

- Fact: no symlink currently exists in the checked-in registry; the finding is latent, not currently exploitable.
- Inference: a checked-in symlink could pass lexical containment and be followed at build time. The authoritative fix belongs in `packages/registry`; the module adapter must not add a second path implementation.
- Inference: client message sanitization benefits CLI consumers; adapter cause sanitization is supplementary defense-in-depth.

## Coordinator decisions for bounded repair

- Allow benign in-root symlinks; reject symlinks resolving outside the resolved registry root.
- Reuse `PATH_ESCAPES_ROOT` rather than adding a new public error code.
- Sanitize both `RegistryClientError` messages and the adapter’s retained cause; preserve stable codes and static public copy.
- Accept documented TOCTOU residual for the static registry; fd-based `O_NOFOLLOW` reads are out of scope.

## Proposed bounded lease

`packages/registry/src/artifact-resolver.ts`, `packages/registry/src/client/index.ts`, `packages/registry/test/artifact-resolver.test.ts`, `packages/registry/test/client.test.ts` or new `client-symlink.test.ts`, `modules/registry/src/server/repository.ts`, `modules/registry/test/query-contract.test.ts` or new adapter test.

Acceptance: all client read paths enforce real-path containment; out-of-root symlinks rejected with stable code and no absolute path; in-root/symlinked-ancestor reads and missing/invalid-JSON semantics preserved; one authoritative containment rule in `packages/registry`; no new FS/path logic in the module adapter; no raw absolute paths in the error chain exposed to hooks.

## Verification commands

```text
pnpm --filter @simplify-dev/registry test
pnpm --filter @simplify-dev/registry typecheck
pnpm --filter @simplify-dev/registry lint
pnpm --filter @simplify-dev/module-registry test
pnpm --filter @simplify-dev/module-registry typecheck
pnpm --filter @simplify-dev/module-registry lint
pnpm --filter @simplify-dev/cli test
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

## Next safe action

Delegate I-F1.9 to `bugfixer` with the lease above, then require independent reviewer and security sign-off.
