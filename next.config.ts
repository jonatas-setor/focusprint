import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Optimize for Vercel deployment
  serverExternalPackages: ["@supabase/supabase-js"],
  // Ensure proper handling of environment variables
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      "https://tuyeqoudkeufkxtkupuh.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1eWVxb3Vka2V1Zmt4dGt1cHVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NjU2MzQsImV4cCI6MjA2MzU0MTYzNH0.0I9YIT1iTmE4Zwl-Dtptnn5LzE7I4GBYAKsLNSLjUYQ",
  },
  // Optimize for production
  poweredByHeader: false,
  reactStrictMode: true,
  // Disable development indicators
  devIndicators: {
    buildActivity: false,
    buildActivityPosition: "bottom-right",
  },
};

export default nextConfig;
