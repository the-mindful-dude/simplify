'use client';

import { useMemo, useState } from 'react';

import {
  AutoGrid,
  Badge,
  Button,
  Container,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  InputField,
  Separator,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@simplify-dev/ui';

import { CATEGORY_LABELS, CATEGORY_ORDER, SORT_LABELS, filterAndSortAssets } from '../lib/catalog';
import type {
  AssetCategory,
  AssetFilters,
  RegistryAssetView,
  RegistrySnapshot,
  SortKey,
} from '../lib/types';
import styles from '../styles/browser.module.css';
import { AssetCard } from './asset-card';
import { AssetDetail } from './asset-detail';
import { LibrarySection } from './library-section';

interface RegistryBrowserProps {
  readonly snapshot: RegistrySnapshot;
}

const DEFAULT_FILTERS: AssetFilters = {
  query: '',
  category: 'all',
  libraryId: 'all',
  sort: 'name',
};

function isCategoryFilter(value: string): value is AssetCategory | 'all' {
  return value === 'all' || CATEGORY_ORDER.some((category) => category === value);
}

function isSortKey(value: string): value is SortKey {
  return value === 'name' || value === 'category' || value === 'version';
}

function SearchIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m16.5 16.5 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Client-side search, category/library filters, sorting and detail inspection. */
export function RegistryBrowser({ snapshot }: RegistryBrowserProps) {
  const [filters, setFilters] = useState<AssetFilters>(DEFAULT_FILTERS);
  const [selected, setSelected] = useState<RegistryAssetView | null>(null);

  const results = useMemo(
    () => filterAndSortAssets(snapshot.assets, filters),
    [snapshot.assets, filters],
  );

  const update = (patch: Partial<AssetFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
  };

  const hasFilters =
    filters.query.trim().length > 0 ||
    filters.category !== 'all' ||
    filters.libraryId !== 'all' ||
    filters.sort !== DEFAULT_FILTERS.sort;

  const activeLibrary = snapshot.libraries.find((library) => library.id === filters.libraryId);

  return (
    <section className={styles.section} id="browse" aria-labelledby="browse-title">
      <Container size="lg">
        <Stack gap="6">
          <div className={styles.sectionHead}>
            <Stack gap="2">
              <Badge variant="neutral" size="sm">
                Explore the index
              </Badge>
              <Text
                as="h2"
                variant="lead"
                weight="semibold"
                id="browse-title"
                className={styles.sectionTitle}
              >
                Asset registry
              </Text>
              <Text as="p" variant="body" tone="muted">
                Search and filter {snapshot.assets.length} real assets from the local registry
                source.
              </Text>
            </Stack>
            <div className={styles.resultCount}>
              <Badge variant={results.length === 0 ? 'warning' : 'success'} size="md" dot>
                {results.length} shown
              </Badge>
            </div>
          </div>

          <div className={styles.toolbar}>
            <InputField
              label="Search assets"
              placeholder="Search by name, id, category, or capability"
              value={filters.query}
              onChange={(event) => update({ query: event.target.value })}
              leading={<SearchIcon />}
              size="md"
              className={styles.search}
              slotProps={{ input: { type: 'search' } }}
            />

            <div className={styles.toolbarMenus}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="md" trailing={<ChevronIcon />}>
                    Sort: {SORT_LABELS[filters.sort]}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Sort assets</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={filters.sort}
                    onValueChange={(value) => {
                      if (isSortKey(value)) {
                        update({ sort: value });
                      }
                    }}
                  >
                    {(['name', 'category', 'version'] as const).map((key) => (
                      <DropdownMenuRadioItem key={key} value={key}>
                        {SORT_LABELS[key]}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="md" trailing={<ChevronIcon />}>
                    Library: {activeLibrary ? activeLibrary.id : 'all'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filter by library</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={filters.libraryId}
                    onValueChange={(value) => {
                      const exists = snapshot.libraries.some((library) => library.id === value);
                      update({ libraryId: exists || value === 'all' ? value : 'all' });
                    }}
                  >
                    <DropdownMenuRadioItem value="all">All libraries</DropdownMenuRadioItem>
                    {snapshot.libraries.map((library) => (
                      <DropdownMenuRadioItem key={library.id} value={library.id}>
                        {library.id}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {hasFilters ? (
            <div className={styles.activeFilters}>
              <Text as="span" variant="caption" tone="subtle">
                Active filters
              </Text>
              {filters.category !== 'all' ? (
                <Badge variant="neutral" size="sm">
                  {CATEGORY_LABELS[filters.category]}
                </Badge>
              ) : null}
              {activeLibrary ? (
                <Badge variant="neutral" size="sm">
                  {activeLibrary.id}
                </Badge>
              ) : null}
              {filters.query.trim() ? (
                <Badge variant="neutral" size="sm">
                  “{filters.query.trim()}”
                </Badge>
              ) : null}
              <Button variant="ghost" size="sm" onClick={() => setFilters(DEFAULT_FILTERS)}>
                Reset all
              </Button>
            </div>
          ) : null}

          <Tabs.Root
            value={filters.category}
            onValueChange={(value) => {
              if (isCategoryFilter(value)) {
                update({ category: value });
              }
            }}
            className={styles.tabs}
          >
            <TabsList aria-label="Filter assets by category" className={styles.tabList}>
              <TabsTrigger value="all" className={styles.tabTrigger}>
                All
                <span className={styles.tabCount}>{snapshot.assets.length}</span>
              </TabsTrigger>
              {snapshot.categoryCounts.map((entry) => (
                <TabsTrigger
                  key={entry.category}
                  value={entry.category}
                  className={styles.tabTrigger}
                >
                  {entry.label}
                  <span className={styles.tabCount}>{entry.count}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <Separator />

            <TabsContent value={filters.category} className={styles.tabPanel}>
              <AutoGrid
                columns={{ base: 1, md: 2, xl: 3 }}
                gap="5"
                emptyState={
                  <Stack gap="4" align="center" className={styles.empty}>
                    <Badge variant="neutral" size="sm">
                      Empty result
                    </Badge>
                    <Text as="h3" variant="body" weight="semibold">
                      No assets match these filters
                    </Text>
                    <Text as="p" variant="caption" tone="muted">
                      Try another term, category, or library selection.
                    </Text>
                    <Button variant="outline" size="sm" onClick={() => setFilters(DEFAULT_FILTERS)}>
                      Clear filters
                    </Button>
                  </Stack>
                }
              >
                {results.map((asset, index) => (
                  <AssetCard key={asset.id} asset={asset} index={index} onInspect={setSelected} />
                ))}
              </AutoGrid>
            </TabsContent>
          </Tabs.Root>
        </Stack>
      </Container>

      <LibrarySection
        libraries={snapshot.libraries}
        activeLibraryId={filters.libraryId}
        onSelect={(libraryId) => update({ libraryId })}
      />

      <AssetDetail
        asset={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
          }
        }}
      />
    </section>
  );
}
