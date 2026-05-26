import { getBackendUrl } from '@/services/backendUrl';

export interface MapContext {
    lat?: number;
    lng?: number;
    zoom?: number;
    date?: string;
    time?: string;
    mode?: string;
    selectedBuilding?: unknown;
    sunExposure?: boolean;
}

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface ChatResponse {
    response: string;
    suggestions: string[];
}

export interface TranscribeResponse {
    text: string;
    language: string;
}

export async function sendMessage(
    messages: ChatMessage[],
    context?: MapContext,
    language?: string,
): Promise<ChatResponse> {
    const res = await fetch(`${getBackendUrl()}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, context, language }),
    });

    if (!res.ok) {
        throw new Error(`Chat message failed: ${res.status}`);
    }

    return res.json() as Promise<ChatResponse>;
}

export async function streamMessage(
    messages: ChatMessage[],
    context?: MapContext,
    language?: string,
): Promise<Response> {
    const res = await fetch(`${getBackendUrl()}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, context, language }),
    });

    if (!res.ok) {
        throw new Error(`Chat stream failed: ${res.status}`);
    }

    return res;
}

export async function transcribeAudio(
    audioBlob: Blob,
    language?: string,
): Promise<TranscribeResponse> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');
    if (language) {
        formData.append('language', language);
    }

    const res = await fetch(`${getBackendUrl()}/voice/transcribe`, {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) {
        throw new Error(`Audio transcription failed: ${res.status}`);
    }

    return res.json() as Promise<TranscribeResponse>;
}
