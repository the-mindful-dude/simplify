/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@simplify-dev/blocks',
    '@simplify-dev/registry',
    '@simplify-dev/tokens',
    '@simplify-dev/ui',
  ],
};

export default nextConfig;
