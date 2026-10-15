import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Don't let `next dev` append its agent-rules block to CLAUDE.md / AGENTS.md.
  agentRules: false,
  experimental: {
    // Slip photos are compressed client-side to <=1600px WebP, well under this.
    serverActions: { bodySizeLimit: '4mb' },
  },
};

export default nextConfig;
