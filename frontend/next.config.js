/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // 🔥 TÜM HTTPS KAYNAKLARINA İZİN
      },
    ],
  },
};

module.exports = nextConfig;
