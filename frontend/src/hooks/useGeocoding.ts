import { useEffect, useRef, useState } from 'react';
import { searchLocation, type GeocodingResult } from '@/services/geocoding';
import { useTranslation } from '@/i18n';

const DEBOUNCE_MS = 400;

export interface UseGeocodingReturn {
  query: string;
  setQuery: (v: string) => void;
  results: GeocodingResult[];
  loading: boolean;
  clear: () => void;
}

export function useGeocoding(): UseGeocodingReturn {
  const { language } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    timerRef.current = setTimeout(async () => {
      try {
        const data = await searchLocation(query);
        setResults(data);
      } catch (err) {
        console.error('Geocoding error:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, language]);

  function clear() {
    setQuery('');
    setResults([]);
    setLoading(false);
  }

  return { query, setQuery, results, loading, clear };
}
