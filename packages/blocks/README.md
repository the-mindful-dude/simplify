# @simplify-dev/blocks

Reusable functional React compositions.

## Responsibilities

- `src/chat/` — Agent Chat interface.
- `src/dashboard/` — Dashboard Shell.
- `src/navigation/` — application navigation.
- `src/forms/` — multi-step and functional form compositions.

## Boundaries

- Depends on `@simplify-dev/ui` and `@simplify-dev/interaction`.
- Must not own application business rules, credentials, authorization, or persistence.
- Provider and database behavior enters through declared integration contracts.
- Each block must be importable without loading unrelated blocks.

## Status

Phase 2 placeholder. Block implementation begins in Phase 14.
