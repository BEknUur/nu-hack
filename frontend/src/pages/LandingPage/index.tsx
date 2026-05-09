import { useNavigate } from 'react-router-dom';
import { GridPattern } from '@/components/magicui/grid-pattern';
import { Particles } from '@/components/magicui/particles';
import { ShimmerButton } from '@/components/magicui/shimmer-button';
import { BlurFade } from '@/components/magicui/blur-fade';
import { WordRotate } from '@/components/magicui/word-rotate';
import { AnimatedGradientText } from '@/components/magicui/animated-gradient-text';
import { Sun, Building2, MapPin, Clock, ChevronRight, Globe, TreePine, Home, Flower2, HardHat } from 'lucide-react';

const FEATURES = [
  {
    icon: Sun,
    title: 'Real-time Shadows',
    description: 'See exact shadow positions for any moment in time. Move the slider — shadows shift instantly.',
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10 border-yellow-400/20',
  },
  {
    icon: Building2,
    title: '3D Building Mode',
    description: 'Switch to 3D and explore your city with full building extrusion and depth shadows.',
    color: 'text-[#4fc3f7]',
    bg: 'bg-[#4fc3f7]/10 border-[#4fc3f7]/20',
  },
  {
    icon: Clock,
    title: 'Sun Exposure Analysis',
    description: 'Calculate cumulative sun exposure from sunrise to sunset — for any date, any location.',
    color: 'text-purple-400',
    bg: 'bg-purple-400/10 border-purple-400/20',
  },
];

const STATS = [
  { value: '48', label: 'Time steps per day' },
  { value: '3D', label: 'Building visualization' },
  { value: '∞', label: 'Locations worldwide' },
];

const CASES = [
  {
    id: 'trees',
    icon: TreePine,
    emoji: '🌳',
    title: 'Посадка деревьев',
    titleEn: 'Tree Planting',
    description: 'Найди оптимальные места для посадки деревьев — максимум тени летом и света зимой.',
    color: '#69f0ae',
    bg: 'bg-[#69f0ae]/10 border-[#69f0ae]/20',
    path: '/app/trees',
    tag: 'Озеленение',
  },
  {
    id: 'apartments',
    icon: Home,
    emoji: '🏠',
    title: 'Анализ квартиры',
    titleEn: 'Apartment Analysis',
    description: 'Проверь инсоляцию квартиры перед покупкой. Sun Score, часы солнца по месяцам.',
    color: '#4fc3f7',
    bg: 'bg-[#4fc3f7]/10 border-[#4fc3f7]/20',
    path: '/app/apartments',
    tag: 'Недвижимость',
  },
  {
    id: 'solar-flowers',
    icon: Flower2,
    emoji: '☀️',
    title: 'Солнечные цветы',
    titleEn: 'Solar & Flowers',
    description: 'Подбери культуры и зоны по реальной инсоляции участка. Хитмэп и рекомендации.',
    color: '#ffb74d',
    bg: 'bg-[#ffb74d]/10 border-[#ffb74d]/20',
    path: '/app/solar-flowers',
    tag: 'Агро',
  },
  {
    id: 'workers',
    icon: HardHat,
    emoji: '👷',
    title: 'Ротация рабочих',
    titleEn: 'Worker Rotation',
    description: 'Составь расписание смен так, чтобы никто не перегревался и не мёрз на работе.',
    color: '#ff6b6b',
    bg: 'bg-[#ff6b6b]/10 border-[#ff6b6b]/20',
    path: '/app/workers',
    tag: 'Охрана труда',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#020817] text-white overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4">
        {/* Background layers */}
        <GridPattern
          width={50}
          height={50}
          className="opacity-60"
          squares={[[2,2],[5,8],[12,3],[18,12],[8,15],[22,6],[15,18]]}
        />
        <Particles quantity={50} color="#4fc3f7" size={1} />

        {/* Radial gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(79,195,247,0.12),transparent)]" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#020817] to-transparent" />

        {/* Nav */}
        <nav className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-5 md:px-12">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4fc3f7]/20 border border-[#4fc3f7]/30">
              <Sun className="h-4 w-4 text-[#4fc3f7]" />
            </div>
            <span className="text-base font-semibold tracking-tight">Shadow Map</span>
          </div>
          <button
            onClick={() => navigate('/app')}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            Open App
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto">
          <BlurFade delay={100} inView>
            <AnimatedGradientText className="mb-6">
              <Globe className="mr-1.5 h-3.5 w-3.5" />
              Real-time shadow analysis for Astana & beyond
            </AnimatedGradientText>
          </BlurFade>

          <BlurFade delay={200} inView>
            <h1 className="text-5xl font-bold tracking-tight md:text-7xl lg:text-8xl mb-2 leading-[1.05]">
              <span className="bg-gradient-to-br from-white via-white/90 to-white/50 bg-clip-text text-transparent">
                See the world
              </span>
            </h1>
            <h1 className="text-5xl font-bold tracking-tight md:text-7xl lg:text-8xl leading-[1.05]">
              <span className="bg-gradient-to-r from-[#4fc3f7] via-[#818cf8] to-[#c084fc] bg-clip-text text-transparent">
                in a new light.
              </span>
            </h1>
          </BlurFade>

          <BlurFade delay={350} inView>
            <p className="mt-6 max-w-xl text-lg text-white/50 leading-relaxed">
              Interactive shadow simulation for{' '}
              <WordRotate
                words={['architects', 'urban planners', 'real estate', 'everyone']}
                className="text-white/80 font-medium"
              />
              {'. '}
              Explore sunlight and shadows for any date, any time.
            </p>
          </BlurFade>

          <BlurFade delay={500} inView>
            <div className="mt-10 flex items-center gap-4 flex-wrap justify-center">
              <ShimmerButton
                onClick={() => navigate('/app')}
                className="px-8 py-3.5 text-base font-semibold"
                shimmerColor="#4fc3f7"
                background="linear-gradient(135deg, #0c1a3d 0%, #1a3a70 100%)"
              >
                <Sun className="h-4 w-4 text-[#4fc3f7]" />
                Open Shadow Map
                <ChevronRight className="h-4 w-4 opacity-70" />
              </ShimmerButton>

              <a
                href="#cases"
                className="flex items-center gap-1.5 text-sm text-white/40 transition-colors hover:text-white/70"
              >
                Use cases
                <ChevronRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </BlurFade>

          {/* Stats */}
          <BlurFade delay={650} inView>
            <div className="mt-16 flex items-center gap-8 md:gap-12">
              {STATS.map((stat) => (
                <div key={stat.label} className="flex flex-col items-center gap-1">
                  <span className="text-2xl font-bold text-[#4fc3f7] md:text-3xl">{stat.value}</span>
                  <span className="text-xs text-white/30 uppercase tracking-widest">{stat.label}</span>
                </div>
              ))}
            </div>
          </BlurFade>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30">
          <div className="h-8 w-5 rounded-full border border-white/40 flex items-start justify-center pt-1.5">
            <div className="h-1.5 w-1 rounded-full bg-white animate-[scroll-dot_1.5s_ease-in-out_infinite]" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative px-4 py-24 md:py-32">
        <div className="mx-auto max-w-5xl">
          <BlurFade>
            <div className="mb-16 text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-[#4fc3f7]/70 mb-3">Features</p>
              <h2 className="text-3xl font-bold md:text-4xl">
                <span className="text-white/90">Everything you need to</span>{' '}
                <span className="bg-gradient-to-r from-[#4fc3f7] to-[#818cf8] bg-clip-text text-transparent">
                  understand sunlight
                </span>
              </h2>
            </div>
          </BlurFade>

          <div className="grid gap-5 md:grid-cols-3">
            {FEATURES.map((feature, i) => (
              <BlurFade key={feature.title} delay={i * 100}>
                <div className="group relative flex flex-col gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 backdrop-blur-sm transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.05] overflow-hidden">
                  {/* Glow */}
                  <div className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 h-24 w-24 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"
                    style={{ background: feature.color.replace('text-', '') === 'yellow-400' ? '#facc15' : feature.color.includes('4fc3f7') ? '#4fc3f7' : '#a855f7' }}
                  />
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${feature.bg}`}>
                    <feature.icon className={`h-5 w-5 ${feature.color}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                    <p className="text-sm text-white/40 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* Cases Section */}
      <section id="cases" className="relative px-4 py-24 md:py-32">
        <div className="mx-auto max-w-5xl">
          <BlurFade>
            <div className="mb-16 text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-[#4fc3f7]/70 mb-3">Use Cases</p>
              <h2 className="text-3xl font-bold md:text-4xl">
                <span className="text-white/90">Четыре задачи —</span>{' '}
                <span className="bg-gradient-to-r from-[#69f0ae] to-[#4fc3f7] bg-clip-text text-transparent">
                  одна карта
                </span>
              </h2>
              <p className="mt-4 text-white/40 text-sm max-w-xl mx-auto">
                Каждый кейс использует живую карту теней с инструментами под конкретную задачу
              </p>
            </div>
          </BlurFade>

          <div className="grid gap-4 md:grid-cols-2">
            {CASES.map((c, i) => (
              <BlurFade key={c.id} delay={i * 80}>
                <button
                  onClick={() => navigate(c.path)}
                  className="group relative w-full text-left flex flex-col gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 backdrop-blur-sm transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.05] overflow-hidden cursor-pointer"
                >
                  {/* Corner glow */}
                  <div
                    className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500"
                    style={{ background: c.color }}
                  />

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Icon */}
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-xl ${c.bg}`}>
                        {c.emoji}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-semibold text-white text-[15px]">{c.title}</h3>
                          <span
                            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                            style={{ color: c.color, background: `${c.color}18` }}
                          >
                            {c.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/30 font-normal">{c.titleEn}</p>
                      </div>
                    </div>
                    <ChevronRight
                      className="h-4 w-4 shrink-0 mt-1 transition-transform duration-200 group-hover:translate-x-0.5"
                      style={{ color: c.color, opacity: 0.6 }}
                    />
                  </div>

                  <p className="text-[13px] text-white/50 leading-relaxed">{c.description}</p>

                  {/* Bottom accent bar */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-[2px] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"
                    style={{ background: `linear-gradient(to right, ${c.color}60, transparent)` }}
                  />
                </button>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative px-4 py-24">
        <BlurFade>
          <div className="mx-auto max-w-2xl text-center">
            <div className="relative rounded-3xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-12 overflow-hidden backdrop-blur-sm">
              <GridPattern width={30} height={30} className="opacity-30" />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_100%,rgba(79,195,247,0.08),transparent)]" />
              <div className="relative z-10">
                <MapPin className="mx-auto mb-4 h-8 w-8 text-[#4fc3f7]/60" />
                <h2 className="text-3xl font-bold mb-3 text-white/90">Ready to explore?</h2>
                <p className="text-white/40 mb-8 text-sm">
                  Open the app and start analyzing shadows for any location in Astana.
                </p>
                <ShimmerButton
                  onClick={() => navigate('/app')}
                  className="mx-auto px-8 py-3.5 text-base font-semibold"
                  shimmerColor="#4fc3f7"
                  background="linear-gradient(135deg, #0c1a3d 0%, #1a3a70 100%)"
                >
                  <Sun className="h-4 w-4 text-[#4fc3f7]" />
                  Open Shadow Map
                  <ChevronRight className="h-4 w-4 opacity-70" />
                </ShimmerButton>
              </div>
            </div>
          </div>
        </BlurFade>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.05] px-6 py-8">
        <div className="mx-auto max-w-5xl flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#4fc3f7]/20">
              <Sun className="h-3 w-3 text-[#4fc3f7]" />
            </div>
            <span className="text-sm font-medium text-white/60">Shadow Map</span>
          </div>
          <p className="text-xs text-white/20">
            Powered by shademap.app · OpenStreetMap · MapLibre GL
          </p>
        </div>
      </footer>
    </div>
  );
}
