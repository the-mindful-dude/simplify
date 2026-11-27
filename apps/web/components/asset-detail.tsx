'use client';

import type { ReactNode } from 'react';

import {
  Badge,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Separator,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@simplify-dev/ui';

import { CATEGORY_LABELS, statusVariant } from '../lib/catalog';
import type { RegistryAssetView } from '../lib/types';
import styles from '../styles/detail.module.css';

interface AssetDetailProps {
  readonly asset: RegistryAssetView | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

function Definition({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className={styles.definition}>
      <dt>
        <Text as="span" variant="caption" tone="subtle">
          {label}
        </Text>
      </dt>
      <dd className={styles.definitionValue}>{children}</dd>
    </div>
  );
}

/** Accessible detail dialog driven entirely by one real registry asset. */
export function AssetDetail({ asset, open, onOpenChange }: AssetDetailProps) {
  if (!asset) {
    return null;
  }

  const manifest = asset.manifest;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        className={styles.content}
        aria-describedby="asset-detail-description"
      >
        <DialogHeader className={styles.header}>
          <div className={styles.headerBadges}>
            <Badge variant="neutral" size="sm">
              {CATEGORY_LABELS[asset.category]}
            </Badge>
            <Badge variant={statusVariant(asset.status)} size="sm" dot>
              {asset.status}
            </Badge>
            <Badge variant="neutral" size="sm">
              v{asset.version}
            </Badge>
          </div>
          <DialogTitle className={styles.title}>{asset.name}</DialogTitle>
          <DialogDescription className={styles.description} id="asset-detail-description">
            {asset.description}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" key={asset.id} className={styles.tabs}>
          <TabsList aria-label="Asset detail sections" className={styles.tabList}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {manifest ? <TabsTrigger value="dependencies">Dependencies</TabsTrigger> : null}
            {manifest ? <TabsTrigger value="installation">Installation</TabsTrigger> : null}
          </TabsList>

          <TabsContent value="overview" className={styles.tabPanel}>
            <Stack gap="5">
              <dl className={styles.definitions}>
                <Definition label="Asset ID">
                  <Text as="span" variant="code" className={styles.code}>
                    {asset.id}
                  </Text>
                </Definition>
                <Definition label="Publisher">
                  <Text as="span" variant="caption">
                    {asset.publisher}
                  </Text>
                </Definition>
                <Definition label="Targets">
                  <Stack direction="row" gap="2" wrap>
                    {asset.targets.map((target) => (
                      <Badge key={target.label} variant="neutral" size="sm">
                        {target.label}
                      </Badge>
                    ))}
                  </Stack>
                </Definition>
                <Definition label="Source">
                  <Text as="span" variant="code" className={styles.code}>
                    {manifest?.sourcePath ?? asset.sourcePath}
                  </Text>
                </Definition>
                {manifest ? (
                  <Definition label="License">
                    <Badge variant="neutral" size="sm">
                      {manifest.license}
                    </Badge>
                  </Definition>
                ) : null}
              </dl>

              {manifest && manifest.implementations.length > 0 ? (
                <>
                  <Separator />
                  <Stack gap="3">
                    <Text as="h3" variant="label" tone="subtle">
                      Implementations
                    </Text>
                    <ul className={styles.plainList}>
                      {manifest.implementations.map((implementation) => (
                        <li key={`${implementation.id}-${implementation.entry}`}>
                          <Stack direction="row" gap="2" align="center" wrap>
                            <Badge variant="neutral" size="sm">
                              {implementation.id}
                            </Badge>
                            <Badge variant="neutral" size="sm">
                              {implementation.mode}
                            </Badge>
                            <Text as="span" variant="code" className={styles.code}>
                              {implementation.entry}
                            </Text>
                            <Text as="span" variant="caption" tone="subtle">
                              {implementation.targetLabel}
                            </Text>
                          </Stack>
                        </li>
                      ))}
                    </ul>
                  </Stack>
                </>
              ) : null}

              {manifest && manifest.documentation.examples.length > 0 ? (
                <>
                  <Separator />
                  <Stack gap="3">
                    <Text as="h3" variant="label" tone="subtle">
                      Documentation examples
                    </Text>
                    <Stack direction="row" gap="2" wrap>
                      {manifest.documentation.examples.map((example) => (
                        <Badge key={example} variant="neutral" size="sm">
                          {example}
                        </Badge>
                      ))}
                    </Stack>
                  </Stack>
                </>
              ) : null}
            </Stack>
          </TabsContent>

          {manifest ? (
            <TabsContent value="dependencies" className={styles.tabPanel}>
              <Stack gap="5">
                <Stack gap="3">
                  <Text as="h3" variant="label" tone="subtle">
                    Registry dependencies
                  </Text>
                  {manifest.registryDependencies.length > 0 ? (
                    <ul className={styles.plainList}>
                      {manifest.registryDependencies.map((dependency) => (
                        <li key={dependency.id}>
                          <Stack direction="row" gap="2" align="center" wrap>
                            <Text as="span" variant="code" className={styles.code}>
                              {dependency.id}
                            </Text>
                            <Text as="span" variant="caption" tone="subtle">
                              {dependency.version}
                            </Text>
                            {dependency.optional ? (
                              <Badge variant="neutral" size="sm">
                                optional
                              </Badge>
                            ) : null}
                            {dependency.reason ? (
                              <Text as="span" variant="caption" tone="muted">
                                {dependency.reason}
                              </Text>
                            ) : null}
                          </Stack>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Text as="p" variant="caption" tone="muted">
                      No registry dependencies are declared in this manifest.
                    </Text>
                  )}
                </Stack>

                <Separator />

                <Stack gap="3">
                  <Text as="h3" variant="label" tone="subtle">
                    Package dependencies
                  </Text>
                  {manifest.packageDependencies.length > 0 ? (
                    <ul className={styles.plainList}>
                      {manifest.packageDependencies.map((dependency) => (
                        <li key={`${dependency.name}-${dependency.kind}`}>
                          <Stack direction="row" gap="2" align="center" wrap>
                            <Text as="span" variant="code" className={styles.code}>
                              {dependency.name}
                            </Text>
                            <Text as="span" variant="caption" tone="subtle">
                              {dependency.version}
                            </Text>
                            <Badge variant="neutral" size="sm">
                              {dependency.kind}
                            </Badge>
                          </Stack>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Text as="p" variant="caption" tone="muted">
                      No package dependencies are declared in this manifest.
                    </Text>
                  )}
                </Stack>
              </Stack>
            </TabsContent>
          ) : null}

          {manifest ? (
            <TabsContent value="installation" className={styles.tabPanel}>
              <Stack gap="5">
                {manifest.installation.length > 0 ? (
                  manifest.installation.map((mode) => (
                    <Stack gap="3" key={mode.mode}>
                      <Stack direction="row" gap="2" align="center">
                        <Badge variant="neutral" size="sm">
                          {mode.mode}
                        </Badge>
                        {mode.packageName ? (
                          <Text as="span" variant="code" className={styles.code}>
                            {mode.packageName}
                          </Text>
                        ) : null}
                      </Stack>
                      {mode.files.length > 0 ? (
                        <ul className={styles.plainList}>
                          {mode.files.map((file) => (
                            <li
                              key={`${file.source}-${file.target}`}
                              className={styles.fileMapping}
                            >
                              <Text as="span" variant="code" className={styles.code}>
                                {file.source}
                              </Text>
                              <Text as="span" variant="caption" tone="subtle" aria-hidden="true">
                                →
                              </Text>
                              <Text as="span" variant="code" className={styles.code}>
                                {file.target}
                              </Text>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <Text as="p" variant="caption" tone="muted">
                          This mode installs by package name without file mappings.
                        </Text>
                      )}
                    </Stack>
                  ))
                ) : (
                  <Text as="p" variant="caption" tone="muted">
                    No installation modes are declared in this manifest.
                  </Text>
                )}
              </Stack>
            </TabsContent>
          ) : null}
        </Tabs>

        <DialogFooter className={styles.footer}>
          <Text as="span" variant="caption" tone="subtle">
            {manifest ? 'Versioned asset manifest' : 'Registry index summary'}
          </Text>
          <DialogClose asChild>
            <Button variant="secondary" size="sm">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
