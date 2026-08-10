import type { NextConfig } from "next";
import { envConfig } from "./src/config/env.config";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/backend/api/:path*",
        destination: `${envConfig.PUBLICATOR.BASE_URL}/backend/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
