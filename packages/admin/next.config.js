/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: "/admin",
  distDir: "admin-out",
  images: { unoptimized: true },
  experimental: { externalDir: true },
  transpilePackages: ["@app/shared"],
};
export default nextConfig;
