'use client';

import {
  Badge,
  Button,
  Card,
  Stack,
  Text,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@simplify-dev/ui';

import { CATEGORY_LABELS, statusVariant } from '../lib/catalog';
import type { CSSVars, RegistryAssetView } from '../lib/types';
import styles from '../styles/browser.module.css';

interface AssetCardProps {
  readonly asset: RegistryAssetView;
  readonly index: number;
  readonly onInspect: (asset: RegistryAssetView) => void;
}

/** A single real registry asset, presented with a staggered entrance. */
export function AssetCard({ asset, index, onInspect }: AssetCardProps) {
  const style: CSSVars = { '--stagger': `${Math.min(index, 9) * 40}ms` };

  return (
    <Card variant="default" padding="5" className={styles.card} style={style}>
      <Stack gap="4" className={styles.cardInner}>
        <div className={styles.cardTop}>
          <Badge variant="neutral" size="sm">
            {CATEGORY_LABELS[asset.category]}
          </Badge>
          <Badge variant={statusVariant(asset.status)} size="sm" dot>
            {asset.status}
          </Badge>
          <Tooltip>
            <TooltipTrigger
              className={styles.sourceChip}
              aria-label={`Data source for ${asset.name}`}
            >
              <span className={styles.sourceDot} aria-hidden="true" />
              {asset.manifest ? 'manifest' : 'index'}
            </TooltipTrigger>
            <TooltipContent>
              <Text as="span" variant="caption">
                {asset.manifest?.sourcePath ?? asset.sourcePath}
              </Text>
            </TooltipContent>
          </Tooltip>
        </div>

        <Stack gap="1">
          <Text as="h3" variant="lead" weight="semibold" className={styles.cardTitle}>
            {asset.name}
          </Text>
          <Text as="span" variant="caption" tone="subtle" className={styles.cardId}>
            {asset.id}
          </Text>
        </Stack>

        <Text as="p" variant="body" tone="muted" className={styles.cardDescription}>
          {asset.description}
        </Text>

        <div className={styles.tagRow}>
          {asset.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="neutral" size="sm">
              {tag}
            </Badge>
          ))}
        </div>

        <div className={styles.cardFooter}>
          <Text as="span" variant="caption" tone="subtle" className={styles.cardVersion}>
            v{asset.version}
          </Text>
          <Button
            variant="ghost"
            size="sm"
            trailing={<span aria-hidden="true">→</span>}
            onClick={() => onInspect(asset)}
          >
            Inspect
          </Button>
        </div>
      </Stack>
    </Card>
  );
}
