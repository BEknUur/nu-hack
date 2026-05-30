import { motion } from 'framer-motion';
import { ScenarioModeNavBar } from '@/components/ScenarioModeNavBar';
import { useTranslation } from '@/i18n';

export default function SolarComingSoonPage() {
  const { messages } = useTranslation();
  const c = messages.solarComingSoon;

  return (
    <div
      className="relative flex flex-col min-h-screen w-full overflow-hidden"
      style={{ background: '#0d1117' }}
    >
      {/* Background glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 55% 45% at 50% 55%, rgba(240,194,76,0.06) 0%, transparent 70%)',
        }}
      />

      {/* Nav */}
      <header className="relative z-10 flex items-center justify-center pt-5 pb-4">
        <ScenarioModeNavBar active="solar-flowers" className="pointer-events-auto" />
      </header>

      {/* Main content */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center gap-8">

        {/* Rotating sun rays */}
        <motion.div
          className="absolute pointer-events-none"
          style={{ width: 480, height: 480, top: '50%', left: '50%', x: '-50%', y: '-50%' }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 70, ease: 'linear' }}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2"
              style={{
                width: 1,
                height: 100,
                marginLeft: -0.5,
                transformOrigin: '50% 240px',
                transform: `rotate(${i * 30}deg)`,
                background: 'linear-gradient(to top, rgba(240,194,76,0.15), transparent)',
                borderRadius: 1,
              }}
            />
          ))}
        </motion.div>

        {/* Sun icon */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex items-center justify-center"
        >
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 130,
              height: 130,
              background: 'radial-gradient(circle, rgba(240,194,76,0.2) 0%, transparent 70%)',
            }}
            animate={{ scale: [1, 1.35, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut' }}
          />
          <div
            className="relative z-10 flex items-center justify-center w-16 h-16 rounded-full"
            style={{
              background: 'rgba(240,194,76,0.09)',
              border: '1.5px solid rgba(240,194,76,0.28)',
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#c68a11" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <line x1="12" y1="2" x2="12" y2="5" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
              <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
              <line x1="2" y1="12" x2="5" y2="12" />
              <line x1="19" y1="12" x2="22" y2="12" />
              <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
              <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
            </svg>
          </div>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-[11px] tracking-[0.22em] uppercase"
          style={{
            fontFamily: "'Space Mono', monospace",
            color: 'rgba(255,255,255,0.28)',
          }}
        >
          {c.subtitle}
        </motion.p>

        {/* Main headline */}
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        >
          <span
            className="font-display font-light tracking-[-0.04em] leading-[0.88] text-white"
            style={{ fontSize: 'clamp(3.4rem, 9.5vw, 7.5rem)' }}
          >
            {c.line1}
          </span>
          {c.line2 && (
            <span
              className="font-display font-light tracking-[-0.04em] leading-[0.88]"
              style={{ fontSize: 'clamp(3.4rem, 9.5vw, 7.5rem)', color: '#f0c24c' }}
            >
              {c.line2}
            </span>
          )}
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="font-display font-light tracking-[-0.02em]"
          style={{
            fontSize: 'clamp(1rem, 2.5vw, 1.35rem)',
            color: 'rgba(240,194,76,0.45)',
          }}
        >
          {c.tagline}
        </motion.p>

        {/* Animated dots */}
        <motion.div
          className="flex items-center gap-2 pt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="block rounded-full"
              style={{ width: 5, height: 5, background: '#f0c24c' }}
              animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
              transition={{ repeat: Infinity, duration: 1.8, delay: i * 0.3, ease: 'easeInOut' }}
            />
          ))}
        </motion.div>
      </main>
    </div>
  );
}
