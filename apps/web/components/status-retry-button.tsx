'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { Button } from '@simplify-dev/ui';

/** Re-fetch the server-rendered status subtree while keeping focus on the control. */
export function StatusRetryButton({ label }: { readonly label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      aria-busy={pending || undefined}
      onClick={() => {
        if (!pending) {
          startTransition(() => router.refresh());
        }
      }}
    >
      {pending ? 'Refreshing…' : label}
    </Button>
  );
}
