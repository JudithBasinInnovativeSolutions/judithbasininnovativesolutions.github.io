import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return ['', '/services', '/about', '/contact', '/privacy'].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date('2026-09-04T00:00:00.000Z'),
    changeFrequency: path === '' ? 'monthly' as const : 'yearly' as const,
    priority: path === '' ? 1 : path === '/contact' ? 0.9 : 0.7,
  }));
}
