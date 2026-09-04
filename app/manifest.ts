import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'JBIS — Judith Basin Innovative Solutions',
    short_name: 'JBIS',
    description: 'Montana-based software contracting for founders and small businesses.',
    start_url: '/',
    display: 'standalone',
    background_color: '#07131d',
    theme_color: '#07131d',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
