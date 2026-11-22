import { AutoGrid, Card, Container, Skeleton, Stack } from '@simplify-dev/ui';

import styles from '../styles/browser.module.css';

/** Streaming fallback that reserves the same shape as the real catalog grid. */
export function CatalogSkeleton() {
  return (
    <main id="main">
      <section className={styles.section} aria-busy="true">
        <Container size="lg">
          <div role="status" aria-label="Loading registry assets">
            <Stack gap="6">
              <Skeleton
                variant="text"
                width="14rem"
                height="1.5rem"
                label="Loading catalog heading"
              />
              <Skeleton variant="rect" height="3.5rem" />
              <AutoGrid columns={{ base: 1, md: 2, xl: 3 }} gap="5">
                {Array.from({ length: 6 }, (_, index) => (
                  <Card key={index} variant="default" className={styles.skeletonCard}>
                    <Stack gap="4">
                      <Skeleton variant="text" width="30%" height="0.75rem" />
                      <Skeleton variant="text" width="70%" height="1.5rem" />
                      <Skeleton variant="text" lines={2} />
                      <Skeleton variant="rect" height="2.5rem" />
                    </Stack>
                  </Card>
                ))}
              </AutoGrid>
            </Stack>
          </div>
        </Container>
      </section>
    </main>
  );
}
