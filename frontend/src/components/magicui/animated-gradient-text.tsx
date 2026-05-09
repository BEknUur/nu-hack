import { cn } from '@/lib/utils';
import React from 'react';

interface AnimatedGradientTextProps {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedGradientText({ children, className }: AnimatedGradientTextProps) {
  return (
    <div
      className={cn(
        'group relative inline-flex items-center justify-center rounded-full px-4 py-1.5 text-sm',
        'border border-white/10 bg-white/5 backdrop-blur-sm',
        'transition-all duration-300 hover:border-white/20 hover:bg-white/10',
        className,
      )}
    >
      <span className="animated-gradient-span bg-gradient-to-r from-[#4fc3f7] via-[#7c3aed] to-[#4fc3f7] bg-[length:200%_auto] bg-clip-text text-transparent animate-[gradient-shift_3s_linear_infinite]">
        {children}
      </span>
    </div>
  );
}
