import type { Metadata } from 'next';
import { ContactForm } from '@/components/contact-form';
import { PageHero } from '@/components/page-hero';
import { COMPANY_EMAIL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Start a project',
  description: 'Tell JBIS about the website, application, automation, integration, or product milestone you want to build.',
  alternates: { canonical: '/contact' },
};

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

export default function ContactPage() {
  return (
    <main id="main-content">
      <PageHero
        eyebrow="Project inquiry"
        title="What would you like to put into the world?"
        intro="Share the need, the outcome, and what you already know. We’ll use that context to understand whether JBIS is a practical fit for the next milestone."
      />
      <section className="section contact-section">
        <div className="shell contact-grid">
          <aside className="contact-aside">
            <p className="eyebrow">A useful starting point</p>
            <h2>You do not need a finished specification.</h2>
            <p>Describe the problem, who it affects, and what a useful first result would make possible. Rough timing and budget context help shape an honest recommendation.</p>
            <div className="contact-direct">
              <span>Prefer email?</span>
              <a href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>
            </div>
          </aside>
          <ContactForm turnstileSiteKey={turnstileSiteKey} />
        </div>
      </section>
    </main>
  );
}
