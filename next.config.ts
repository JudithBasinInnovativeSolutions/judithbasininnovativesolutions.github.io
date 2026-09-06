import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return [{
      source: '/:path*',
      has: [{ type: 'host' as const, value: 'www\\.judithbasininnovativesolutions\\.com' }],
      destination: 'https://judithbasininnovativesolutions.com/:path*',
      permanent: true,
    }];
  },
};

export default nextConfig;
