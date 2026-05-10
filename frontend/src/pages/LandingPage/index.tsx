import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Clock3,
  Compass,
  MapPinned,
  ScanSearch,
  Sprout,
  SunMedium,
  Trees,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
  note: string;
};

type UseCase = {
  title: string;
  titleEn: string;
  description: string;
  path: string;
  accent: string;
};

const METRICS = [
  { value: '48', label: 'time steps per day' },
  { value: '3D', label: 'building view modes' },
  { value: '24/7', label: 'site checks for any hour' },
];

const FEATURES: Feature[] = [
  {
    icon: Clock3,
    title: 'Minute-level light control',
    description: 'Shift the clock and watch shadows move across façades, courtyards, and work zones in real time.',
    note: 'Live shadow playback',
  },
  {
    icon: Building2,
    title: 'Readable urban geometry',
    description: 'Inspect building massing in 2D or 3D without leaving the map or switching tools.',
    note: '2D and 3D in one view',
  },
  {
    icon: ScanSearch,
    title: 'Decision-ready analysis',
    description: 'Move from a quick location search to sun exposure checks, building context, and side recommendations.',
    note: 'Search, inspect, decide',
  },
];

const WORKFLOW = [
  {
    number: '01',
    title: 'Search a place',
    description: 'Find an address, ЖК, or site in Astana and jump directly into the working area.',
  },
  {
    number: '02',
    title: 'Set the date and hour',
    description: 'Move between seasons and evaluate how sunlight changes through the day.',
  },
  {
    number: '03',
    title: 'Choose with evidence',
    description: 'Check sun, shade, building sides, and exposure before making a planning decision.',
  },
];

const USE_CASES: UseCase[] = [
  {
    title: 'Посадка деревьев',
    titleEn: 'Tree planting',
    description: 'Pick planting zones that stay cooler in summer and still receive enough winter light.',
    path: '/app/trees',
    accent: 'bg-[#d8a62c]',
  },
  {
    title: 'Анализ квартиры',
    titleEn: 'Apartment analysis',
    description: 'Review sunlight access before buying or renting, with a better sense of orientation and blockage.',
    path: '/app/apartments',
    accent: 'bg-[#1f4f9c]',
  },
  {
    title: 'Солнечные цветы',
    titleEn: 'Solar and flowers',
    description: 'Match crops, flowers, or solar spots to the actual daily light pattern of the parcel.',
    path: '/app/solar-flowers',
    accent: 'bg-[#f0c24c]',
  },
  {
    title: 'Ротация рабочих',
    titleEn: 'Worker rotation',
    description: 'Plan safer outdoor schedules by understanding where heat, sun, and shade accumulate.',
    path: '/app/workers',
    accent: 'bg-[#2f67bf]',
  },
];

const TIMELINE = ['06:10 sunrise', '09:30 courtyards', '12:00 peak light', '17:40 façade shift'];

function HeroBlueprint() {
  return (
    <div className="rounded-xl border border-[color:var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(237,242,250,0.94))] p-4 shadow-[var(--shadow)]">
      <div className="flex items-center justify-between border-b border-[color:var(--line)] pb-3">
        <div>
          <div className="ui-mono text-[11px] text-[var(--ink-soft)]">Astana · March 31</div>
          <div className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[var(--ink)]">Sun path study</div>
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--blue-strong)]">
          <SunMedium className="h-4 w-4" />
          <span>09:30</span>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-[color:var(--line)] bg-[var(--surface)] p-4">
        <div className="relative h-[320px] overflow-hidden rounded-lg border border-[rgba(31,79,156,0.12)] bg-[var(--grid-bg)]">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(31,79,156,0.08)_1px,transparent_1px),linear-gradient(rgba(31,79,156,0.08)_1px,transparent_1px)] bg-[size:28px_28px]" />

          <div className="absolute left-6 top-6 h-24 w-24 rounded-lg border-2 border-[rgba(31,79,156,0.7)] bg-white/80" />
          <div className="absolute left-[32%] top-[22%] h-28 w-32 rounded-lg border-2 border-[rgba(31,79,156,0.7)] bg-white/85" />
          <div className="absolute right-8 top-12 h-32 w-24 rounded-lg border-2 border-[rgba(31,79,156,0.7)] bg-white/80" />
          <div className="absolute left-[18%] bottom-14 h-16 w-[58%] skew-x-[-20deg] bg-[linear-gradient(90deg,rgba(240,194,76,0.88),rgba(240,194,76,0.18))]" />
          <div className="absolute left-14 top-[48%] h-[2px] w-[55%] rotate-[12deg] bg-[rgba(214,162,44,0.9)]" />
          <div className="absolute right-10 top-8 flex h-16 w-16 items-center justify-center rounded-full border-4 border-[rgba(240,194,76,0.9)] bg-[rgba(255,247,214,0.85)]">
            <SunMedium className="h-7 w-7 text-[var(--yellow-strong)]" />
          </div>
          <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center gap-2 border-t border-[rgba(31,79,156,0.14)] pt-3 ui-mono text-[11px] text-[var(--ink-soft)]">
            {TIMELINE.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-[color:var(--line)] bg-white/80 p-3">
            <div className="ui-mono text-[11px] text-[var(--ink-soft)]">coverage</div>
            <div className="mt-1 text-xl font-semibold tracking-[-0.03em]">6h 42m</div>
          </div>
          <div className="rounded-lg border border-[color:var(--line)] bg-white/80 p-3">
            <div className="ui-mono text-[11px] text-[var(--ink-soft)]">best side</div>
            <div className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[var(--blue-strong)]">South</div>
          </div>
          <div className="rounded-lg border border-[color:var(--line)] bg-white/80 p-3">
            <div className="ui-mono text-[11px] text-[var(--ink-soft)]">shadow shift</div>
            <div className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[var(--yellow-strong)]">14.2 m</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--bg)] text-[var(--ink)]">
      <header className="border-b border-[color:var(--line)]">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[color:var(--line-strong)] bg-[var(--surface)]">
              <SunMedium className="h-5 w-5 text-[var(--blue-strong)]" />
            </div>
            <div>
              <div className="text-base font-semibold tracking-[-0.03em]">DeCentra</div>
              <div className="ui-mono text-[11px] text-[var(--ink-soft)]">sun and shadow mapping</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/app')}
              className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--blue-strong)] bg-[var(--blue-strong)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--blue)]"
            >
              Open app
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="border-b border-[color:var(--line)]">
          <div className="mx-auto grid max-w-[1280px] gap-10 px-4 py-10 md:px-8 lg:grid-cols-[1fr_0.95fr] lg:py-16">
            <div className="flex flex-col justify-between gap-10">
              <div className="space-y-6">
                <div className="ui-mono text-[12px] text-[var(--blue-strong)]">
                  Urban daylight intelligence for Astana
                </div>
                <div className="max-w-3xl">
                  <h1 className="text-[clamp(3.3rem,8vw,7.1rem)] font-[780] leading-[0.92] tracking-[-0.08em]">
                    Plan with sun.
                    <br />
                    Decide with shadow.
                  </h1>
                </div>
                <p className="max-w-xl text-lg leading-8 text-[var(--ink-soft)]">
                  A working map for planting, apartments, solar potential, and labor safety.
                  Search a site, move through the day, and read what sunlight actually does on the ground.
                </p>
              </div>

              <div className="flex flex-col gap-5">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => navigate('/app')}
                    className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--blue-strong)] bg-[var(--blue-strong)] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--blue)]"
                  >
                    Start analysis
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <a
                    href="#use-cases"
                    className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--line-strong)] bg-[var(--surface)] px-5 py-3 text-sm font-medium text-[var(--ink)] transition-colors hover:border-[color:var(--blue-strong)]"
                  >
                    Review use cases
                    <Compass className="h-4 w-4 text-[var(--yellow-strong)]" />
                  </a>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {METRICS.map((metric) => (
                    <div
                      key={metric.label}
                      className="rounded-xl border border-[color:var(--line)] bg-[var(--surface)] px-4 py-4"
                    >
                      <div className="ui-mono text-[11px] text-[var(--ink-soft)]">{metric.label}</div>
                      <div className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[var(--blue-strong)]">
                        {metric.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <HeroBlueprint />
          </div>
        </section>

        <section className="border-b border-[color:var(--line)]">
          <div className="mx-auto max-w-[1280px] px-4 py-10 md:px-8 md:py-14">
            <div className="grid gap-8 lg:grid-cols-[0.72fr_1fr]">
              <div className="max-w-md">
                <div className="ui-mono text-[12px] text-[var(--ink-soft)]">Core tools</div>
                <h2 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-[var(--ink)]">
                  Built like a product tool, not a demo.
                </h2>
                <p className="mt-4 text-base leading-7 text-[var(--ink-soft)]">
                  The interface stays clear and work-focused, while the visuals still carry a strong point of view.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {FEATURES.map((feature) => (
                  <article
                    key={feature.title}
                    className="flex h-full flex-col rounded-xl border border-[color:var(--line)] bg-[var(--surface)] p-5"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[color:var(--line)] bg-white">
                      <feature.icon className="h-5 w-5 text-[var(--blue-strong)]" />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold tracking-[-0.04em]">{feature.title}</h3>
                    <p className="mt-3 flex-1 text-sm leading-7 text-[var(--ink-soft)]">
                      {feature.description}
                    </p>
                    <div className="mt-5 border-t border-[color:var(--line)] pt-3 ui-mono text-[11px] text-[var(--yellow-strong)]">
                      {feature.note}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="use-cases" className="border-b border-[color:var(--line)]">
          <div className="mx-auto max-w-[1280px] px-4 py-10 md:px-8 md:py-14">
            <div className="flex flex-col gap-3">
              <div className="ui-mono text-[12px] text-[var(--ink-soft)]">Use cases</div>
              <h2 className="text-4xl font-semibold tracking-[-0.05em]">
                Four decisions, one map interface.
              </h2>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {USE_CASES.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="group flex w-full flex-col rounded-xl border border-[color:var(--line)] bg-[var(--surface)] p-0 text-left transition-colors hover:border-[color:var(--line-strong)]"
                >
                  <div className={`h-2 w-full rounded-t-xl ${item.accent}`} />
                  <div className="flex flex-1 flex-col gap-4 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xl font-semibold tracking-[-0.04em]">{item.title}</div>
                        <div className="mt-1 ui-mono text-[11px] text-[var(--ink-soft)]">{item.titleEn}</div>
                      </div>
                      <ArrowRight className="mt-1 h-5 w-5 text-[var(--blue-strong)] transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <p className="text-sm leading-7 text-[var(--ink-soft)]">{item.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-[color:var(--line)]">
          <div className="mx-auto max-w-[1280px] px-4 py-10 md:px-8 md:py-14">
            <div className="grid gap-8 lg:grid-cols-[0.7fr_1fr]">
              <div className="max-w-md">
                <div className="ui-mono text-[12px] text-[var(--ink-soft)]">Workflow</div>
                <h2 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
                  A short path from map view to action.
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {WORKFLOW.map((step) => (
                  <article
                    key={step.number}
                    className="rounded-xl border border-[color:var(--line)] bg-white/80 p-5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="ui-mono text-sm text-[var(--ink-soft)]">{step.number}</span>
                      <Workflow className="h-4 w-4 text-[var(--yellow-strong)]" />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold tracking-[-0.04em]">{step.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{step.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-[1280px] px-4 py-10 md:px-8 md:py-14">
            <div className="grid gap-5 rounded-xl border border-[color:var(--line)] bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(228,236,248,0.9))] p-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="flex items-center gap-2 text-[var(--blue-strong)]">
                  <MapPinned className="h-4 w-4" />
                  <span className="ui-mono text-[12px]">Open the live map</span>
                </div>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em]">
                  Start with Astana and move directly into the real interface.
                </h2>
                <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--ink-soft)]">
                  The app is already structured for tree planning, apartment checks, solar matching, and worker rotation.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 md:block">
                <button
                  onClick={() => navigate('/app')}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-[color:var(--blue-strong)] bg-[var(--blue-strong)] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--blue)]"
                >
                  Open shadow map
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[color:var(--line)]">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-3 px-4 py-5 text-sm text-[var(--ink-soft)] md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Trees className="h-4 w-4 text-[var(--yellow-strong)]" />
              <span>Urban planning</span>
            </div>
            <div className="flex items-center gap-2">
              <Sprout className="h-4 w-4 text-[var(--blue-strong)]" />
              <span>Sun exposure</span>
            </div>
          </div>
          <div className="ui-mono text-[11px]">Powered by OpenStreetMap, MapLibre GL, and live shadow simulation.</div>
        </div>
      </footer>
    </div>
  );
}
