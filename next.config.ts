import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['redis', 'ws'],
  env: {
    REDIS_URL: process.env.REDIS_URL || 'redis://192.168.5.210:6379'
  }
};

export default nextConfig;
