/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  experimental: { externalDir: true },
  transpilePackages: ['@app/shared']
};
export default nextConfig;
