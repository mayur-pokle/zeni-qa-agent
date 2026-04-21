import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  async rewrites() {
    const backendApiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || process.env.BACKEND_API_URL;

    if (!backendApiUrl) {
      return [];
    }

    return [
      { source: "/api/projects/:path*", destination: `${backendApiUrl}/api/projects/:path*` },
      { source: "/api/qa/:path*", destination: `${backendApiUrl}/api/qa/:path*` },
      { source: "/api/reports/:path*", destination: `${backendApiUrl}/api/reports/:path*` },
      { source: "/api/settings/:path*", destination: `${backendApiUrl}/api/settings/:path*` },
      { source: "/api/monitoring/:path*", destination: `${backendApiUrl}/api/monitoring/:path*` },
      { source: "/api/lighthouse-reports/:path*", destination: `${backendApiUrl}/api/lighthouse-reports/:path*` }
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb"
    }
  }
};

export default nextConfig;
