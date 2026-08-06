import type { NextConfig } from "next";

// Backend origin the /backend/api/** rewrite proxies to (apps/backend, not this app).
const backendBaseUrl = process.env.BACKEND_BASE_URL ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/backend/api/:path*",
        destination: `${backendBaseUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
