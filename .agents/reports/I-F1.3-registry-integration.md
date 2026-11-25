# I-F1.3 / I-F1.3b — Registry artifact resolver and CLI consumption coverage

Owner: coder | Review: reviewer APPROVE | Security: APPROVE (low residual noted)
Files: `packages/registry/src/artifact-resolver.ts`, `client/index.ts`, `src/index.ts`, `test/client.test.ts`, `test/artifact-resolver.test.ts`, `test/client-integration.test.ts`, `packages/cli/test/registry-path-consumption.test.ts`

## Work

- Added a pure `RegistryArtifactResolver` owning source-v1 path construction and validation (assetId, semantic version, libraryId, sourcePath, final containment). Unsupported/new layouts are rejected with `UNSUPPORTED_ARTIFACT_LAYOUT` instead of inventing an undefined published shape.
- `RegistryClient` now delegates all path construction to the resolver and maps resolver errors into structured `RegistryClientError` codes.
- Corrected the doubled-path defect: `assets/ui/ui/button/.../manifest.json` -> `ui/button/@1.0.0/asset.json`.
- Replaced doubled-path mocks with justified canonical fixtures; added regression tests for invalid version and exact requested paths.

## Review remediation

- Initial REQUEST_CHANGES: missing CLI contract coverage. Fixed in I-F1.3b with a CLI test that uses a real `RegistryClient` against checked-in `registry/ui/button/@1.0.0/asset.json` through `planInstallation` and `SourceInstaller`, with temp-directory isolation and no mocked client.

## Verification

- `pnpm --filter @simplify-dev/registry test` => 6 files, 104 tests passed.
- `pnpm --filter @simplify-dev/cli test` => 16 files, 207 tests passed.
- Full chain `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build` => exit 0.

## Residual risks

- Security low finding: containment is lexical (`resolve`/`relative`) without `realpath`; a symlink inside registry source could escape on read. No symlinks tracked today; resolver is read-only and client reads are trusted-source. Tracked as open risk, non-blocking per security APPROVE.
- Published on-disk artifact layout remains undefined; resolver rejects unknown layouts deliberately.
- CLI source installs still lack tracked asset source files (e.g. `src/button.tsx`).
