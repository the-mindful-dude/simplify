'use client';

import { Badge, Button, Card, Container, Stack, Text } from '@simplify-dev/ui';

import styles from '../styles/data-error.module.css';

interface ErrorBoundaryProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

/** Route error boundary. Never renders the underlying error value. */
export default function ErrorBoundary({ reset }: ErrorBoundaryProps) {
  return (
    <main id="main" className={styles.wrap}>
      <Container size="md">
        <Card variant="elevated" className={styles.card}>
          <Stack gap="4">
            <Badge variant="danger" size="sm" dot>
              Unexpected error
            </Badge>
            <Text as="h1" variant="lead" weight="semibold">
              This page could not be rendered
            </Text>
            <Text as="p" tone="muted" role="alert">
              An unexpected error occurred. Try again; if it persists, check the local registry
              source and reload.
            </Text>
            <Button variant="outline" size="sm" onClick={reset}>
              Try again
            </Button>
          </Stack>
        </Card>
      </Container>
    </main>
  );
}
