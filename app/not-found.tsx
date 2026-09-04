import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <main id="main-content" className="not-found grid-field">
      <div className="shell not-found-grid">
        <div className="error-code" aria-hidden="true">404</div>
        <div>
          <p className="eyebrow">Off the mapped route</p>
          <h1>This page isn’t here.</h1>
          <p>The address may have changed, or the route may never have existed. The main site is still close by.</p>
          <Link className="button" href="/"><ArrowLeft aria-hidden="true" size={18} /> Return home</Link>
        </div>
      </div>
    </main>
  );
}
