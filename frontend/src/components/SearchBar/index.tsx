import { useEffect, useRef, useState } from 'react';
import type { GeocodingResult } from '@/services/geocoding';
import { useGeocoding } from '@/hooks/useGeocoding';

interface SearchBarProps {
  onSelect: (result: GeocodingResult) => void;
}

export default function SearchBar({ onSelect }: SearchBarProps) {
  const { query, setQuery, results, loading, clear } = useGeocoding();
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const open = focused && results.length > 0;
  const currentActiveIndex = activeIndex >= results.length ? -1 : activeIndex;

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSelect(result: GeocodingResult) {
    onSelect(result);
    clear();
    setFocused(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && currentActiveIndex >= 0) {
      e.preventDefault();
      handleSelect(results[currentActiveIndex]);
    } else if (e.key === 'Escape') {
      setFocused(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    }
  }

  // Shorten long display names: keep first two parts
  function formatName(displayName: string): { main: string; sub: string } {
    const parts = displayName.split(', ');
    return {
      main: parts[0],
      sub: parts.slice(1, 3).join(', '),
    };
  }

  return (
    <div
      ref={wrapperRef}
      className="absolute top-4 left-4 z-[1000] w-[300px] font-sans"
    >
      {/* Input */}
      <div className="flex items-center gap-2 bg-[rgba(8,12,28,0.9)] backdrop-blur-[16px] border border-white/[0.08] rounded-2xl px-3 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
        {/* Search icon */}
        <svg
          className="w-4 h-4 text-white/40 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(-1);
            setFocused(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          placeholder="Search location…"
          className="flex-1 bg-transparent text-[13px] text-white placeholder-white/30 outline-none"
        />

        {/* Loading spinner */}
        {loading && (
          <svg
            className="w-4 h-4 text-[#4fc3f7] shrink-0 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        )}

        {/* Clear button */}
        {query && !loading && (
          <button
            onClick={() => { clear(); inputRef.current?.focus(); }}
            className="text-white/30 hover:text-white/70 transition-colors text-base leading-none"
          >
            ×
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <ul className="mt-1.5 bg-[rgba(8,12,28,0.95)] backdrop-blur-[16px] border border-white/[0.08] rounded-xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
          {results.map((result, idx) => {
            const { main, sub } = formatName(result.displayName);
            const isActive = idx === currentActiveIndex;

            return (
              <li key={result.id}>
                <button
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`w-full text-left px-4 py-2.5 transition-colors ${
                    isActive ? 'bg-white/[0.08]' : 'hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="text-[13px] text-white font-medium truncate">{main}</div>
                  {sub && (
                    <div className="text-[11px] text-white/40 truncate mt-0.5">{sub}</div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
