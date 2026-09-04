import Link from 'next/link';
import { COMPANY_EMAIL } from '@/lib/site';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div>
          <p className="footer-mark">JBIS</p>
          <p className="footer-note">Montana-built software, delivered wherever you work.</p>
        </div>
        <div>
          <p className="eyebrow">Get in touch</p>
          <a className="footer-email" href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/services">Services</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/privacy">Privacy</Link>
        </nav>
      </div>
      <div className="shell footer-bottom">
        <span>© {new Date().getFullYear()} Judith Basin Innovative Solutions</span>
        <span>Montana · Remote across the United States</span>
      </div>
    </footer>
  );
}
