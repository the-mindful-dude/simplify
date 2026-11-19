'use client';

import { AutoGrid, Badge, Button, Card, Container, Stack, Text } from '@simplify-dev/ui';

import type { RegistryLibraryView } from '../lib/types';
import styles from '../styles/libraries.module.css';

interface LibrarySectionProps {
  readonly libraries: readonly RegistryLibraryView[];
  readonly activeLibraryId: string;
  readonly onSelect: (libraryId: string) => void;
}

function revealBrowse(): void {
  const target = document.getElementById('browse');
  if (!target) {
    return;
  }
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
}

/** Real library summaries with a control that filters the asset catalog. */
export function LibrarySection({ libraries, activeLibraryId, onSelect }: LibrarySectionProps) {
  return (
    <section className={styles.section} id="libraries" aria-labelledby="libraries-title">
      <Container size="lg">
        <Stack gap="6">
          <div className={styles.heading}>
            <div>
              <Text as="p" variant="label" tone="subtle">
                Collections
              </Text>
              <Text as="h2" variant="lead" weight="semibold" id="libraries-title">
                Libraries
              </Text>
              <Text as="p" variant="body" tone="muted">
                Declared groupings from the registry index. Selecting one filters the assets above.
              </Text>
            </div>
            {activeLibraryId !== 'all' ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onSelect('all');
                  revealBrowse();
                }}
              >
                Clear library filter
              </Button>
            ) : null}
          </div>

          <AutoGrid columns={{ base: 1, md: 2, lg: 3 }} gap="5">
            {libraries.map((library) => {
              const isActive = library.id === activeLibraryId;
              return (
                <Card key={library.id} variant={isActive ? 'elevated' : 'default'} padding="5">
                  <Stack gap="4">
                    <div className={styles.top}>
                      <Text as="h3" variant="body" weight="semibold" className={styles.name}>
                        {library.name}
                      </Text>
                      <Badge variant="neutral" size="sm">
                        v{library.version}
                      </Badge>
                    </div>

                    <Text as="p" variant="caption" tone="muted" className={styles.description}>
                      {library.description}
                    </Text>

                    <div className={styles.tags}>
                      {library.assetIds.slice(0, 4).map((assetId) => (
                        <Badge key={assetId} variant="neutral" size="sm">
                          {assetId}
                        </Badge>
                      ))}
                      {library.assetIds.length > 4 ? (
                        <Badge variant="neutral" size="sm">
                          +{library.assetIds.length - 4}
                        </Badge>
                      ) : null}
                    </div>

                    <div className={styles.footer}>
                      <Text as="span" variant="caption" tone="subtle">
                        {library.assetIds.length} assets
                      </Text>
                      <Button
                        variant={isActive ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => {
                          onSelect(isActive ? 'all' : library.id);
                          revealBrowse();
                        }}
                      >
                        {isActive ? 'Filtering' : 'Filter assets'}
                      </Button>
                    </div>
                  </Stack>
                </Card>
              );
            })}
          </AutoGrid>
        </Stack>
      </Container>
    </section>
  );
}
