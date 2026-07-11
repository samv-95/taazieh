/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

if (process.env.NODE_ENV === "development") {
  // موقع توسعه اصلاً به next-pwa نیازی نیست (خودتون هم disable کرده بودینش)
  module.exports = nextConfig;
} else {
  const withPWA = require("next-pwa")({
    dest: "public",
    register: true,
    skipWaiting: true,
    disable: false,
  });
  module.exports = withPWA(nextConfig);
}