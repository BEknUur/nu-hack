import { LogIn, User, LogOut } from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ResponsiveHeroBanner from '@/components/ui/responsive-hero-banner';
import { AnimatedText } from '@/components/ui/animated-underline-text-one';
import WhisperText from '@/components/ui/whisper-text';
import { Footer } from '@/components/ui/footer';
import { useLangPath, useTranslation } from '@/i18n';
import { useAuth } from '@/hooks/useAuth';

// ─── DeCentra logo ───────────────────────────────────────────────────────────

function DeCentraLogo({ tagline, homeHref }: { tagline: string; homeHref: string }) {
  return (
    <a href={homeHref} className="flex flex-col leading-none">
      <span className="font-display text-[15px] font-medium text-white tracking-[-0.04em]">DeCentra</span>
      <span className="ui-mono text-[10px] text-white/35 mt-0.5">{tagline}</span>
    </a>
  );
}



// ─── Feature config (visual only, text comes from i18n) ──────────────────────

type FeatureConfig = {
  num: string;
  path: string;
  videoSrc?: string;
  accent: string;
  glow: string;
  border: string;
  tagColor: string;
  reverse?: boolean;
  comingSoon?: boolean;
};

const FEATURE_CONFIG: FeatureConfig[] = [
  {
    num: '01',
    path: '/app/apartments',
    videoSrc: '/vids/apartment.mp4',
    accent: 'rgba(240,194,76,0.07)',
    glow: 'rgba(240,194,76,0.22)',
    border: 'rgba(240,194,76,0.14)',
    tagColor: '#f0c24c',
    reverse: false,
  },
  {
    num: '02',
    path: '/app/trees',
    videoSrc: '/vids/plant_tree.mp4',
    accent: 'rgba(74,222,128,0.06)',
    glow: 'rgba(74,222,128,0.18)',
    border: 'rgba(74,222,128,0.12)',
    tagColor: '#4ade80',
    reverse: true,
  },
  {
    num: '03',
    path: '/app/workers',
    videoSrc: '/vids/workers.mp4',
    accent: 'rgba(96,165,250,0.06)',
    glow: 'rgba(96,165,250,0.18)',
    border: 'rgba(96,165,250,0.12)',
    tagColor: '#60a5fa',
    reverse: false,
  },
  {
    num: '04',
    path: '/app/solar-flowers',
    accent: 'rgba(251,146,60,0.06)',
    glow: 'rgba(251,146,60,0.16)',
    border: 'rgba(251,146,60,0.12)',
    tagColor: '#fb923c',
    reverse: true,
  },
];

// ─── Feature section ─────────────────────────────────────────────────────────

type FeatureText = { title: string; description: string; tag: string };

function FeatureSection({
  cfg,
  text,
  openSceneLabel,
  inDevLabel,
  hrefFor,
}: {
  cfg: FeatureConfig;
  text: FeatureText;
  openSceneLabel: string;
  inDevLabel: string;
  hrefFor: (path: string) => string;
}) {
  return (
    <section className="relative px-4 md:px-6 pb-16 md:pb-24 overflow-hidden">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute rounded-full blur-[180px]"
        style={{
          background: cfg.glow,
          width: '500px',
          height: '500px',
          top: '50%',
          transform: 'translateY(-50%)',
          right: cfg.reverse ? 'auto' : '-100px',
          left: cfg.reverse ? '-100px' : 'auto',
          opacity: 0.18,
        }}
      />
      <div className="mx-auto max-w-7xl">
        <div className="relative z-10 grid gap-10 lg:grid-cols-2 lg:gap-20 items-center px-2 md:px-4">

          {/* Text */}
          <div className={`text-left ${cfg.reverse ? 'lg:order-2' : 'lg:order-1'}`}>
            <div className="flex items-center gap-3 mb-5">
              <span className="ui-mono text-[11px] text-white/20 tabular-nums">{cfg.num}</span>
              <span
                className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1"
                style={{ color: cfg.tagColor, borderColor: cfg.border, background: cfg.accent }}
              >
                {text.tag}
              </span>
            </div>

            <AnimatedText
              text={text.title}
              textClassName="font-display text-3xl md:text-[2.6rem] lg:text-5xl font-light tracking-[-0.04em] text-white leading-[1.02]"
              underlineClassName="text-white/20"
              underlineDuration={1.2}
            />

            <p className="mt-5 text-base md:text-[1.06rem] leading-[1.75] text-white/45 max-w-md">
              {text.description}
            </p>

            {cfg.comingSoon ? (
              <div className="mt-8 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm text-white/25 ring-1 ring-white/8">
                {inDevLabel}
              </div>
            ) : (
              <a
                href={hrefFor(cfg.path)}
                className="mt-8 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white ring-1 transition-all duration-200 hover:bg-white/5"
                style={{ borderColor: cfg.border }}
              >
                {openSceneLabel}
              </a>
            )}
          </div>

          {/* Media */}
          <div className={cfg.reverse ? 'lg:order-1' : 'lg:order-2'}>
            {cfg.videoSrc ? (
              <div
                className="relative aspect-[16/10] overflow-hidden rounded-2xl"
                style={{
                  border: `1px solid ${cfg.border}`,
                  boxShadow: `0 40px 80px rgba(0,0,0,0.5), 0 0 80px ${cfg.glow}40`,
                }}
              >
                <video
                  src={cfg.videoSrc}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="h-full w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(0,0,0,0.35)_100%)]" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
              </div>
            ) : (
              <div
                className="relative aspect-[16/10] overflow-hidden rounded-2xl flex flex-col items-center justify-center gap-4"
                style={{
                  background: 'linear-gradient(135deg, #0d1117, #111820)',
                  border: `1px solid ${cfg.border}`,
                }}
              >
                <div
                  className="flex h-20 w-20 items-center justify-center rounded-full ring-1 font-display text-xl font-semibold tabular-nums"
                  style={{ background: cfg.accent, borderColor: cfg.border, color: cfg.tagColor }}
                >
                  {cfg.num}
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-white/30">{inDevLabel}</p>
                  <p className="ui-mono text-[11px] text-white/15 mt-1">2025</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { messages } = useTranslation();
  const langPath = useLangPath();
  const l = messages.landingV2;
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-[#06080f] text-white overflow-x-hidden">

      {/* ── Hero ── */}
      <ResponsiveHeroBanner
        logoSlot={<DeCentraLogo tagline={l.footer.tagline} homeHref={langPath('/')} />}
        backgroundSlides={[
          '/imgs/image2.png',
          '/imgs/astana2.png',
          '/imgs/image.png',
        ]}
        slideInterval={4000}
        navLinks={[
          { label: l.nav.apartments, href: langPath('/app/apartments') },
          { label: l.nav.trees,      href: langPath('/app/trees')      },
          { label: l.nav.workers,    href: langPath('/app/workers')    },
        ]}
        ctaButtonText={l.hero.openMap}
        ctaButtonHref={langPath('/app')}
        title={l.hero.title}
        titleLine2={l.hero.titleAccent}
        description={l.hero.description}
        rightSlot={
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {user ? (
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1.5 rounded-full bg-white/8 ring-1 ring-white/15 px-3 py-1.5">
                  <User className="h-3.5 w-3.5 text-white/60" />
                  <span className="text-xs text-white/70 max-w-[120px] truncate">{user.email}</span>
                </div>
                <button
                  onClick={() => void signOut()}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8 ring-1 ring-white/15 text-white/50 hover:text-white hover:bg-white/12 transition-colors"
                  aria-label="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <a
                href="/auth"
                className="flex items-center gap-1.5 rounded-full bg-white/8 ring-1 ring-white/15 px-3.5 py-2 text-sm font-medium text-white/80 hover:text-white hover:bg-white/12 transition-colors"
              >
                <LogIn className="h-3.5 w-3.5" />
                Sign in
              </a>
            )}
          </div>
        }
        partners={[]}
        heroTextSlot={
          <div className="flex flex-col items-center gap-0">
            <WhisperText
              text={l.hero.title}
              className="font-display text-[clamp(3.4rem,9.5vw,7.5rem)] font-light leading-[0.88] tracking-[-0.04em] text-white"
              delay={220}
              duration={0.8}
              y={35}
              triggerStart="top bottom"
            />
            <WhisperText
              text={l.hero.titleAccent}
              className="font-display text-[clamp(3.4rem,9.5vw,7.5rem)] font-light leading-[0.88] tracking-[-0.04em] text-[#f0c24c]"
              delay={220}
              duration={0.8}
              y={35}
              triggerStart="top bottom"
            />
          </div>
        }
        descriptionSlot={
          <WhisperText
            text={l.hero.description}
            className="mx-auto max-w-xl text-xs md:text-sm text-white/45 leading-relaxed"
            delay={60}
            duration={0.5}
            y={15}
            triggerStart="top bottom"
          />
        }
      />

   

      {/* ── Feature sections ── */}
      <div className="space-y-6 md:space-y-8">
        {FEATURE_CONFIG.map((cfg, i) => (
          <FeatureSection
            key={cfg.num}
            cfg={cfg}
            text={l.features[i]}
            openSceneLabel={l.openScene}
            inDevLabel={l.inDevelopment}
            hrefFor={langPath}
          />
        ))}
      </div>

      {/* ── Footer ── */}
      <Footer
        mainLinks={[
          { href: langPath('/app/apartments'), label: l.nav.apartments },
          { href: langPath('/app/trees'),      label: l.nav.trees      },
          { href: langPath('/app/workers'),    label: l.nav.workers    },
        ]}
        legalLinks={[
          { href: '#', label: 'Privacy' },
          { href: '#', label: 'Terms'   },
        ]}
        copyright={{
          text: `© ${new Date().getFullYear()} DeCentra`,
          license: l.footer.tagline,
        }}
      />
    </div>
  );
}
