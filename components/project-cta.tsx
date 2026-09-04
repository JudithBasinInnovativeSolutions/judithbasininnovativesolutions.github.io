import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function ProjectCta({ heading = 'What should we help you put into motion?' }: { heading?: string }) {
  return (
    <section className="section closing-cta">
      <div className="shell cta-panel grid-field">
        <p className="eyebrow">Start with the next milestone</p>
        <h2>{heading}</h2>
        <Link className="button" href="/contact">Start a project inquiry <ArrowRight aria-hidden="true" size={18} /></Link>
      </div>
    </section>
  );
}
