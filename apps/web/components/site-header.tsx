import { Badge, Button, Container, Text } from '@simplify-dev/ui';

import styles from '../styles/site-header.module.css';

interface SiteHeaderProps {
  readonly assetCount: number;
  readonly libraryCount: number;
  readonly schemaVersion: number;
}

/** Sticky product header. Server-rendered; navigation targets real page sections. */
export function SiteHeader({ assetCount, libraryCount, schemaVersion }: SiteHeaderProps) {
  return (
    <header className={styles.header}>
      <Container size="full" className={styles.inner}>
        <a className={styles.brand} href="#top" aria-label="simplify.dev, back to top">
          <span className={styles.mark} aria-hidden="true" />
          <Text as="span" variant="body" weight="semibold" className={styles.brandText}>
            simplify<span className={styles.brandDot}>.dev</span>
          </Text>
        </a>

        <nav className={styles.nav} aria-label="Primary">
          <Button asChild variant="ghost" size="sm">
            <a href="#browse">Browse</a>
          </Button>
          <Button asChild variant="ghost" size="sm" hiddenBelow="md">
            <a href="#libraries">Libraries</a>
          </Button>
          <Button asChild variant="ghost" size="sm" hiddenBelow="lg">
            <a href="#sources">Sources</a>
          </Button>
        </nav>

        <div className={styles.meta}>
          <Badge variant="neutral" size="sm">
            {assetCount} assets
          </Badge>
          <Badge variant="neutral" size="sm" hiddenBelow="sm">
            {libraryCount} libraries
          </Badge>
          <Badge variant="neutral" size="sm" hiddenBelow="lg">
            schema v{schemaVersion}
          </Badge>
        </div>
      </Container>
    </header>
  );
}
