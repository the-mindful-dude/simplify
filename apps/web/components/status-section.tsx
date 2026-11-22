import { AutoGrid, Badge, Container, Stack, Text } from '@simplify-dev/ui';

import { statusAnnouncement } from '../lib/status-model';
import type { StatusView } from '../lib/status-model';
import styles from '../styles/status.module.css';
import { StatusAnnouncer } from './status-announcer';
import { StatusCard } from './status-card';

/** Status overview driven by the nine-state model; only locally verifiable facts. */
export function StatusSection({ views }: { readonly views: readonly StatusView[] }) {
  return (
    <section className={styles.section} id="status" aria-labelledby="status-title">
      <Container size="lg">
        <Stack gap="6">
          <Stack gap="2">
            <Badge variant="neutral" size="sm">
              System status
            </Badge>
            <Text
              as="h2"
              variant="lead"
              weight="semibold"
              id="status-title"
              className={styles.title}
            >
              Connection &amp; sync status
            </Text>
            <Text as="p" variant="body" tone="muted">
              Locally verifiable state only. Unavailable services are reported as unavailable rather
              than shown as connected.
            </Text>
          </Stack>

          <AutoGrid columns={{ base: 1, md: 2 }} gap="5">
            {views.map((view) => (
              <StatusCard key={view.domain} view={view} />
            ))}
          </AutoGrid>

          <StatusAnnouncer message={statusAnnouncement(views)} />
        </Stack>
      </Container>
    </section>
  );
}
