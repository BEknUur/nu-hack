import { useCallback, useRef, useState } from 'react';

import type { ChatMessage, MapContext } from '@/services/chat';
import {
    sendMessage as sendChatMessage,
    transcribeAudio,
} from '@/services/chat';

export type { ChatMessage, MapContext } from '@/services/chat';

async function blobToWav(blob: Blob): Promise<Blob> {
    const arrayBuffer = await blob.arrayBuffer();
    const audioCtx = new AudioContext({ sampleRate: 16000 });
    const decoded = await audioCtx.decodeAudioData(arrayBuffer);
    const samples = decoded.getChannelData(0);

    const numSamples = samples.length;
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    const writeStr = (offset: number, s: string) => {
        for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
    };

    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 16000, true);
    view.setUint32(28, 32000, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    for (let i = 0; i < numSamples; i++) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    await audioCtx.close();
    return new Blob([buffer], { type: 'audio/wav' });
}

export interface UseChatOptions {
    language: string;
}

export interface UseChatReturn {
    messages: ChatMessage[];
    isLoading: boolean;
    isRecording: boolean;
    isTranscribing: boolean;
    suggestions: string[];
    sendMessage: (text: string, context?: MapContext) => Promise<void>;
    startRecording: () => void;
    stopRecording: () => Promise<void>;
    clearMessages: () => void;
}

export function useChat({ language }: UseChatOptions): UseChatReturn {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const contextRef = useRef<MapContext | undefined>(undefined);

    const sendMessage = useCallback(
        async (text: string, context?: MapContext) => {
            const userMessage: ChatMessage = { role: 'user', content: text };
            const updatedMessages = [...messages, userMessage];

            setMessages(updatedMessages);
            setIsLoading(true);
            contextRef.current = context;

            try {
                const response = await sendChatMessage(updatedMessages, context, language);
                const assistantMessage: ChatMessage = {
                    role: 'assistant',
                    content: response.response,
                };
                setMessages((prev) => [...prev, assistantMessage]);
                setSuggestions(response.suggestions);
            } catch (error) {
                console.error('Failed to send chat message:', error);
                const errorMessage: ChatMessage = {
                    role: 'assistant',
                    content: 'Sorry, something went wrong. Please try again.',
                };
                setMessages((prev) => [...prev, errorMessage]);
                setSuggestions([]);
            } finally {
                setIsLoading(false);
            }
        },
        [messages, language],
    );

    const startRecording = useCallback(() => {
        navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then((stream) => {
                const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                mediaRecorderRef.current = mediaRecorder;
                chunksRef.current = [];

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        chunksRef.current.push(event.data);
                    }
                };

                mediaRecorder.start();
                setIsRecording(true);
            })
            .catch((error) => {
                console.error('Failed to start recording:', error);
            });
    }, []);

    const stopRecording = useCallback(async () => {
        const mediaRecorder = mediaRecorderRef.current;
        if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

        const blob = await new Promise<Blob>((resolve) => {
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
                chunksRef.current = [];
                resolve(audioBlob);
            };
            mediaRecorder.stop();
        });

        mediaRecorder.stream.getTracks().forEach((track) => track.stop());
        mediaRecorderRef.current = null;
        setIsRecording(false);

        if (blob.size === 0) return;

        setIsTranscribing(true);
        try {
            const wavBlob = await blobToWav(blob);
            const result = await transcribeAudio(wavBlob, language);
            if (result.text.trim()) {
                await sendMessage(result.text.trim(), contextRef.current);
            }
        } catch (error) {
            console.error('Failed to transcribe audio:', error);
        } finally {
            setIsTranscribing(false);
        }
    }, [language, sendMessage]);

    const clearMessages = useCallback(() => {
        setMessages([]);
        setSuggestions([]);
    }, []);

    return {
        messages,
        isLoading,
        isRecording,
        isTranscribing,
        suggestions,
        sendMessage,
        startRecording,
        stopRecording,
        clearMessages,
    };
}
