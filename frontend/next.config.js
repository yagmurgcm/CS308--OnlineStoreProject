/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL ?? "http://localhost:3001";

    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // 🔥 KRAL HAREKET: Tüm HTTPS sitelerine izin ver
      },
      {
        protocol: "http",
        hostname: "**", // Tüm HTTP sitelerine izin ver
      },
    ],
  },
};

module.exports = nextConfig;