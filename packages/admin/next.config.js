/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: "/admin",
  distDir: "admin-out",
  trailingSlash: true,
  images: { 
    unoptimized: true 
  }
};

export default nextConfig;
