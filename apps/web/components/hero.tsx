import {
  Badge,
  Button,
  Card,
  Container,
  Separator,
  SplitView,
  Stack,
  Text,
} from '@simplify-dev/ui';

import { formatGeneratedAt } from '../lib/catalog';
import type { CSSVars, RegistrySnapshot } from '../lib/types';
import styles from '../styles/hero.module.css';

interface HeroProps {
  readonly snapshot: RegistrySnapshot;
}

/** Server-rendered introduction and a real-data signal panel. */
export function Hero({ snapshot }: HeroProps) {
  const maxCount = Math.max(1, ...snapshot.categoryCounts.map((entry) => entry.count));

  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.glow} aria-hidden="true" />
      <Container size="lg" className={styles.inner}>
        <SplitView ratio={[1.1, 0.9]} splitAt="lg" gap="10" className={styles.split}>
          <SplitView.Side className={styles.copy}>
            <Stack gap="5">
              <div className={styles.eyebrow}>
                <Badge variant="neutral" size="sm" dot>
                  Registry index v{snapshot.schemaVersion}
                </Badge>
                <Text as="span" variant="caption" tone="subtle">
                  Generated {formatGeneratedAt(snapshot.generatedAt)} · UTC
                </Text>
              </div>

              <Text
                as="h1"
                variant="lead"
                weight="semibold"
                className={styles.title}
                id="hero-title"
              >
                Composable building blocks, ready to ship.
              </Text>

              <Text
                as="p"
                variant="body"
                tone="muted"
                className={styles.lead}
                id="hero-description"
              >
                Discover, install, customize, and connect reusable software building blocks. Every
                entry below is read directly from the local registry index and its versioned
                manifests.
              </Text>

              <div className={styles.actions}>
                <Button
                  asChild
                  variant="primary"
                  size="lg"
                  trailing={<span aria-hidden="true">→</span>}
                >
                  <a href="#browse">Browse assets</a>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <a href="#libraries">Explore libraries</a>
                </Button>
              </div>

              <Stack direction="row" gap="6" className={styles.statsRow} wrap>
                <div className={styles.stat}>
                  <Text as="span" variant="lead" weight="semibold" className={styles.statValue}>
                    {snapshot.assets.length}
                  </Text>
                  <Text as="span" variant="caption" tone="subtle">
                    assets indexed
                  </Text>
                </div>
                <div className={styles.stat}>
                  <Text as="span" variant="lead" weight="semibold" className={styles.statValue}>
                    {snapshot.libraries.length}
                  </Text>
                  <Text as="span" variant="caption" tone="subtle">
                    libraries
                  </Text>
                </div>
                <div className={styles.stat}>
                  <Text as="span" variant="lead" weight="semibold" className={styles.statValue}>
                    {snapshot.manifestCount}
                  </Text>
                  <Text as="span" variant="caption" tone="subtle">
                    detailed manifests
                  </Text>
                </div>
              </Stack>
            </Stack>
          </SplitView.Side>

          <SplitView.Side className={styles.signalSide}>
            <Card variant="elevated" className={styles.signal}>
              <Stack gap="5">
                <div className={styles.signalHeader}>
                  <div>
                    <Text as="p" variant="label" tone="subtle" className={styles.signalEyebrow}>
                      Registry signal
                    </Text>
                    <Text as="p" variant="body" weight="semibold" className={styles.signalTitle}>
                      Asset distribution
                    </Text>
                  </div>
                  <Badge variant="success" size="sm" dot>
                    indexed
                  </Badge>
                </div>

                <Separator />

                <Stack gap="3" className={styles.bars}>
                  {snapshot.categoryCounts.map((entry, index) => {
                    const style: CSSVars = {
                      '--bar-scale': entry.count / maxCount,
                      '--bar-index': index,
                    };
                    return (
                      <div className={styles.barRow} key={entry.category}>
                        <Text as="span" variant="caption" tone="muted" className={styles.barLabel}>
                          {entry.label}
                        </Text>
                        <div
                          className={styles.barTrack}
                          role="img"
                          aria-label={`${entry.label}: ${entry.count} assets`}
                        >
                          <span className={styles.barFill} style={style} />
                        </div>
                        <Text as="span" variant="caption" tone="subtle" className={styles.barCount}>
                          {String(entry.count).padStart(2, '0')}
                        </Text>
                      </div>
                    );
                  })}
                </Stack>

                <Separator />

                <div className={styles.signalFooter}>
                  <Text as="span" variant="caption" tone="subtle">
                    Source · registry/index.json
                  </Text>
                  <Text as="span" variant="caption" tone="subtle">
                    {snapshot.assets.length} total entries
                  </Text>
                </div>
              </Stack>
            </Card>
          </SplitView.Side>
        </SplitView>
      </Container>
    </section>
  );
}
