import { useState } from 'react';
import { generateImage } from '@/services/textToImage';

export interface MapContext {
  scenario?: string;
  address?: string;
  complexName?: string;
  bestSide?: string;
  confidence?: number;
  inSun?: boolean | null;
  lat?: number;
  lng?: number;
  photoPlaceName?: string;
}

const PROMPTS: Record<string, string[]> = {
  apartments: [
    'Modern luxury apartment building in Astana with large windows facing south, warm golden sunlight flooding the facade, Baiterek tower in background, photorealistic architectural visualization',
    'Aerial view of a residential complex in Astana left bank, morning sun casting long shadows between buildings, blue sky, urban photography',
    'Cozy apartment interior with floor-to-ceiling windows, warm sunlight streaming in, view of Astana skyline, modern minimalist design, architectural digest style',
    'Modern glass residential tower in Astana reflecting golden sunset, snow on ground, dramatic sky, professional real estate photography',
    'Family enjoying sunlit living room in new Astana apartment, south-facing windows, warm natural light, lifestyle photography',
    'Penthouse terrace overlooking Astana with panoramic views, golden hour, modern furniture, luxury real estate visualization',
    'New residential district in Astana with wide boulevards, buildings oriented for maximum sun exposure, aerial drone photography, summer day',
    'Comparison split image: same apartment in sunlight vs shadow, showing importance of building orientation, architectural infographic style',
    'Modern apartment balcony in Astana with morning coffee setup, warm sunrise light, city view, lifestyle photography',
    'Winter in Astana, south-facing apartment building receiving maximum low-angle sunlight, frosted windows, cozy warm glow from inside',
  ],
  trees: [
    'Newly planted birch trees along a modern boulevard in Astana, dappled sunlight through leaves, summer day, urban landscape photography',
    'Before and after: barren Astana street transformed with mature elm trees providing shade, split comparison, urban planning visualization',
    'Aerial view of Astana green belt project, rows of young trees stretching into the steppe, drone photography, environmental restoration',
    'Children playing under shady linden trees in Astana park, summer afternoon, filtered golden sunlight, lifestyle photography',
    'Winter scene in Astana, deciduous trees without leaves allowing sunlight to reach buildings, while evergreen pines provide windbreak, nature photography',
    'Tree-lined walking path in Astana with benches in shade, cyclists and pedestrians, summer golden hour, urban lifestyle',
    'Close-up of Siberian elm tree trunk with Astana skyline in background, wide angle, professional nature photography',
    'Urban heat island visualization: thermal view showing cool tree-shaded areas vs hot concrete, scientific infographic style',
    'Astana boulevard with mature poplars creating natural wind corridor, leaves blowing in steppe wind, dynamic urban photography',
    'Spring in Astana, newly planted saplings with protective guards along a residential street, community volunteers, documentary style',
  ],
  workers: [
    'Construction workers taking a break in shaded area of building site in Astana, hot summer day, safety equipment visible, documentary photography',
    'Aerial view of construction site in Astana with marked sun and shade zones, workers visible, safety planning visualization',
    'Construction crew rotating between sunny and shaded work zones on Astana building site, hard hats and safety vests, reportage style',
    'Worker drinking water at cooling station on Astana construction site, thermometer showing 35°C, occupational safety photography',
    'Split view: construction site at noon with harsh shadows vs evening with long shadows, worker scheduling visualization',
    'Modern smart construction site in Astana with digital shade mapping overlay, workers following optimal rotation schedule, tech visualization',
    'Winter construction in Astana at -25°C, workers in heavy gear near warming station, frost visible, harsh conditions documentary',
    'Foreman checking tablet with shadow map app on Astana construction site, buildings rising in background, technology meets construction',
    'Group of workers gathered under temporary shade structure on Astana site, lunch break, summer heat visible in air shimmer',
    'Time-lapse composite showing shadow movement across construction site throughout the day, workers positioned in optimal zones',
  ],
  'solar-flowers': [
    'Modern solar panel array installed on rooftop in Astana, Baiterek tower in background, clean energy visualization, architectural photography',
    'Ground-mounted solar farm on Astana outskirts, rows of panels angled toward winter sun, steppe landscape, drone photography',
    'Solar flower tracker following the sun in Astana tech park, futuristic design, blue sky with scattered clouds, product photography',
    'Split comparison: optimal vs suboptimal solar panel placement, one in full sun vs one partially shaded by building, educational infographic',
    'Residential rooftop in Astana with solar panels, happy family below, energy meter showing savings, lifestyle sustainability photography',
    'Solar panels covered in light snow in Astana winter, still generating power from low-angle sun, resilience visualization',
    'Massive solar installation near EXPO district in Astana, reflecting golden sunset, renewable energy landmark, cinematic photography',
    'Close-up of solar panel cells with Astana reflection, water droplets, morning dew, macro photography meets urban landscape',
    'Before and after: empty Astana parking lot transformed into solar canopy, cars parked in shade below, urban planning visualization',
    'Aerial view of solar panels arranged in artistic pattern on Astana building roof, geometric design, drone photography, modern architecture',
  ],
};

function pickRandomPrompt(scenario?: string): string {
  const pool = PROMPTS[scenario ?? ''] ?? PROMPTS.apartments;
  return pool[Math.floor(Math.random() * pool.length)];
}

interface ImageGeneratorProps {
  mapContext?: MapContext;
}

export function ImageGenerator({ mapContext }: ImageGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    const prompt = pickRandomPrompt(mapContext?.scenario);
    setLoading(true);
    setError(null);
    setImageUrl(null);
    try {
      const result = await generateImage({ prompt });
      setImageUrl(result.imageUrl);
    } catch {
      setError('Failed to generate. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClickGenerate = () => {
    setOpen(true);
    void handleGenerate();
  };

  if (!open) {
    return (
      <button
        onClick={handleClickGenerate}
        disabled={loading}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[color:var(--line)] bg-white/80 px-3 py-2.5 text-[13px] font-medium text-[var(--ink)] transition-colors hover:bg-white disabled:opacity-50"
      >
        <span className="text-base">✦</span>
        {loading ? 'Generating...' : 'Visualize'}
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-2.5 rounded-lg border border-[color:var(--line)] bg-white/80 p-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--ink)]">
          <span>✦</span> Visualize
        </span>
        <button
          onClick={() => { setOpen(false); setImageUrl(null); setError(null); }}
          className="text-lg leading-none text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
        >
          ×
        </button>
      </div>

      {loading && (
        <div className="flex h-48 w-full items-center justify-center rounded-lg border border-[color:var(--line)] bg-white animate-pulse">
          <span className="text-[11px] text-[var(--ink-soft)]">Generating image...</span>
        </div>
      )}

      {error && (
        <div className="space-y-2">
          <p className="text-[12px] text-red-600">{error}</p>
          <button
            onClick={handleGenerate}
            className="w-full rounded-lg border border-[color:var(--line)] px-3 py-2 text-[12px] font-medium text-[var(--ink)] hover:bg-white transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {imageUrl && !loading && (
        <div className="relative overflow-hidden rounded-lg border border-[color:var(--line)] bg-white">
          <img src={imageUrl} alt="Generated visualization" className="w-full object-contain" />
          <div className="absolute bottom-2 right-2 flex gap-1.5">
            <button
              onClick={handleGenerate}
              className="rounded-lg border border-[color:var(--line)] bg-white/90 px-2.5 py-1.5 text-[11px] text-[var(--ink)] transition-colors hover:bg-white"
            >
              Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
