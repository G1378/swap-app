/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  experimental: {
    // Carried over from the old next.config.js (Next.js only allows one
    // config file — having both next.config.js and next.config.mjs is a
    // hard build error). Currently a no-op since nothing in the app uses
    // Server Actions yet, kept here so it's ready if that changes.
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
};

export default nextConfig;
