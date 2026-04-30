/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  output: process.env.NEXT_OUTPUT_MODE ?? "standalone",
  experimental: {
    typedRoutes: true
  },
  async rewrites() {
    const target = process.env.DASHBOARD_API_PROXY_TARGET ?? "http://127.0.0.1:8000";

    return [
      {
        source: "/api/backend/:path*",
        destination: `${target}/:path*`
      }
    ];
  }
};

export default nextConfig;
