import { Badge, Card, Spinner, Stack, Text } from '@simplify-dev/ui';

import { formatGeneratedAt } from '../lib/catalog';
import { statusBadgeVariant, statusIsInFlight, statusLabel } from '../lib/status-model';
import type { StatusView } from '../lib/status-model';
import styles from '../styles/status.module.css';
import { StatusRetryButton } from './status-retry-button';

/** One status surface. State is always conveyed by text, never by color alone. */
export function StatusCard({ view }: { readonly view: StatusView }) {
  const inFlight = statusIsInFlight(view.state);

  return (
    <Card
      variant="default"
      className={styles.card}
      data-state={view.state}
      aria-busy={inFlight || undefined}
    >
      <Stack gap="3">
        <div className={styles.cardHead}>
          <Text as="h3" variant="label" weight="semibold">
            {view.title}
          </Text>
          <Badge variant={statusBadgeVariant(view.state)} size="sm" dot>
            {statusLabel(view.state)}
          </Badge>
        </div>

        {inFlight ? <Spinner size="sm" label={`${view.title} status in progress`} /> : null}

        <Text as="p" variant="body">
          {view.summary}
        </Text>
        {view.detail ? (
          <Text as="p" variant="caption" tone="muted">
            {view.detail}
          </Text>
        ) : null}
        {view.observedAt ? (
          <Text as="p" variant="caption" tone="subtle">
            Observed <time dateTime={view.observedAt}>{formatGeneratedAt(view.observedAt)}</time>
          </Text>
        ) : null}
        {view.refreshable ? (
          <StatusRetryButton label={`Refresh ${view.title.toLowerCase()} status`} />
        ) : null}
      </Stack>
    </Card>
  );
}
