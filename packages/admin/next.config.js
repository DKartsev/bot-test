/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: "/admin",
  distDir: "admin-out",
  images: { unoptimized: true },
};
export default nextConfig;
