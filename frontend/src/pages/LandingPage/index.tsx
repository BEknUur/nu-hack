import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Clock3,
  Compass,
  Play,
  ScanSearch,
  Sprout,
  SunMedium,
  Trees,
  type LucideIcon,
} from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useTranslation } from '@/i18n';

type UseCaseVisual = {
  path: string;
  accent: string;
  borderAccent: string;
};

const FEATURE_ICONS: LucideIcon[] = [Clock3, Building2, ScanSearch];

const USE_CASE_VISUALS: UseCaseVisual[] = [
  {
    path: '/app/trees',
    accent: 'bg-[#d8a62c]',
    borderAccent: 'border-l-[#d8a62c]',
  },
  {
    path: '/app/apartments',
    accent: 'bg-[#1f4f9c]',
    borderAccent: 'border-l-[#1f4f9c]',
  },
  {
    path: '/app/solar-flowers',
    accent: 'bg-[#f0c24c]',
    borderAccent: 'border-l-[#f0c24c]',
  },
  {
    path: '/app/workers',
    accent: 'bg-[#2f67bf]',
    borderAccent: 'border-l-[#2f67bf]',
  },
];

const SHOWREEL_VIDEO_SRC = '';

function HeroBlueprint() {
  const { messages } = useTranslation();

  return (
    <div className="rounded-xl border border-[color:var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(237,242,250,0.94))] p-4 shadow-[var(--shadow)]">
      <div className="flex items-center justify-between border-b border-[color:var(--line)] pb-3">
        <div>
          <div className="ui-mono text-[11px] text-[var(--ink-soft)]">{messages.landing.heroBlueprintDate}</div>
          <div className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[var(--ink)]">{messages.landing.heroBlueprintTitle}</div>
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
            {messages.landing.timeline.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-[color:var(--line)] bg-white/80 p-3">
            <div className="ui-mono text-[11px] text-[var(--ink-soft)]">{messages.landing.heroBlueprintCoverage}</div>
            <div className="mt-1 text-xl font-semibold tracking-[-0.03em]">6h 42m</div>
          </div>
          <div className="rounded-lg border border-[color:var(--line)] bg-white/80 p-3">
            <div className="ui-mono text-[11px] text-[var(--ink-soft)]">{messages.landing.heroBlueprintBestSide}</div>
            <div className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[var(--blue-strong)]">{messages.landing.heroBlueprintSouth}</div>
          </div>
          <div className="rounded-lg border border-[color:var(--line)] bg-white/80 p-3">
            <div className="ui-mono text-[11px] text-[var(--ink-soft)]">{messages.landing.heroBlueprintShift}</div>
            <div className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[var(--yellow-strong)]">14.2 m</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { messages } = useTranslation();

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--bg)] text-[var(--ink)]">
      <header className="border-b border-[color:var(--line)]">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[color:var(--line-strong)] bg-[var(--surface)]">
              <SunMedium className="h-5 w-5 text-[var(--blue-strong)]" />
            </div>
            <div>
              <div className="text-base font-semibold tracking-[-0.03em]">{messages.common.appName}</div>
              <div className="ui-mono text-[11px] text-[var(--ink-soft)]">{messages.common.appTagline}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <button
              onClick={() => navigate('/app')}
              className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--blue-strong)] bg-[var(--blue-strong)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--blue)]"
            >
              {messages.common.openApp}
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
                  {messages.landing.heroTag}
                </div>
                <div className="max-w-3xl">
                  <h1 className="text-[clamp(3.3rem,8vw,7.1rem)] font-[780] leading-[0.92] tracking-[-0.08em]">
                    {messages.landing.heroTitleTop}
                    <br />
                    {messages.landing.heroTitleBottom}
                  </h1>
                </div>
                <p className="max-w-xl text-lg leading-8 text-[var(--ink-soft)]">
                  {messages.landing.heroDescription}
                </p>
              </div>

              <div className="flex flex-col gap-5">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => navigate('/app')}
                    className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--blue-strong)] bg-[var(--blue-strong)] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--blue)]"
                  >
                    {messages.common.startAnalysis}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <a
                    href="#use-cases"
                    className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--line-strong)] bg-[var(--surface)] px-5 py-3 text-sm font-medium text-[var(--ink)] transition-colors hover:border-[color:var(--blue-strong)]"
                  >
                    {messages.common.reviewUseCases}
                    <Compass className="h-4 w-4 text-[var(--yellow-strong)]" />
                  </a>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {messages.landing.metrics.map((metric) => (
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
                <div className="ui-mono text-[12px] text-[var(--ink-soft)]">{messages.landing.coreToolsTag}</div>
                <h2 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-[var(--ink)]">
                  {messages.landing.coreToolsTitle}
                </h2>
                <p className="mt-4 text-base leading-7 text-[var(--ink-soft)]">
                  {messages.landing.coreToolsDescription}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {messages.landing.features.map((feature, index) => {
                  const Icon = FEATURE_ICONS[index];

                  return (
                    <article
                      key={feature.title}
                      className="flex h-full flex-col rounded-xl border border-[color:var(--line)] bg-[var(--surface)] p-5"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[color:var(--line)] bg-white">
                        <Icon className="h-5 w-5 text-[var(--blue-strong)]" />
                      </div>
                      <h3 className="mt-5 text-xl font-semibold tracking-[-0.04em]">{feature.title}</h3>
                      <p className="mt-3 flex-1 text-sm leading-7 text-[var(--ink-soft)]">
                        {feature.description}
                      </p>
                      <div className="mt-5 border-t border-[color:var(--line)] pt-3 ui-mono text-[11px] text-[var(--yellow-strong)]">
                        {feature.note}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="use-cases" className="border-b border-[color:var(--line)]">
          <div className="mx-auto max-w-[1280px] px-4 py-10 md:px-8 md:py-14">
            <div className="grid gap-8 lg:grid-cols-[0.44fr_1fr] lg:items-center">
              <div className="max-w-lg">
                <div className="ui-mono text-[12px] text-[var(--ink-soft)]">{messages.landing.useCasesTag}</div>
                <h2 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
                  {messages.landing.useCasesTitle}
                </h2>
                <p className="mt-4 text-base leading-7 text-[var(--ink-soft)]">
                  {messages.landing.useCasesDescription}
                </p>

                <div className="mt-6 grid gap-3">
                  {messages.landing.useCases.map((item, index) => {
                    const visual = USE_CASE_VISUALS[index];

                    return (
                      <button
                        key={visual.path}
                        onClick={() => navigate(visual.path)}
                        className={`w-full rounded-xl border border-[color:var(--line)] border-l-4 bg-[var(--surface-strong)] px-4 py-4 text-left transition-colors hover:border-[color:var(--line-strong)] ${visual.borderAccent}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-lg font-semibold tracking-[-0.04em] text-[var(--ink)]">{item.title}</div>
                            <div className="mt-1 ui-mono text-[11px] text-[var(--ink-soft)]">{item.titleEn}</div>
                          </div>
                          <ArrowRight className="mt-1 h-4 w-4 text-[var(--blue-strong)]" />
                        </div>
                        <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{item.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-[color:var(--line)] bg-[var(--surface-strong)] shadow-[var(--shadow)]">
                <div className="flex items-center justify-between border-b border-[color:var(--line)] px-5 py-4">
                  <div>
                    <div className="ui-mono text-[11px] text-[var(--ink-soft)]">{messages.landing.showreelTag}</div>
                    <div className="mt-1 text-xl font-semibold tracking-[-0.04em] text-[var(--ink)]">{messages.landing.showreelTitle}</div>
                  </div>
                  <div className="ui-mono hidden text-[11px] text-[var(--ink-soft)] md:block">{messages.landing.showreelPlaceholderHint}</div>
                </div>

                <div className="bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(231,238,248,0.92))] p-4">
                  <div className="aspect-video overflow-hidden rounded-xl border border-[color:var(--line)] bg-[#101424]">
                    {SHOWREEL_VIDEO_SRC ? (
                      <video
                        src={SHOWREEL_VIDEO_SRC}
                        controls
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="relative flex h-full flex-col justify-between overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(47,103,191,0.36),transparent_28%),linear-gradient(135deg,#0f1424_0%,#171d31_52%,#111624_100%)] p-6 text-white">
                        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:28px_28px] opacity-20" />

                        <div className="relative flex items-start justify-between gap-4">
                          <div className="max-w-xl">
                            <div className="ui-mono text-[11px] text-white/65">{messages.landing.showreelPlaceholderHint}</div>
                            <div className="mt-3 text-3xl font-semibold tracking-[-0.05em]">
                              {messages.landing.showreelPlaceholderTitle}
                            </div>
                          </div>

                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-sm">
                            <Play className="h-6 w-6" />
                          </div>
                        </div>

                        <div className="relative grid gap-3 sm:grid-cols-2">
                          {messages.landing.useCases.map((item, index) => (
                            <div
                              key={item.title}
                              className="rounded-xl border border-white/12 bg-white/8 px-4 py-3 backdrop-blur-sm"
                            >
                              <div className="flex items-center gap-2">
                                <span className={`h-2.5 w-2.5 rounded-full ${USE_CASE_VISUALS[index].accent}`} />
                                <span className="text-sm font-medium text-white">{item.title}</span>
                              </div>
                              <div className="mt-1 ui-mono text-[11px] text-white/60">{item.titleEn}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
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
              <span>{messages.landing.footerUrbanPlanning}</span>
            </div>
            <div className="flex items-center gap-2">
              <Sprout className="h-4 w-4 text-[var(--blue-strong)]" />
              <span>{messages.landing.footerSunExposure}</span>
            </div>
          </div>
          <div className="ui-mono text-[11px]">{messages.landing.footerCredits}</div>
        </div>
      </footer>
    </div>
  );
}
