/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow dev server access from network IP
  allowedDevOrigins: ["http://192.168.0.90:3000"],
  
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/**",
      },
    ],
  },
};

module.exports = nextConfig;