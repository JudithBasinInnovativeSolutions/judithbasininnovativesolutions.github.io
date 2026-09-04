import type { Metadata } from 'next';
import { Check, MapPin } from 'lucide-react';
import { PageHero } from '@/components/page-hero';
import { ProjectCta } from '@/components/project-cta';

export const metadata: Metadata = {
  title: 'About',
  description: 'JBIS is a Montana-based software contractor focused on direct collaboration, practical engineering, and production-minded delivery.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <main id="main-content">
      <PageHero
        eyebrow="About JBIS"
        title="Montana roots. Practical software delivery."
        intro="Judith Basin Innovative Solutions helps founders and small businesses move from a defined need to working software through direct collaboration and disciplined execution."
      />

      <section className="section about-story">
        <div className="shell about-grid">
          <div className="about-mark grid-field">
            <img src="/brand/jbis-logo-512.webp" alt="JBIS bucking horse and circuit landscape logo" width="512" height="534" />
            <p><MapPin aria-hidden="true" size={18} /> Built in Montana.<br />Ready to work remotely.</p>
          </div>
          <div className="prose-column">
            <p className="eyebrow">Why JBIS</p>
            <h2>Technology should create movement, not another layer of friction.</h2>
            <p>That means staying close to the real problem, making tradeoffs visible, and keeping each release small enough to understand but complete enough to use.</p>
            <p>JBIS combines speed with production-minded habits: accessible interfaces, maintainable code, secure handling of data, and a delivery path designed for what happens after the first launch.</p>
          </div>
        </div>
      </section>

      <section className="section principles-section">
        <div className="shell">
          <div className="section-heading split-heading">
            <div><p className="eyebrow">Working principles</p><h2>Clarity at every handoff.</h2></div>
            <p>Good contracting work should leave you with more than code. It should leave you with a useful product and a clear understanding of what comes next.</p>
          </div>
          <div className="principle-grid">
            <article><Check aria-hidden="true" /><h3>Direct collaboration</h3><p>Talk through decisions with the people doing the work and keep feedback close to the build.</p></article>
            <article><Check aria-hidden="true" /><h3>Practical engineering</h3><p>Use the simplest sound approach that fits the problem, the users, and the expected life of the product.</p></article>
            <article><Check aria-hidden="true" /><h3>Production-minded delivery</h3><p>Account for accessibility, reliability, security, and maintainability before a release reaches real users.</p></article>
          </div>
        </div>
      </section>

      <ProjectCta heading="Turn a defined need into a working next step." />
    </main>
  );
}
