import { Suspense } from 'react';

import { CatalogSkeleton } from '../components/catalog-skeleton';
import { RegistryContent } from '../components/registry-content';

export default function HomePage() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Suspense fallback={<CatalogSkeleton />}>
        <RegistryContent />
      </Suspense>
    </>
  );
}
