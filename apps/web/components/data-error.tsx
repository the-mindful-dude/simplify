import { Badge, Card, Container, Stack, Text } from '@simplify-dev/ui';

import type { RegistryDataErrorCode } from '../lib/types';
import styles from '../styles/data-error.module.css';

type DataErrorCode = RegistryDataErrorCode | 'unknown';

/** Static, non-sensitive copy keyed by a stable data-layer error code. */
const COPY: Record<DataErrorCode, { title: string; detail: string }> = {
  registry_source_not_found: {
    title: 'The registry source could not be found',
    detail:
      'Could not locate registry/index.json. Restore the local registry source and reload the page.',
  },
  index_read_failed: {
    title: 'The registry index could not be read',
    detail: 'The local registry index exists but could not be read. Check file access and reload.',
  },
  index_invalid: {
    title: 'The registry index is invalid',
    detail:
      'registry/index.json did not pass schema validation. Correct the local registry source and reload.',
  },
  unknown: {
    title: 'The registry index could not be loaded',
    detail:
      'An unexpected error occurred while reading the local registry source. Reload the page.',
  },
};

interface DataErrorProps {
  readonly code: DataErrorCode;
}

/** Explicit failure state for an unreadable or invalid local registry source. */
export function DataError({ code }: DataErrorProps) {
  const copy = COPY[code];
  return (
    <main id="main" className={styles.wrap}>
      <Container size="md">
        <Card variant="elevated" className={styles.card}>
          <Stack gap="4">
            <Badge variant="danger" size="sm" dot>
              Registry source error
            </Badge>
            <Text as="h1" variant="lead" weight="semibold">
              {copy.title}
            </Text>
            <Text as="p" tone="muted" role="alert">
              {copy.detail}
            </Text>
            <Text as="p" tone="subtle" variant="caption" className={styles.hint}>
              Expected source: registry/index.json in the repository root.
            </Text>
          </Stack>
        </Card>
      </Container>
    </main>
  );
}
