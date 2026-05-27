import { useState } from 'react';
import { generateImage } from '@/services/textToImage';

interface ImageGeneratorProps {
  defaultPrompt?: string;
}

export function ImageGenerator({ defaultPrompt = '' }: ImageGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setImageUrl(null);
    try {
      const result = await generateImage({ prompt: prompt.trim() });
      setImageUrl(result.imageUrl);
    } catch {
      setError('Failed to generate. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[color:var(--line)] bg-white/80 px-3 py-2.5 text-[13px] font-medium text-[var(--ink)] transition-colors hover:bg-white"
      >
        <span className="text-base">✦</span>
        Visualize
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

      <textarea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder="Describe what you want to see..."
        rows={3}
        className="w-full resize-none rounded-md border border-[color:var(--line)] bg-white px-3 py-2 text-[13px] text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:border-[color:var(--line-strong)] focus:outline-none transition-colors"
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
      />

      <button
        onClick={handleGenerate}
        disabled={loading || !prompt.trim()}
        className="w-full rounded-md border border-[color:var(--line)] bg-[var(--yellow-soft)] px-3 py-2 text-[13px] font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--yellow)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Generating...' : 'Generate'}
      </button>

      {loading && (
        <div className="flex aspect-square w-full items-center justify-center rounded-md border border-[color:var(--line)] bg-white animate-pulse">
          <span className="text-[11px] text-[var(--ink-soft)]">Generating image...</span>
        </div>
      )}

      {error && <p className="text-[12px] text-red-600">{error}</p>}

      {imageUrl && !loading && (
        <div className="relative overflow-hidden rounded-md border border-[color:var(--line)] bg-white">
          <img src={imageUrl} alt="Generated visualization" className="max-h-[60vh] w-full object-contain" />
          <a
            href={imageUrl}
            download="visualization.png"
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-2 right-2 rounded-md border border-[color:var(--line)] bg-white/90 px-2.5 py-1.5 text-[11px] text-[var(--ink)] transition-colors hover:bg-white"
          >
            Save
          </a>
        </div>
      )}
    </div>
  );
}
