import { getBackendUrl } from '@/services/backendUrl';

export interface GenerateImageInput {
  prompt: string;
  size?: string;
}

export interface GenerateImageResult {
  imageUrl: string | null;
  promptUsed: string;
}

export async function generateImage(input: GenerateImageInput): Promise<GenerateImageResult> {
  const res = await fetch(`${getBackendUrl()}/ml/text-to-image/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: input.prompt,
      size: input.size ?? '512x512',
    }),
  });

  if (!res.ok) {
    throw new Error(`Image generation failed: ${res.status}`);
  }

  const data = await res.json();
  const first = data.images?.[0];

  return {
    imageUrl: first?.url ?? (first?.b64_json ? `data:image/png;base64,${first.b64_json}` : null),
    promptUsed: data.prompt_used ?? input.prompt,
  };
}
