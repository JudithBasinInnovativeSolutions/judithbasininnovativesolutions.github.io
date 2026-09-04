import Link from 'next/link';

const navigation = [
  { href: '/services', label: 'Services' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
] as const;

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="brand" href="/" aria-label="JBIS home">
          <img src="/brand/jbis-logo-256.webp" alt="" width="50" height="52" />
          <span className="brand-copy">
            <strong>JBIS</strong>
            <span>Judith Basin Innovative Solutions</span>
          </span>
        </Link>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {navigation.map((item) => (
            <Link href={item.href} key={item.href}>{item.label}</Link>
          ))}
          <Link className="button button-small" href="/contact">Start a project</Link>
        </nav>

        <details className="mobile-nav">
          <summary>Menu</summary>
          <nav aria-label="Mobile navigation">
            {navigation.map((item) => (
              <Link href={item.href} key={item.href}>{item.label}</Link>
            ))}
            <Link href="/contact">Start a project</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
