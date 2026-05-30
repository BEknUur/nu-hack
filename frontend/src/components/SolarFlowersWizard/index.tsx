import { motion } from 'framer-motion';
import { Sun } from 'lucide-react';
import type {
  SolarCandidate,
  SolarDrawMode,
  SolarOptimizationTarget,
  SolarPanelType,
  SolarWizardStep,
} from '@/types/solar-flowers';
import { SOLAR_WIZARD_COPY } from '@/components/SolarFlowersWizard/copy';

export interface SolarFlowersWizardProps {
  step: SolarWizardStep;
  drawMode: SolarDrawMode;
  drawingInProgress: boolean;
  hasArea: boolean;
  areaKm2: number | null;
  panelType: SolarPanelType;
  target: SolarOptimizationTarget;
  topK: number;
  showPoints: boolean;
  loading: boolean;
  error: string | null;
  candidates: SolarCandidate[];
  selectedCandidate: SolarCandidate | null;
  language: 'ru' | 'kk' | 'en';

  onDrawModeChange: (mode: SolarDrawMode) => void;
  onStartDrawing: () => void;
  onCancelDrawing: () => void;
  onContinueToSettings: () => void;
  onClearArea: () => void;
  onPanelTypeChange: (type: SolarPanelType) => void;
  onTargetChange: (target: SolarOptimizationTarget) => void;
  onTopKChange: (topK: number) => void;
  onTogglePoints: () => void;
  onRunRanking: () => void;
  onBackToShape: () => void;
  onCloseCandidate: () => void;
}

const COMING_SOON_COPY = {
  en: {
    tagline: 'We\'re actively developing this feature. Check back soon.',
  },
  ru: {
    tagline: 'Мы активно работаем над этой функцией. Следите за обновлениями.',
  },
  kk: {
    tagline: 'Біз бұл мүмкіндікті белсенді дамытамыз. Жаңартуларды күтіңіз.',
  },
};

export default function SolarFlowersWizard({ language }: SolarFlowersWizardProps) {
  const copy = SOLAR_WIZARD_COPY[language] ?? SOLAR_WIZARD_COPY.en;

  return (
    <aside className="map-panel absolute right-4 top-[4.5rem] z-[1100] hidden w-[288px] max-w-[calc(100vw-2rem)] rounded-lg overflow-hidden md:top-4 md:block text-[var(--ink)]">
      {/* Header stripe */}
      <div className="px-5 pt-4 pb-3 border-b border-[var(--line)] flex items-center justify-between">
        <span
          className="text-[10px] font-semibold tracking-widest uppercase text-[var(--ink-soft)]"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          {copy.tag}
        </span>
        <span
          className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full"
          style={{
            fontFamily: "'Space Mono', monospace",
            background: 'rgba(240,194,76,0.18)',
            color: 'var(--yellow-strong)',
          }}
        >
          BETA
        </span>
      </div>

      {/* Body */}
      <div className="px-5 pt-5 pb-6 flex flex-col items-center gap-4">
        {/* Animated sun */}
        <motion.div
          className="relative flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Glow ring */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 72,
              height: 72,
              background: 'radial-gradient(circle, rgba(240,194,76,0.28) 0%, transparent 70%)',
            }}
            animate={{ scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
          />
          <div
            className="relative z-10 flex items-center justify-center w-14 h-14 rounded-full"
            style={{ background: 'rgba(240,194,76,0.12)', border: '1.5px solid rgba(240,194,76,0.35)' }}
          >
            <Sun
              size={28}
              strokeWidth={1.8}
              style={{ color: 'var(--yellow-strong)' }}
            />
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
        >
          <h2
            className="text-[13px] font-bold leading-tight text-[var(--ink)] mb-0.5"
            style={{ fontFamily: "'Unbounded', sans-serif" }}
          >
            {copy.title}
          </h2>
        </motion.div>

        {/* Trilingual "Coming Soon" stack */}
        <motion.div
          className="w-full rounded-xl px-4 py-3.5 flex flex-col gap-1"
          style={{
            background: 'rgba(240,194,76,0.07)',
            border: '1px solid rgba(240,194,76,0.22)',
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
        >
          {[
            { lang: 'Скоро', sub: 'RU' },
            { lang: 'Жақында', sub: 'KK' },
            { lang: 'Coming Soon', sub: 'EN' },
          ].map((item, i) => (
            <motion.div
              key={item.sub}
              className="flex items-baseline justify-between"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
            >
              <span
                className="text-[15px] font-bold leading-snug"
                style={{
                  fontFamily: "'Unbounded', sans-serif",
                  color: 'var(--yellow-strong)',
                  letterSpacing: '-0.01em',
                }}
              >
                {item.lang}
              </span>
              <span
                className="text-[9px] font-semibold tracking-widest opacity-50"
                style={{ fontFamily: "'Space Mono', monospace", color: 'var(--ink-soft)' }}
              >
                {item.sub}
              </span>
            </motion.div>
          ))}
        </motion.div>

        {/* Tagline for current language */}
        <motion.p
          className="text-center text-[11.5px] leading-relaxed"
          style={{ color: 'var(--ink-soft)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.5 }}
        >
          {COMING_SOON_COPY[language]?.tagline ?? COMING_SOON_COPY.en.tagline}
        </motion.p>

        {/* Animated progress dots */}
        <motion.div
          className="flex items-center gap-1.5 pt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65, duration: 0.4 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="block rounded-full"
              style={{ width: 6, height: 6, background: 'var(--yellow)' }}
              animate={{ opacity: [0.25, 1, 0.25], scale: [0.8, 1.15, 0.8] }}
              transition={{
                repeat: Infinity,
                duration: 1.6,
                delay: i * 0.28,
                ease: 'easeInOut',
              }}
            />
          ))}
        </motion.div>
      </div>
    </aside>
  );
}
