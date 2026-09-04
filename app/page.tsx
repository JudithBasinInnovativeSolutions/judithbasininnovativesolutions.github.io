import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';
import { services } from '@/lib/site';

export default function HomePage() {
  return (
    <main id="main-content">
      <section className="hero grid-field">
        <div className="shell hero-grid">
          <div className="hero-copy">
            <p className="eyebrow"><MapPin aria-hidden="true" size={15} /> Montana based · Remote capable</p>
            <h1>From idea to<br /><span>working software—fast.</span></h1>
            <p className="hero-lede">
              JBIS helps founders and small businesses turn clear priorities into dependable websites,
              applications, and digital tools—without losing momentum to unnecessary complexity.
            </p>
            <div className="hero-actions">
              <Link className="button" href="/contact">Tell us what you’re building <ArrowRight aria-hidden="true" size={18} /></Link>
              <Link className="text-link" href="/services">Explore services <span aria-hidden="true">→</span></Link>
            </div>
          </div>

          <div className="hero-mark" aria-label="Judith Basin Innovative Solutions">
            <div className="logo-frame">
              <img src="/brand/jbis-logo-512.webp" alt="JBIS bucking horse and circuit landscape logo" width="512" height="534" />
            </div>
            <div className="signal-card">
              <span>Approach</span>
              <strong>Small releases.<br />Useful progress.</strong>
            </div>
          </div>
        </div>
        <div className="shell hero-footnote">
          <span>Web</span><span>Applications</span><span>Mobile</span><span>Integrations</span><span>Product development</span>
        </div>
      </section>

      <section className="section services-intro">
        <div className="shell">
          <div className="section-heading split-heading">
            <div>
              <p className="eyebrow">What we build</p>
              <h2>Useful software, sized to the next real milestone.</h2>
            </div>
            <p>
              Start with the release that creates value now. Once it is working, keep improving it through
              continued development or an optional maintenance arrangement.
            </p>
          </div>
          <div className="service-list">
            {services.map((service) => (
              <article className="service-row" key={service.title}>
                <span className="service-number">{service.number}</span>
                <h3>{service.title}</h3>
                <p>{service.summary}</p>
                <span className="service-arrow" aria-hidden="true">↗</span>
              </article>
            ))}
          </div>
          <Link className="text-link section-link" href="/services">See how we can help <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <section className="section rapid-section">
        <div className="shell rapid-grid">
          <div>
            <p className="eyebrow">Rapid, not rushed</p>
            <h2>Move quickly without building on shortcuts.</h2>
          </div>
          <ol className="milestone-list">
            <li><span>01</span><div><h3>Define the release</h3><p>Align on the outcome, the essential scope, and what success looks like.</p></div></li>
            <li><span>02</span><div><h3>Build in view</h3><p>Work in small, reviewable increments so decisions happen while they still matter.</p></div></li>
            <li><span>03</span><div><h3>Launch and continue</h3><p>Deliver a production-minded milestone, then support, maintain, or extend it as needed.</p></div></li>
          </ol>
        </div>
      </section>

      <section className="section closing-cta">
        <div className="shell cta-panel grid-field">
          <p className="eyebrow">Have a project in mind?</p>
          <h2>Let’s find the fastest responsible path to a working first release.</h2>
          <Link className="button" href="/contact">Start a project inquiry <ArrowRight aria-hidden="true" size={18} /></Link>
        </div>
      </section>
    </main>
  );
}
