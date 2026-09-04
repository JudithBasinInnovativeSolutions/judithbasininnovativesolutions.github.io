import type { Metadata } from 'next';
import { PageHero } from '@/components/page-hero';
import { COMPANY_EMAIL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'How JBIS handles information submitted through its project inquiry form.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <main id="main-content">
      <PageHero
        eyebrow="Privacy"
        title="A short, plain-language privacy notice."
        intro="This site collects only the information needed to receive and evaluate project inquiries. It uses no advertising analytics and sets no marketing cookies."
      />
      <article className="section legal-copy shell">
        <section>
          <h2>Information you submit</h2>
          <p>The project inquiry form collects your name, email address, optional organization, project type, project summary, timeline, and optional budget range. Technical request information used for security may also be processed.</p>
        </section>
        <section>
          <h2>How it is used</h2>
          <p>JBIS uses this information to review your request, communicate with you, evaluate whether an engagement is a fit, and protect the form from abuse. Submitting the form does not enroll you in a newsletter or marketing list.</p>
        </section>
        <section>
          <h2>Service providers</h2>
          <p>Inquiry details are delivered by Resend, an email delivery provider. Cloudflare Turnstile processes verification data to determine whether a submission appears legitimate. These providers process information under their own service terms and privacy commitments.</p>
        </section>
        <section>
          <h2>Retention</h2>
          <p>Inquiry information is kept only as long as reasonably needed to evaluate and respond to the request, maintain related business records, address security concerns, and meet legal obligations. JBIS does not maintain a separate inquiry database through this site.</p>
        </section>
        <section>
          <h2>Questions</h2>
          <p>For a privacy question or a request about information you submitted, email <a href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>.</p>
        </section>
        <p className="legal-updated">Last updated September 4, 2026.</p>
      </article>
    </main>
  );
}
