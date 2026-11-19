import { tokenCss } from '@simplify-dev/tokens';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import '../styles/globals.css';

export const metadata: Metadata = {
  title: {
    default: 'simplify.dev — Registry',
    template: '%s · simplify.dev',
  },
  description:
    'Discover, install, customize, and connect reusable software building blocks from the simplify.dev registry.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-sd-theme="dark">
      <head>
        <style>{tokenCss}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
