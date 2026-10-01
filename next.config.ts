import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // Slip photos are compressed client-side to <=1600px WebP, well under this.
    serverActions: { bodySizeLimit: '4mb' },
  },
};

export default nextConfig;
