import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/homework',
        destination: '/assignments',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
