# Changesets

This directory tracks versioning for simplify.dev's own workspace packages.

Create a changeset for every change that affects a publishable package:

```bash
pnpm changeset
```

Apply version bumps and changelog updates:

```bash
pnpm version-packages
```

Publish after building:

```bash
pnpm release
```

Library releases published through simplify.dev are versioned independently from internal
package releases.
