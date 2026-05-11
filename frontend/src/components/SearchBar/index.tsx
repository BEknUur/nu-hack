import type { KeyboardEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { MapPinned, Search, X } from 'lucide-react';
import type { GeocodingResult } from '@/services/geocoding';
import { useGeocoding } from '@/hooks/useGeocoding';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  onSelect: (result: GeocodingResult) => void;
}

export default function SearchBar({ onSelect }: SearchBarProps) {
  const { query, setQuery, results, loading, clear } = useGeocoding();
  const { messages } = useTranslation();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setOpen(results.length > 0);
    setActiveIndex(-1);
  }, [results]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSelect(result: GeocodingResult) {
    onSelect(result);
    clear();
    setOpen(false);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(results[activeIndex]);
      return;
    }

    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  function formatName(displayName: string) {
    const parts = displayName.split(', ');

    return {
      main: parts[0],
      sub: parts.slice(1, 3).join(', '),
    };
  }

  return (
    <div
      ref={wrapperRef}
      className="absolute left-4 top-4 z-[1000] w-[min(380px,calc(100vw-2rem))]"
    >
      <div className="map-panel rounded-xl p-3">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="ui-mono text-[11px] text-[var(--ink-soft)]">{messages.map.searchTag}</div>
            <div className="mt-1 text-lg font-semibold tracking-[-0.04em]">{messages.map.searchTitle}</div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <div className="map-chip flex h-10 w-10 items-center justify-center rounded-lg">
              <MapPinned className="h-4 w-4 text-[var(--blue-strong)]" />
            </div>
          </div>
        </div>

        <div className="map-input flex items-center gap-2 rounded-lg px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-[var(--ink-soft)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder={messages.map.searchPlaceholder}
            className="w-full bg-transparent text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-soft)]"
          />

          {loading && (
            <div className="ui-mono text-[11px] text-[var(--blue-strong)]">
              {messages.map.searching}
            </div>
          )}

          {query && !loading && (
            <button
              onClick={() => {
                clear();
                inputRef.current?.focus();
              }}
              className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--ink-soft)] transition-colors hover:bg-[rgba(31,79,156,0.08)] hover:text-[var(--ink)]"
              aria-label={messages.map.clearSearchAria}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {open && (
        <ul className="map-panel mt-2 overflow-hidden rounded-xl p-1.5">
          {results.map((result, index) => {
            const { main, sub } = formatName(result.displayName);
            const isActive = index === activeIndex;

            return (
              <li key={result.id}>
                <button
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    'w-full rounded-lg px-3 py-3 text-left transition-colors',
                    isActive ? 'bg-[rgba(31,79,156,0.1)]' : 'hover:bg-[rgba(31,79,156,0.06)]',
                  )}
                >
                  <div className="text-sm font-medium text-[var(--ink)]">{main}</div>
                  {sub && (
                    <div className="mt-1 text-sm text-[var(--ink-soft)]">{sub}</div>
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
