import { useState, useRef, useEffect, useCallback, type ComponentPropsWithoutRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { PromptBox } from '@/components/ui/chatgpt-prompt-input';
import { X, MessageCircle } from 'lucide-react';

/* ─────────────────────────────── types ─────────────────────────────── */

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  suggestions: string[];
  isLoading: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  onSendMessage: (text: string) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onSuggestionClick: (suggestion: string) => void;
  language: string;
}

/* ─────────────────────────── i18n ──────────────────────────────────── */

const I18N = {
  en: {
    tag: 'AI assistant',
    title: 'Sun Advisor',
    placeholder: 'Ask about sun, shadows\u2026',
    welcome: 'Ask me about sunlight, shadows, buildings, or urban planning.',
    welcomeTitle: 'Hello!',
    recording: 'Listening\u2026',
    transcribing: 'Processing\u2026',
    starters: [
      'Sun hours for this area?',
      'Best side for panels?',
      'Safe to work outside?',
    ],
  },
  ru: {
    tag: '\u0418\u0418-\u0430\u0441\u0441\u0438\u0441\u0442\u0435\u043d\u0442',
    title: 'Sun Advisor',
    placeholder: '\u0421\u043f\u0440\u043e\u0441\u0438\u0442\u0435 \u043e \u0441\u043e\u043b\u043d\u0446\u0435, \u0442\u0435\u043d\u044f\u0445\u2026',
    welcome: '\u041f\u043e\u043c\u043e\u0433\u0443 \u0441 \u0430\u043d\u0430\u043b\u0438\u0437\u043e\u043c \u043e\u0441\u0432\u0435\u0449\u0451\u043d\u043d\u043e\u0441\u0442\u0438, \u0437\u0434\u0430\u043d\u0438\u0439 \u0438 \u0433\u043e\u0440\u043e\u0434\u0441\u043a\u043e\u0433\u043e \u043f\u043b\u0430\u043d\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u044f.',
    welcomeTitle: '\u041f\u0440\u0438\u0432\u0435\u0442!',
    recording: '\u0421\u043b\u0443\u0448\u0430\u044e\u2026',
    transcribing: '\u041e\u0431\u0440\u0430\u0431\u043e\u0442\u043a\u0430\u2026',
    starters: [
      '\u0421\u043a\u043e\u043b\u044c\u043a\u043e \u0441\u043e\u043b\u043d\u0446\u0430 \u0437\u0434\u0435\u0441\u044c?',
      '\u041b\u0443\u0447\u0448\u0430\u044f \u0441\u0442\u043e\u0440\u043e\u043d\u0430 \u0434\u043b\u044f \u043f\u0430\u043d\u0435\u043b\u0435\u0439?',
      '\u0411\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e \u0440\u0430\u0431\u043e\u0442\u0430\u0442\u044c \u0441\u0435\u0439\u0447\u0430\u0441?',
    ],
  },
  kk: {
    tag: 'AI \u043a\u0435\u04a3\u0435\u0441\u0448\u0456',
    title: 'Sun Advisor',
    placeholder: '\u041a\u04af\u043d, \u043a\u04e9\u043b\u0435\u04a3\u043a\u0435 \u0442\u0443\u0440\u0430\u043b\u044b \u0441\u04b1\u0440\u0430\u04a3\u044b\u0437\u2026',
    welcome: '\u0416\u0430\u0440\u044b\u049b, \u0493\u0438\u043c\u0430\u0440\u0430\u0442 \u0431\u0430\u0493\u0434\u0430\u0440\u044b, \u049b\u0430\u043b\u0430 \u0436\u043e\u0441\u043f\u0430\u0440\u043b\u0430\u0443 \u0431\u043e\u0439\u044b\u043d\u0448\u0430 \u043a\u04e9\u043c\u0435\u043a\u0442\u0435\u0441\u0435\u043c\u0456\u043d.',
    welcomeTitle: '\u0421\u04d9\u043b\u0435\u043c!',
    recording: '\u0422\u044b\u04a3\u0434\u0430\u0443\u2026',
    transcribing: '\u04e8\u04a3\u0434\u0435\u0443\u2026',
    starters: [
      '\u041c\u04b1\u043d\u0434\u0430 \u049b\u0430\u043d\u0448\u0430 \u043a\u04af\u043d \u0442\u04af\u0441\u0435\u0434\u0456?',
      '\u041f\u0430\u043d\u0435\u043b\u044c\u0434\u0435\u0440 \u04af\u0448\u0456\u043d \u0436\u0430\u049b\u0441\u044b \u0436\u0430\u049b?',
      '\u0421\u044b\u0440\u0442\u0442\u0430 \u0436\u04b1\u043c\u044b\u0441 \u049b\u0430\u0443\u0456\u043f\u0441\u0456\u0437 \u0431\u0435?',
    ],
  },
} as const;

type LangKey = keyof typeof I18N;
function t(lang: string) {
  return I18N[(lang as LangKey) in I18N ? (lang as LangKey) : 'en'];
}

/* ──────────────── draggable position hook ──────────────────────────── */

function useDraggable(initialX: number, initialY: number) {
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const moved = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    moved.current = false;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }, [pos]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    moved.current = true;
    const x = Math.max(24, Math.min(window.innerWidth - 72, e.clientX - offset.current.x));
    const y = Math.max(24, Math.min(window.innerHeight - 72, e.clientY - offset.current.y));
    setPos({ x, y });
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const wasDragged = useCallback(() => moved.current, []);

  return { pos, onPointerDown, onPointerMove, onPointerUp, wasDragged };
}

/* ──────────────────── typing dots ──────────────────────────────────── */

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-[3px]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block h-[5px] w-[5px] rounded-full bg-[var(--blue-strong)]"
          style={{
            animation: 'advisor-dot 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.16}s`,
          }}
        />
      ))}
    </span>
  );
}

/* ──────────────────── message bubble ──────────────────────────────── */

const assistantMarkdownComponents = {
  p: (props: ComponentPropsWithoutRef<'p'>) => (
    <p className="mb-2 last:mb-0 [&:first-child]:mt-0" {...props} />
  ),
  strong: (props: ComponentPropsWithoutRef<'strong'>) => (
    <strong className="font-semibold text-[var(--ink)]" {...props} />
  ),
  em: (props: ComponentPropsWithoutRef<'em'>) => <em className="italic" {...props} />,
  ul: (props: ComponentPropsWithoutRef<'ul'>) => (
    <ul className="mb-2 list-disc pl-4 marker:text-[var(--ink-soft)] last:mb-0" {...props} />
  ),
  ol: (props: ComponentPropsWithoutRef<'ol'>) => (
    <ol className="mb-2 list-decimal pl-4 last:mb-0" {...props} />
  ),
  li: (props: ComponentPropsWithoutRef<'li'>) => (
    <li className="[&>p]:mb-1 [&>p:last-child]:mb-0" {...props} />
  ),
  a: ({ href, children, ...rest }: ComponentPropsWithoutRef<'a'>) => (
    <a
      href={href}
      className="font-medium text-[var(--blue-strong)] underline decoration-[var(--blue-strong)]/35 underline-offset-2 hover:decoration-[var(--blue-strong)]"
      target="_blank"
      rel="noopener noreferrer"
      {...rest}
    >
      {children}
    </a>
  ),
  code: ({
    className,
    children,
    ...props
  }: ComponentPropsWithoutRef<'code'> & { className?: string }) => {
    const isBlock = Boolean(className?.includes('language-'));
    if (!isBlock) {
      return (
        <code
          className="rounded bg-[var(--ink)]/8 px-1 py-0.5 font-mono text-[11px] text-[var(--ink)]"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code className={cn('block whitespace-pre font-mono text-[11px]', className)} {...props}>
        {children}
      </code>
    );
  },
  pre: (props: ComponentPropsWithoutRef<'pre'>) => (
    <pre
      className="mb-2 max-w-full overflow-x-auto rounded-lg bg-[var(--ink)]/6 p-2 text-[var(--ink)] last:mb-0"
      {...props}
    />
  ),
  blockquote: (props: ComponentPropsWithoutRef<'blockquote'>) => (
    <blockquote
      className="mb-2 border-l-2 border-[var(--blue-strong)]/35 pl-2 text-[var(--ink-soft)] last:mb-0"
      {...props}
    />
  ),
  h1: (props: ComponentPropsWithoutRef<'h1'>) => (
    <h1 className="mb-1 text-[13px] font-semibold text-[var(--ink)]" {...props} />
  ),
  h2: (props: ComponentPropsWithoutRef<'h2'>) => (
    <h2 className="mb-1 text-[12px] font-semibold text-[var(--ink)]" {...props} />
  ),
  h3: (props: ComponentPropsWithoutRef<'h3'>) => (
    <h3 className="mb-1 text-[12px] font-semibold text-[var(--ink)]" {...props} />
  ),
  hr: () => <hr className="my-2 border-[color:var(--line)]" />,
} as const;

function MessageRow({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  const isUser = role === 'user';
  return (
    <div className={cn('flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[82%] rounded-2xl px-3 py-2 text-[12.5px] leading-[1.55]',
          isUser
            ? 'rounded-br-md bg-[var(--blue-strong)] text-white'
            : 'rounded-bl-md border border-[color:var(--line)] bg-white/80 text-[var(--ink)]',
        )}
        style={isUser ? { whiteSpace: 'pre-wrap', wordBreak: 'break-word' } : { wordBreak: 'break-word' }}
      >
        {isUser ? (
          content
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={assistantMarkdownComponents}>
            {content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════ MAIN ═════════════════════════════════════ */

export default function ChatSidebar({
  isOpen,
  onToggle,
  messages,
  suggestions,
  isLoading,
  isRecording,
  isTranscribing,
  onSendMessage,
  onStartRecording,
  onStopRecording,
  onSuggestionClick,
  language,
}: ChatSidebarProps) {
  const [inputValue, setInputValue] = useState('');
  const viewportRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const s = t(language);

  const drag = useDraggable(
    typeof window !== 'undefined' ? window.innerWidth - 68 : 700,
    typeof window !== 'undefined' ? window.innerHeight - 160 : 500,
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 280);
  }, [isOpen]);

  const submit = () => {
    const v = inputValue.trim();
    if (!v) return;
    onSendMessage(v);
    setInputValue('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
  };

  const panelRight = window.innerWidth - drag.pos.x - 24;
  const panelBottom = window.innerHeight - drag.pos.y + 16;
  const panelMaxH = drag.pos.y - 20;

  return (
    <>
      {/* ── draggable FAB ─────────────────────────────────────────── */}
      <div
        className={cn(
          'fixed touch-none select-none',
          isOpen ? 'z-[1202]' : 'z-[1002]',
        )}
        style={{ left: drag.pos.x, top: drag.pos.y }}
        onPointerDown={drag.onPointerDown}
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
      >
        <button
          type="button"
          onClick={() => { if (!drag.wasDragged()) onToggle(); }}
          className={cn(
            'group relative flex h-12 w-12 items-center justify-center rounded-full',
            'border border-[color:var(--line)] shadow-[var(--shadow)]',
            'transition-all duration-200 cursor-grab active:cursor-grabbing',
            isOpen
              ? 'bg-[var(--blue-strong)] text-white border-[var(--blue-strong)]'
              : 'bg-[var(--surface)] text-[var(--blue-strong)] hover:shadow-[0_8px_24px_rgba(31,79,156,0.16)]',
          )}
          aria-label={isOpen ? 'Close chat' : 'Open Sun Advisor'}
        >
          {isOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <>
              <MessageCircle className="h-5 w-5 transition-transform group-hover:scale-110" />
              <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[var(--yellow)] border-2 border-[var(--surface)] shadow-sm" />
            </>
          )}
        </button>
        {/* drag grip indicator */}
      </div>

      {/* ── floating card (map-panel style) ────────────────────────── */}
      <div
        className={cn(
          'fixed z-[1201]',
          'flex w-[min(340px,calc(100vw-2rem))] flex-col',
          'map-panel rounded-2xl',
          'origin-bottom-right transition-all duration-250 ease-[cubic-bezier(0.32,0.72,0,1)]',
          isOpen
            ? 'scale-100 opacity-100 translate-y-0'
            : 'pointer-events-none scale-95 opacity-0 translate-y-2',
        )}
        style={{
          right: Math.max(16, panelRight - 160),
          bottom: Math.max(16, panelBottom),
          maxHeight: `${Math.min(520, Math.max(280, panelMaxH))}px`,
        }}
      >
        {/* ── header ──────────────────────────────────────────────── */}
        <header className="flex items-center gap-2.5 px-4 pt-3.5 pb-3">
          <div className="flex-1 min-w-0">
            <div className="ui-mono text-[9px] uppercase tracking-[1.2px] text-[var(--ink-soft)]">
              {s.tag}
            </div>
            <h2 className="text-[14px] font-semibold leading-tight tracking-[-0.02em] text-[var(--ink)]">
              {s.title}
            </h2>
          </div>
        </header>

        <div className="mx-4 h-px bg-[var(--line)]" />

        {/* ── viewport ────────────────────────────────────────────── */}
        <div
          ref={viewportRef}
          className="flex-1 overflow-y-auto scroll-smooth px-3.5 py-3"
          style={{ minHeight: '180px' }}
        >
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center gap-3 py-5 px-2">
              <div className="text-center">
                <p className="text-[13px] font-semibold text-[var(--ink)]">{s.welcomeTitle}</p>
                <p className="mt-1 max-w-[230px] text-[11px] leading-[1.55] text-[var(--ink-soft)]">
                  {s.welcome}
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-1.5">
                {s.starters.map((text) => (
                  <button
                    key={text}
                    type="button"
                    onClick={() => onSendMessage(text)}
                    className="map-segment rounded-full px-2.5 py-1 text-[11px]"
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2.5">
            {messages.map((msg, i) => (
              <MessageRow key={i} role={msg.role} content={msg.content} />
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border border-[color:var(--line)] bg-white/80 px-3.5 py-2.5">
                  <TypingDots />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── suggestions ─────────────────────────────────────────── */}
        {suggestions.length > 0 && (
          <div className="border-t border-[color:var(--line)] px-3.5 py-2">
            <div className="advisor-no-scrollbar flex gap-1.5 overflow-x-auto">
              {suggestions.map((text) => (
                <button
                  key={text}
                  type="button"
                  onClick={() => onSuggestionClick(text)}
                  className="map-segment shrink-0 rounded-full px-2.5 py-1 text-[10.5px]"
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── composer ────────────────────────────────────────────── */}
        <div className="border-t border-[color:var(--line)] px-3.5 pb-3 pt-2.5">
          {(isRecording || isTranscribing) && (
            <div className="mb-2 flex items-center gap-2 rounded-lg border border-[color:var(--line)] bg-white/80 px-2.5 py-1.5 text-[11px]">
              {isRecording ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                  </span>
                  <span className="text-red-600/70">{s.recording}</span>
                </>
              ) : (
                <>
                  <span className="min-w-[1rem] animate-pulse font-medium text-[var(--blue-strong)]" aria-hidden>
                    …
                  </span>
                  <span className="text-[var(--ink-soft)]">{s.transcribing}</span>
                </>
              )}
            </div>
          )}

          <PromptBox
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={s.placeholder}
            disabled={isRecording || isTranscribing}
            voiceDisabled={isTranscribing}
            onSend={submit}
            onVoiceClick={() => {
              if (isRecording) onStopRecording();
              else onStartRecording();
            }}
            voiceActive={isRecording}
            showExtras={false}
            maxInputHeight={72}
            className={cn(
              'map-input rounded-xl border-[color:var(--line)] !bg-[rgba(255,255,255,0.92)] shadow-none',
              '[&_textarea]:min-h-[26px] [&_textarea]:py-0.5 [&_textarea]:text-[12.5px] [&_textarea]:leading-[1.45] [&_textarea]:text-[var(--ink)] [&_textarea]:placeholder:text-[var(--ink-soft)]/50',
            )}
          />
        </div>
      </div>

      <style>{`
        @keyframes advisor-dot {
          0%, 80%, 100% { opacity: .25; transform: scale(.8) }
          40% { opacity: 1; transform: scale(1) }
        }
        .advisor-no-scrollbar::-webkit-scrollbar { display: none }
        .advisor-no-scrollbar { -ms-overflow-style: none; scrollbar-width: none }
      `}</style>
    </>
  );
}
