import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: path.join(currentDirectory, '../..'),
  },
  transpilePackages: [
    '@simplify-dev/blocks',
    '@simplify-dev/registry',
    '@simplify-dev/tokens',
    '@simplify-dev/ui',
  ],
};

export default nextConfig;
