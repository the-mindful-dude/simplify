import { Badge, Button, Card, Container, Stack, Text } from '@simplify-dev/ui';

import styles from '../styles/data-error.module.css';

/** Route not-found UI, keeping the single-page anchor navigation coherent. */
export default function NotFound() {
  return (
    <main id="main" className={styles.wrap}>
      <Container size="md">
        <Card variant="elevated" className={styles.card}>
          <Stack gap="4">
            <Badge variant="neutral" size="sm" dot>
              Not found
            </Badge>
            <Text as="h1" variant="lead" weight="semibold">
              This page does not exist
            </Text>
            <Text as="p" tone="muted">
              The registry browser is available on the home page.
            </Text>
            <Button asChild variant="outline" size="sm">
              <a href="/#top">Return to registry</a>
            </Button>
          </Stack>
        </Card>
      </Container>
    </main>
  );
}
