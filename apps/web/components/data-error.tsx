import { Badge, Card, Container, Stack, Text } from '@simplify-dev/ui';

import styles from '../styles/data-error.module.css';

interface DataErrorProps {
  readonly message: string;
}

/** Explicit failure state for an unreadable or invalid local registry source. */
export function DataError({ message }: DataErrorProps) {
  return (
    <main id="main" className={styles.wrap}>
      <Container size="md">
        <Card variant="elevated" className={styles.card}>
          <Stack gap="4">
            <Badge variant="danger" size="sm" dot>
              Registry source error
            </Badge>
            <Text as="h1" variant="lead" weight="semibold">
              The registry index could not be loaded
            </Text>
            <Text as="p" tone="muted">
              {message}
            </Text>
            <Text as="p" tone="subtle" variant="caption" className={styles.hint}>
              Expected source: registry/index.json in the repository root. Restore the registry
              source and reload the page.
            </Text>
          </Stack>
        </Card>
      </Container>
    </main>
  );
}
