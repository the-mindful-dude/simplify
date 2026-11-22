import { Badge, Container, Separator, Stack, Text } from '@simplify-dev/ui';

import { formatGeneratedAt } from '../lib/catalog';
import type { RegistrySnapshot } from '../lib/types';
import styles from '../styles/site-footer.module.css';

interface SiteFooterProps {
  readonly snapshot: RegistrySnapshot;
}

/** Footer documenting exactly which local files produced the rendered data. */
export function SiteFooter({ snapshot }: SiteFooterProps) {
  const invalidIssues = snapshot.manifestIssues.filter((issue) => issue.kind === 'invalid');
  const absentIssues = snapshot.manifestIssues.filter((issue) => issue.kind === 'absent');

  return (
    <footer className={styles.footer} id="sources">
      <Container size="lg">
        <Separator />
        <div className={styles.grid}>
          <Stack gap="2" className={styles.brandBlock}>
            <Text as="p" variant="body" weight="semibold" className={styles.brand}>
              simplify.dev
            </Text>
            <Text as="p" variant="caption" tone="subtle">
              Registry browser · index generated {formatGeneratedAt(snapshot.generatedAt)}
            </Text>
            {invalidIssues.length > 0 ? (
              <Badge variant="warning" size="sm" dot>
                {invalidIssues.length} manifest issue{invalidIssues.length === 1 ? '' : 's'}
              </Badge>
            ) : null}
          </Stack>

          <Stack gap="2" className={styles.sourceBlock}>
            <Text as="p" variant="label" tone="subtle">
              Real data sources
            </Text>
            <ul className={styles.sourceList}>
              {snapshot.sourceFiles.map((source) => (
                <li key={source}>
                  <code className={styles.code}>{source}</code>
                </li>
              ))}
            </ul>
          </Stack>
        </div>
        {invalidIssues.length > 0 ? (
          <ul className={styles.issues}>
            {invalidIssues.map((issue) => (
              <li key={`${issue.assetId}-${issue.detail}`}>
                <Text as="span" variant="caption" tone="subtle">
                  {issue.assetId}: {issue.detail}
                </Text>
              </li>
            ))}
          </ul>
        ) : null}
        {absentIssues.length > 0 ? (
          <Text as="p" variant="caption" tone="subtle">
            {absentIssues.length} asset{absentIssues.length === 1 ? '' : 's'} use index summaries
            (no versioned manifest).
          </Text>
        ) : null}
      </Container>
    </footer>
  );
}
