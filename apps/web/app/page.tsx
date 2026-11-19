import { Suspense } from 'react';

import { CatalogSkeleton } from '../components/catalog-skeleton';
import { DataError } from '../components/data-error';
import { Hero } from '../components/hero';
import { RegistryBrowser } from '../components/registry-browser';
import { SiteFooter } from '../components/site-footer';
import { SiteHeader } from '../components/site-header';
import { getRegistrySnapshot } from '../lib/registry-data';

export default async function HomePage() {
  let snapshot;
  try {
    snapshot = await getRegistrySnapshot();
  } catch (error) {
    return <DataError message={error instanceof Error ? error.message : String(error)} />;
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader
        assetCount={snapshot.assets.length}
        libraryCount={snapshot.libraries.length}
        schemaVersion={snapshot.schemaVersion}
      />
      <main id="main">
        <Hero snapshot={snapshot} />
        <Suspense fallback={<CatalogSkeleton />}>
          <RegistryBrowser snapshot={snapshot} />
        </Suspense>
      </main>
      <SiteFooter snapshot={snapshot} />
    </>
  );
}
