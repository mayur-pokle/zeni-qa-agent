import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  // The frontend rewrite pattern `/api/projects/:path*` expands to
  // `${backend}/api/projects/` when `:path*` is empty, which would
  // otherwise 308-redirect to `/api/projects` and loop back through
  // the Vercel rewrite. Accept both forms instead.
  skipTrailingSlashRedirect: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb"
    }
  }
};

export default nextConfig;
