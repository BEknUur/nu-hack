import { cn } from '@/lib/utils';
import React from 'react';

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
  children: React.ReactNode;
}

export function ShimmerButton({
  shimmerColor = '#4fc3f7',
  shimmerSize = '0.1em',
  borderRadius = '100px',
  shimmerDuration = '2s',
  background = 'linear-gradient(135deg, #0f1f3d, #1a3a6e)',
  className,
  children,
  style,
  ...props
}: ShimmerButtonProps) {
  return (
    <button
      style={
        {
          '--shimmer-color': shimmerColor,
          '--shimmer-size': shimmerSize,
          '--border-radius': borderRadius,
          '--shimmer-duration': shimmerDuration,
          '--background': background,
          borderRadius,
          ...style,
        } as React.CSSProperties
      }
      className={cn(
        'group relative z-0 flex cursor-pointer items-center justify-center gap-2 overflow-hidden whitespace-nowrap border border-white/10 px-7 py-3 text-white',
        'transform-gpu transition-transform duration-300 ease-in-out active:translate-y-px',
        className,
      )}
      {...props}
    >
      {/* Shimmer layer */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ borderRadius: 'inherit' }}
      >
        <div
          className="shimmer-effect absolute inset-[-100%] animate-shimmer"
          style={{
            background: `conic-gradient(from 0deg, transparent 0deg, ${shimmerColor} 10deg, transparent 40deg)`,
          }}
        />
      </div>

      {/* Background */}
      <div
        className="absolute inset-[1px] z-10"
        style={{
          borderRadius: `calc(var(--border-radius) - 1px)`,
          background: 'var(--background)',
        }}
      />

      {/* Content */}
      <span className="relative z-20 flex items-center gap-2 font-medium">
        {children}
      </span>
    </button>
  );
}
