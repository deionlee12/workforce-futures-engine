import Link from 'next/link';

const quickSteps = [
  'Pick scenario',
  'Preview Impact',
  'Tune Decision Priorities',
  'Apply sequencing + export brief',
];

const useCases = [
  {
    title: 'Convert contractors across ES + DE',
    whatYouSee:
      'Classification and conversion pathways by country, modeled labor exposure, and budget movement.',
    decision:
      'Whether to convert now, stage by cohort, or hold based on risk and workforce friction.',
    outcome:
      'A sequenced conversion plan with executive-ready tradeoffs and a clear first move.',
  },
  {
    title: 'Relocate team US → UK',
    whatYouSee:
      'Mobility timing constraints, role continuity pressure, and projected compensation deltas.',
    decision:
      'How to phase relocation while balancing retention, cost profile, and execution feasibility.',
    outcome:
      'A relocation sequence with policy assumptions, owner actions, and brief-ready rationale.',
  },
];

const integrationTiles = [
  { name: 'Workday', status: 'Preview' },
  { name: 'BambooHR', status: 'Planned' },
  { name: 'Greenhouse', status: 'Planned' },
  { name: 'SAP SuccessFactors', status: 'Preview' },
  { name: 'Slack', status: 'Preview' },
  { name: 'CSV/API', status: 'Preview' },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.15),_transparent_45%),radial-gradient(circle_at_85%_20%,_rgba(59,130,246,0.12),_transparent_35%)]" />
      <div className="mx-auto max-w-7xl px-6 pb-16 pt-8 sm:px-8 lg:px-10">
        <header className="rounded-2xl border border-slate-800/90 bg-slate-900/70 px-5 py-4 backdrop-blur sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <p className="text-base font-semibold tracking-tight text-slate-50 sm:text-lg">
                Workforce Decision Layer
              </p>
              <span className="rounded-full border border-sky-400/40 bg-sky-400/10 px-2.5 py-1 text-xs font-medium text-sky-200">
                Demo Preview
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <nav aria-label="Page sections" className="flex flex-wrap items-center gap-2">
                {[
                  { href: '#overview', label: 'Overview' },
                  { href: '#how-it-works', label: 'How it works' },
                  { href: '#use-cases', label: 'Use cases' },
                  { href: '#integrations', label: 'Integrations' },
                ].map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="rounded-md border border-slate-700/70 px-3 py-1.5 text-sm text-slate-200 transition hover:border-slate-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
              <Link
                href="/white-rabbit"
                className="rounded-md border border-slate-700/70 px-3 py-1.5 text-sm text-slate-200 transition hover:border-slate-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                White Rabbit Entry
              </Link>
              <Link
                href="/deel"
                className="rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
              >
                Enter Decision Layer
              </Link>
            </div>
          </div>
        </header>

        <section id="overview" className="pt-12 sm:pt-16">
          <div className="max-w-4xl">
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Model workforce change before you commit.
            </h1>
            <p className="mt-5 max-w-3xl text-lg text-slate-300">
              Turn workforce actions into quantified risk, cost, and sequencing decisions that leadership can align on quickly.
            </p>
          </div>
          <ul className="mt-8 grid gap-3 text-sm text-slate-200 sm:grid-cols-3 sm:text-base">
            <li className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
              Scenario simulation across location, employment model, and timing
            </li>
            <li className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
              Modeled exposure and execution friction for each option
            </li>
            <li className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
              Apply sequencing logic and generate an executive brief
            </li>
          </ul>
        </section>

        <section id="how-it-works" className="pt-14 sm:pt-18">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">How to use in 90 seconds</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickSteps.map((step, index) => (
              <article
                key={step}
                className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-5"
              >
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-300/90">
                  Step {index + 1}
                </p>
                <h3 className="mt-2 text-base font-semibold text-slate-100">{step}</h3>
              </article>
            ))}
          </div>
        </section>

        <section id="use-cases" className="pt-14 sm:pt-18">
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Two guided demo use cases
          </h2>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {useCases.map((card) => (
              <article
                key={card.title}
                className="flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900/65 p-5"
              >
                <h3 className="text-xl font-semibold text-white">{card.title}</h3>
                <dl className="mt-4 space-y-4 text-sm text-slate-300">
                  <div>
                    <dt className="font-medium text-slate-100">What you&apos;ll see</dt>
                    <dd className="mt-1">{card.whatYouSee}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-100">What decision you&apos;ll make</dt>
                    <dd className="mt-1">{card.decision}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-100">Expected outcome</dt>
                    <dd className="mt-1">{card.outcome}</dd>
                  </div>
                </dl>
                <div className="mt-6">
                  <Link
                    href="/deel"
                    className="inline-flex items-center rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                  >
                    Open in demo
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="pt-14 sm:pt-18" aria-label="Scope">
          <div className="grid gap-5 lg:grid-cols-2">
            <article className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
              <h2 className="text-xl font-semibold text-white">What this evaluates</h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-200">
                {[
                  'Cross-market workforce risk exposure before action is taken',
                  'Cost movement and tradeoffs across strategy options',
                  'Execution sequencing to reduce disruption and avoid bottlenecks',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span aria-hidden="true" className="mt-0.5 text-emerald-300">
                      ✓
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
            <article className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5">
              <h2 className="text-xl font-semibold text-white">What it does not</h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-200">
                {[
                  'Replace legal counsel or local compliance review',
                  'Execute payroll, immigration filings, or HR operations directly',
                  'Guarantee outcomes without stakeholder and policy inputs',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span aria-hidden="true" className="mt-0.5 text-rose-300">
                      ✕
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section id="integrations" className="pt-14 sm:pt-18">
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Integrations (preview)
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {integrationTiles.map((tile) => (
              <article
                key={tile.name}
                className="rounded-xl border border-slate-800 bg-slate-900/65 px-4 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-slate-100">{tile.name}</h3>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      tile.status === 'Preview'
                        ? 'border border-sky-400/40 bg-sky-400/10 text-sky-200'
                        : 'border border-slate-600 bg-slate-800 text-slate-200'
                    }`}
                  >
                    {tile.status}
                  </span>
                </div>
              </article>
            ))}
          </div>
          <p className="mt-4 text-sm text-slate-400">Connectors shown for narrative only.</p>
        </section>

        <footer className="mt-16 rounded-2xl border border-slate-800 bg-slate-900/65 px-5 py-6 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-200">
              Questions or want a walkthrough? <span className="text-slate-400">contact@company.com</span>
            </p>
            <Link
              href="/deel"
              className="inline-flex w-fit items-center rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              Enter Decision Layer
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
