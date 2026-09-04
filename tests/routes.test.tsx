import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import RootLayout, { metadata as rootMetadata } from '@/app/layout';
import HomePage from '@/app/page';
import ServicesPage, { metadata as servicesMetadata } from '@/app/services/page';
import AboutPage, { metadata as aboutMetadata } from '@/app/about/page';
import ContactPage, { metadata as contactMetadata } from '@/app/contact/page';
import PrivacyPage, { metadata as privacyMetadata } from '@/app/privacy/page';
import NotFound from '@/app/not-found';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';

const pages = [
  ['home', HomePage],
  ['services', ServicesPage],
  ['about', AboutPage],
  ['contact', ContactPage],
  ['privacy', PrivacyPage],
  ['404', NotFound],
] as const;

describe('site routes', () => {
  it.each(pages)('renders the %s route with the shared navigation and footer', (_name, Page) => {
    const markup = renderToStaticMarkup(createElement(RootLayout, null, createElement(Page)));
    expect(markup).toContain('Judith Basin Innovative Solutions');
    expect(markup).toContain('href="/services"');
    expect(markup).toContain('href="/about"');
    expect(markup).toContain('href="/contact"');
    expect(markup).toContain('href="/privacy"');
    expect(markup).toContain('<main');
  });

  it('defines page titles, descriptions, and canonical URLs', () => {
    const entries = [
      [rootMetadata, '/'],
      [servicesMetadata, '/services'],
      [aboutMetadata, '/about'],
      [contactMetadata, '/contact'],
      [privacyMetadata, '/privacy'],
    ] as const;
    for (const [metadata, canonical] of entries) {
      expect(metadata.title).toBeTruthy();
      expect(metadata.description).toBeTruthy();
      expect(metadata.alternates?.canonical).toBe(canonical);
    }
    expect(rootMetadata.openGraph).toBeUndefined();
  });

  it('publishes robots and sitemap records for every public route', () => {
    const robotsResult = robots();
    expect(robotsResult.sitemap).toBe('https://judithbasininnovativesolutions.com/sitemap.xml');
    expect(sitemap().map((entry) => entry.url)).toEqual([
      'https://judithbasininnovativesolutions.com',
      'https://judithbasininnovativesolutions.com/services',
      'https://judithbasininnovativesolutions.com/about',
      'https://judithbasininnovativesolutions.com/contact',
      'https://judithbasininnovativesolutions.com/privacy',
    ]);
  });

  it('includes Organization JSON-LD and every optimized logo asset', () => {
    const markup = renderToStaticMarkup(createElement(RootLayout, null, createElement(HomePage)));
    expect(markup).toContain('application/ld+json');
    expect(markup).toContain('https://schema.org');
    expect(markup).toContain('Organization');
    for (const asset of ['jbis-logo-256.webp', 'jbis-logo-512.webp', 'jbis-logo-512.png', 'favicon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png']) {
      expect(existsSync(resolve('public/brand', asset))).toBe(true);
    }
    expect(existsSync(resolve('JBIS Logo.png'))).toBe(true);
  });

  it('keeps forbidden internal names and unsupported customer claims out of public source', () => {
    const publicFiles = [
      'app/page.tsx',
      'app/services/page.tsx',
      'app/about/page.tsx',
      'app/contact/page.tsx',
      'app/privacy/page.tsx',
      'components/site-footer.tsx',
      'lib/site.ts',
    ];
    const source = publicFiles.map((file) => readFileSync(resolve(file), 'utf8')).join('\n').toLowerCase();
    for (const forbidden of ['stock stop', 'fractured peace', 'our clients', 'trusted by', 'customer stories', 'inc.']) {
      expect(source).not.toContain(forbidden);
    }
  });

  it('uses local responsive landscape photos with source credits on About instead of a repeated logo', () => {
    const markup = renderToStaticMarkup(createElement(AboutPage));
    expect(markup).not.toContain('/brand/jbis-logo');
    expect(markup).toContain('creativecommons.org/licenses/by/2.0/');
    expect(markup).toContain('Ann Boucher / BLM');
    expect(markup).toContain('Resized and cropped.');
    for (const name of ['square-butte', 'judith-river', 'judith-peak']) {
      for (const width of [480, 960, 1440]) {
        const asset = `/landscapes/${name}-${width}.webp`;
        expect(markup).toContain(asset);
        const bytes = readFileSync(resolve('public', asset.slice(1)));
        expect(new TextDecoder().decode(bytes.subarray(8, 12))).toBe('WEBP');
      }
    }
    expect((markup.match(/loading="lazy"/g) || []).length).toBe(3);
  });
});
