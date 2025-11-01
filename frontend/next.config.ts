import type { NextConfig } from "next";

// Proxy frontend /api/* isteklerini backend'e yönlendirir.
// BACKEND_URL env değişkeni tanımlı değilse 4000'e düşer.
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
