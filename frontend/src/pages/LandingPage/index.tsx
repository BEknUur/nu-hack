import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Clock3,
  Flower2,
  Sprout,
  type LucideIcon,
} from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';

type HeroFeature = {
  title: string;
  description: string;
  path: string;
  reverse?: boolean;
  icon: LucideIcon;
  mediaType: 'video' | 'mock';
  mediaLabel: string;
  accent: string;
  videoSrc?: string;
};

const HERO_FEATURES: HeroFeature[] = [
  {
    title: 'Tree planting',
    description:
      'Find cooler zones that still keep enough winter light. Move through time and choose where trees improve comfort without blocking too much sun.',
    path: '/app/trees',
    reverse: false,
    icon: Sprout,
    mediaType: 'video',
    mediaLabel: 'Live preview',
    accent: 'from-emerald-300 via-lime-200 to-emerald-500',
    videoSrc: '/vids/plant_tree.mp4',
  },
  {
    title: 'Worker rotation',
    description:
      'Plan safer outdoor shifts around heat, sun, and shade. Identify high-risk windows and redistribute tasks by light conditions.',
    path: '/app/workers',
    reverse: true,
    icon: Clock3,
    mediaType: 'mock',
    mediaLabel: 'Coming soon',
    accent: 'from-violet-300 via-indigo-200 to-indigo-500',
  },
  {
    title: 'Solar and flowers',
    description:
      'Match crops, flowers, or solar spots to the daily light path. Use one map to compare potential zones quickly.',
    path: '/app/solar-flowers',
    reverse: false,
    icon: Flower2,
    mediaType: 'mock',
    mediaLabel: 'Interactive mode',
    accent: 'from-amber-300 via-yellow-200 to-orange-400',
  },
];

function FeatureMedia({ feature }: { feature: HeroFeature }) {
  const Icon = feature.icon;

  if (feature.mediaType === 'video') {
    return (
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/15 bg-[#0a0f26] shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
        <video
          src={feature.videoSrc ?? '/vids/plant_tree.mp4'}
          autoPlay
          muted
          loop
          playsInline
          className="h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(10,14,34,0.08)_0%,rgba(10,14,34,0.62)_100%)]" />
      </div>
    );
  }

  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-[color:var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(236,242,249,0.98))] shadow-[0_24px_48px_rgba(15,23,42,0.12)]">
      <div className={`absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-20`} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.82),transparent_26%),linear-gradient(135deg,rgba(255,255,255,0.25),rgba(255,255,255,0))]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(31,79,156,0.08)_1px,transparent_1px),linear-gradient(rgba(31,79,156,0.08)_1px,transparent_1px)] bg-[size:28px_28px] opacity-40" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/30 bg-white/40 backdrop-blur-sm">
          <Icon className="h-9 w-9 text-[var(--blue-strong)]" />
        </div>
      </div>
      <span className="absolute left-3 top-3 rounded-full border border-[color:var(--line)] bg-white/85 px-3 py-1 text-[11px] text-[var(--ink-soft)] backdrop-blur-sm">
        {feature.mediaLabel}
      </span>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--bg)] text-[var(--ink)]">
      <header className="sticky top-0 z-20 border-b border-[color:var(--line)] bg-[rgba(251,248,241,0.88)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between px-5 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-base font-semibold tracking-[-0.03em]">DeCentra</div>
              <div className="ui-mono text-[11px] text-[var(--ink-soft)]">sunlight and shadow map</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1240px] px-5 pb-20 pt-10 md:px-8 md:pt-14">
        <section className="mb-14 max-w-3xl">
          <div className="ui-mono text-[12px] text-[var(--blue-strong)]">Urban daylight intelligence for Astana</div>
          <h1 className="mt-4 text-[clamp(2.3rem,6vw,4.6rem)] font-semibold leading-[0.95] tracking-[-0.05em]">
            Sunlight
            <br />
            in motion.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--ink-soft)] md:text-lg">
            Four workflows, one clean landing page. Analyze shadows and sunlight in real city context.
          </p>
        </section>

        <section className="mb-16">
          <article className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div className="space-y-4">
              <h2 className="text-[clamp(2rem,4.2vw,3.6rem)] font-semibold tracking-[-0.05em] text-[var(--blue-strong)]">
                Apartment analysis
              </h2>
              <p className="max-w-xl text-[1.06rem] leading-8 text-[var(--ink-soft)]">
                Review sunlight, orientation, and blockage before you decide. Check facades and
                courtyard shadows over the full day.
              </p>
              <button
                onClick={() => navigate('/app/apartments')}
                className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--blue-strong)] bg-[var(--blue-strong)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--blue)]"
              >
                Open scene
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="relative aspect-video overflow-hidden rounded-2xl border border-[color:var(--line)] bg-[#0a0f26] shadow-[0_24px_48px_rgba(15,23,42,0.18)]">
              <video
                src="/vids/apartment.mp4"
                autoPlay
                muted
                loop
                playsInline
                className="h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(8,12,20,0)_0%,rgba(8,12,20,0.22)_100%)]" />
            </div>
          </article>
        </section>

        <section className="space-y-16">
          {HERO_FEATURES.map((feature) => (
            <article key={feature.title} className="grid gap-8 lg:grid-cols-2 lg:items-center">
              <div className={feature.reverse ? 'lg:order-2' : 'lg:order-1'}>
                <FeatureMedia feature={feature} />
              </div>

              <div className={feature.reverse ? 'lg:order-1' : 'lg:order-2'}>
                <h2 className="text-[clamp(1.7rem,3.1vw,2.7rem)] font-semibold tracking-[-0.04em] text-[var(--blue-strong)]">
                  {feature.title}
                </h2>
                <p className="mt-4 max-w-xl text-[1.06rem] leading-8 text-[var(--ink-soft)]">
                  {feature.description}
                </p>
                <button
                  onClick={() => navigate(feature.path)}
                  className="mt-6 inline-flex items-center gap-2 rounded-lg border border-[color:var(--blue-strong)] bg-[var(--blue-strong)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--blue)]"
                >
                  Open scene
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
