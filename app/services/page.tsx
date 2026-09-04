import type { Metadata } from 'next';
import { PageHero } from '@/components/page-hero';
import { ProjectCta } from '@/components/project-cta';
import { services } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Software contracting services',
  description: 'Custom applications, websites, mobile products, integrations, automation, and rapid product development from JBIS.',
  alternates: { canonical: '/services' },
};

const serviceDetails = [
  ['Custom applications', 'Turn a business process, product idea, or operational need into software designed for the people who will use it.', ['Workflow tools', 'Customer-facing products', 'Internal applications']],
  ['Websites and web platforms', 'Build a credible public presence or a capable web product with accessibility, performance, and maintainability built in.', ['Company and product sites', 'Interactive web platforms', 'Modernization and rebuilds']],
  ['Mobile and cross-platform applications', 'Reach users on the devices that matter with a focused experience and a practical path across platforms.', ['Mobile-first products', 'Cross-platform delivery', 'Connected web and mobile experiences']],
  ['Automation and integrations', 'Connect tools, services, and data so routine work moves with fewer handoffs and less repetition.', ['API integrations', 'Business-process automation', 'Data and service connections']],
  ['Rapid prototypes and product development', 'Move from an uncertain idea to something testable, then turn what you learn into a production-minded release.', ['Proofs of concept', 'First product releases', 'Iterative product development']],
] as const;

export default function ServicesPage() {
  return (
    <main id="main-content">
      <PageHero
        eyebrow="Services"
        title="Build what moves the business forward."
        intro="JBIS takes on focused software work—from a clear first release to continued development—so you can make progress without carrying unnecessary scope."
      />

      <section className="section detail-section">
        <div className="shell service-detail-list">
          {serviceDetails.map(([title, description, examples], index) => (
            <article className="service-detail" key={title}>
              <span className="service-number">{services[index].number}</span>
              <div>
                <h2>{title}</h2>
                <p>{description}</p>
              </div>
              <ul>
                {examples.map((example) => <li key={example}>{example}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="section engagement-section">
        <div className="shell engagement-grid">
          <div>
            <p className="eyebrow">How engagements work</p>
            <h2>A useful first release. A clear way forward.</h2>
          </div>
          <div className="engagement-steps">
            <article><span>01</span><h3>Choose the milestone</h3><p>We define a focused first outcome with clear boundaries and decisions.</p></article>
            <article><span>02</span><h3>Deliver the working release</h3><p>We design, build, test, and prepare the agreed milestone for real use.</p></article>
            <article><span>03</span><h3>Continue where it helps</h3><p>Add maintenance, support, or another development phase when there is a reason to keep going.</p></article>
          </div>
        </div>
      </section>

      <ProjectCta heading="Bring the next website, application, or digital tool into focus." />
    </main>
  );
}
