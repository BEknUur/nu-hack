import { motion } from 'framer-motion';

interface HandWrittenTitleProps {
    title?: string;
    subtitle?: string;
}

export function HandWrittenTitle({
    title = 'Kolenke',
    subtitle,
}: HandWrittenTitleProps) {
    const draw = {
        hidden: { pathLength: 0, opacity: 0 },
        visible: {
            pathLength: 1,
            opacity: 1,
            transition: {
                pathLength: { duration: 2.5, ease: [0.43, 0.13, 0.23, 0.96] as [number, number, number, number] },
                opacity: { duration: 0.5 },
            },
        },
    };

    return (
        <div className="relative w-full max-w-4xl mx-auto py-16">
            <div className="absolute inset-0">
                <motion.svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 1200 400"
                    initial="hidden"
                    animate="visible"
                    className="w-full h-full"
                >
                    <motion.path
                        d="M 950 60
                           C 1250 200, 1050 320, 600 350
                           C 250 350, 150 320, 150 200
                           C 150 80, 350 50, 600 50
                           C 850 50, 950 120, 950 120"
                        fill="none"
                        strokeWidth="8"
                        stroke="#f0c24c"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        variants={draw}
                        style={{ opacity: 0.18 }}
                    />
                </motion.svg>
            </div>
            <div className="relative z-10 flex flex-col items-center justify-center text-center">
                <motion.h2
                    className="font-display text-4xl md:text-[3.5rem] font-light tracking-[-0.04em] text-white leading-[1.02]"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                >
                    {title}
                </motion.h2>
                {subtitle && (
                    <motion.p
                        className="mt-3 text-sm text-white/40 max-w-sm leading-relaxed"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1, duration: 0.8 }}
                    >
                        {subtitle}
                    </motion.p>
                )}
            </div>
        </div>
    );
}
