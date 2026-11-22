import { RegistryDataError, getRegistrySnapshot } from '../lib/registry-data';
import { buildStatusViews } from '../lib/status-data';
import type { RegistryDataErrorCode } from '../lib/types';
import { DataError } from './data-error';
import { Hero } from './hero';
import { RegistryBrowser } from './registry-browser';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';
import { StatusSection } from './status-section';

/** Async server subtree: every section that depends on the local registry source. */
export async function RegistryContent() {
  let snapshot;
  try {
    snapshot = await getRegistrySnapshot();
  } catch (error) {
    const code: RegistryDataErrorCode | 'unknown' =
      error instanceof RegistryDataError ? error.code : 'unknown';
    return <DataError code={code} />;
  }

  return (
    <>
      <SiteHeader
        assetCount={snapshot.assets.length}
        libraryCount={snapshot.libraries.length}
        schemaVersion={snapshot.schemaVersion}
      />
      <main id="main">
        <Hero snapshot={snapshot} />
        <StatusSection views={buildStatusViews(snapshot)} />
        <RegistryBrowser snapshot={snapshot} />
      </main>
      <SiteFooter snapshot={snapshot} />
    </>
  );
}
