import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Globe,
  Lightbulb,
  Mic,
  Paintbrush,
  Pencil,
  Plus,
  Send,
  Settings2,
  Telescope,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Radix primitives ─────────────────────────────────────────────── */

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & { showArrow?: boolean }
>(({ className, sideOffset = 4, showArrow = false, children, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'relative z-50 max-w-[280px] rounded-md bg-popover px-1.5 py-1 text-xs text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className,
      )}
      {...props}
    >
      {children}
      {showArrow && <TooltipPrimitive.Arrow className="-my-px fill-popover" />}
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'center', sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'z-50 w-64 rounded-xl bg-popover p-2 text-popover-foreground shadow-md outline-none animate-in data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

const Dialog = DialogPrimitive.Root;
const DialogPortal = DialogPrimitive.Portal;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-[50%] top-[50%] z-50 grid w-full max-w-[90vw] translate-x-[-50%] translate-y-[-50%] gap-4 border-none bg-transparent p-0 shadow-none duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 md:max-w-[800px]',
        className,
      )}
      {...props}
    >
      <div className="relative overflow-hidden rounded-2xl bg-card p-1 shadow-2xl">
        {children}
        <DialogPrimitive.Close className="absolute right-3 top-3 z-10 rounded-full bg-background/50 p-1 transition-all hover:bg-accent">
          <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </div>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const toolsList = [
  { id: 'createImage', name: 'Create an image', shortName: 'Image', icon: Paintbrush },
  { id: 'searchWeb', name: 'Search the web', shortName: 'Search', icon: Globe },
  { id: 'writeCode', name: 'Write or code', shortName: 'Write', icon: Pencil },
  {
    id: 'deepResearch',
    name: 'Run deep research',
    shortName: 'Deep Search',
    icon: Telescope,
    extra: '5 left',
  },
  { id: 'thinkLonger', name: 'Think for longer', shortName: 'Think', icon: Lightbulb },
] as const;

export type PromptBoxProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  'onChange'
> & {
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
  /** Fires when the send control is activated (value non-empty or image attached). */
  onSend?: () => void;
  onVoiceClick?: () => void;
  /** Show attach + tools popover (default true). */
  showExtras?: boolean;
  voiceDisabled?: boolean;
  /** Highlight mic when recording (e.g. red). */
  voiceActive?: boolean;
  /** Max auto-grown textarea height in px (default 200). */
  maxInputHeight?: number;
};

export const PromptBox = React.forwardRef<HTMLTextAreaElement, PromptBoxProps>(
  (
    {
      className,
      onSend,
      onVoiceClick,
      showExtras = true,
      voiceDisabled = false,
      voiceActive = false,
      maxInputHeight = 200,
      value: valueProp,
      onChange,
      ...textareaProps
    },
    ref,
  ) => {
    const internalTextareaRef = React.useRef<HTMLTextAreaElement>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [uncontrolled, setUncontrolled] = React.useState('');
    const [imagePreview, setImagePreview] = React.useState<string | null>(null);
    const [selectedTool, setSelectedTool] = React.useState<string | null>(null);
    const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
    const [isImageDialogOpen, setIsImageDialogOpen] = React.useState(false);

    const isControlled = valueProp !== undefined;
    const value = isControlled ? String(valueProp) : uncontrolled;

    React.useImperativeHandle(ref, () => internalTextareaRef.current!, []);

    React.useLayoutEffect(() => {
      const textarea = internalTextareaRef.current;
      if (textarea) {
        textarea.style.height = 'auto';
        const newHeight = Math.min(textarea.scrollHeight, maxInputHeight);
        textarea.style.height = `${newHeight}px`;
      }
    }, [value, maxInputHeight]);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!isControlled) setUncontrolled(e.target.value);
      onChange?.(e);
    };

    const handlePlusClick = () => {
      fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
      event.target.value = '';
    };

    const handleRemoveImage = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const hasValue = value.trim().length > 0 || Boolean(imagePreview);
    const activeTool = selectedTool ? toolsList.find((t) => t.id === selectedTool) : null;
    const ActiveToolIcon = activeTool?.icon;

    const voiceSendPair = (
      <div className="flex h-8 shrink-0 items-center justify-start gap-1.5 [&_button]:m-0 [&_button]:box-border [&_button]:p-0 [&_button]:leading-none [&_svg]:block [&_svg]:shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onVoiceClick}
              disabled={voiceDisabled}
              className={cn(
                'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[rgba(31,79,156,0.22)] bg-white text-[var(--blue-strong)] shadow-[0_1px_2px_rgba(23,32,51,0.06)] transition-colors hover:border-[rgba(31,79,156,0.35)] hover:bg-[rgba(31,79,156,0.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue-strong)]/25 disabled:pointer-events-none disabled:opacity-40',
                voiceActive &&
                  'border-red-200 bg-red-50 text-red-600 shadow-none hover:bg-red-100 hover:text-red-700',
              )}
            >
              <Mic className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden />
              <span className="sr-only">Record voice</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" showArrow>
            <p>Record voice</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              disabled={!hasValue || Boolean(textareaProps.disabled)}
              onClick={() => onSend?.()}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--blue-strong)] text-white transition-colors hover:bg-[var(--blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue-strong)]/30 disabled:pointer-events-none disabled:bg-[var(--ink-soft)]/25 disabled:text-white/80"
            >
              <Send className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden />
              <span className="sr-only">Send message</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" showArrow>
            <p>Send</p>
          </TooltipContent>
        </Tooltip>
      </div>
    );

    return (
      <div
        className={cn(
          'flex cursor-text flex-col rounded-2xl border border-[rgba(31,79,156,0.12)] bg-white p-1.5 shadow-sm transition-colors [color-scheme:light]',
          className,
        )}
      >
        {showExtras && (
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
          />
        )}

        {showExtras && imagePreview && (
          <>
            <div className="relative mb-1 w-fit rounded-2xl px-1 pt-1">
              <button
                type="button"
                className="transition-transform"
                onClick={() => setIsImageDialogOpen(true)}
              >
                <img
                  src={imagePreview}
                  alt=""
                  className="h-14 w-14 rounded-2xl object-cover"
                />
              </button>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute right-2 top-2 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-white/80 text-black transition-colors hover:bg-accent"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
              <DialogContent>
                <img
                  src={imagePreview}
                  alt=""
                  className="max-h-[95vh] w-full rounded-[24px] object-contain"
                />
              </DialogContent>
            </Dialog>
          </>
        )}

        <TooltipProvider delayDuration={100}>
          {showExtras ? (
            <>
              <textarea
                ref={internalTextareaRef}
                rows={1}
                value={isControlled ? valueProp : value}
                onChange={handleInputChange}
                placeholder="Message…"
                className="custom-scrollbar min-h-[32px] w-full resize-none border-0 bg-transparent px-2 py-1 text-[13px] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus:ring-0"
                {...textareaProps}
              />
              <div className="mt-px px-0.5 pb-0.5">
                <div className="flex items-center gap-1.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={handlePlusClick}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent focus-visible:outline-none"
                      >
                        <Plus className="h-5 w-5" />
                        <span className="sr-only">Attach image</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" showArrow>
                      <p>Attach image</p>
                    </TooltipContent>
                  </Tooltip>

                  <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="flex h-7 items-center gap-1.5 rounded-full px-2 py-1 text-xs text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-ring"
                          >
                            <Settings2 className="h-4 w-4" />
                            {!selectedTool && 'Tools'}
                          </button>
                        </PopoverTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="top" showArrow>
                        <p>Explore tools</p>
                      </TooltipContent>
                    </Tooltip>
                    <PopoverContent side="top" align="start">
                      <div className="flex flex-col gap-1">
                        {toolsList.map((tool) => (
                          <button
                            key={tool.id}
                            type="button"
                            onClick={() => {
                              setSelectedTool(tool.id);
                              setIsPopoverOpen(false);
                            }}
                            className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-accent"
                          >
                            <tool.icon className="h-4 w-4 shrink-0" />
                            <span>{tool.name}</span>
                            {'extra' in tool && tool.extra && (
                              <span className="ml-auto text-xs text-muted-foreground">
                                {tool.extra}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {activeTool && (
                    <>
                      <div className="h-4 w-px bg-border" />
                      <button
                        type="button"
                        onClick={() => setSelectedTool(null)}
                        className="flex h-7 cursor-pointer flex-row items-center justify-center gap-1.5 rounded-full px-2 text-xs text-[#2294ff] transition-colors hover:bg-accent"
                      >
                        {ActiveToolIcon && <ActiveToolIcon className="h-4 w-4" />}
                        {activeTool.shortName}
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  )}

                  <div className="ml-auto flex h-8 items-center justify-end">{voiceSendPair}</div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex min-h-0 items-end gap-2">
              <textarea
                ref={internalTextareaRef}
                rows={1}
                value={isControlled ? valueProp : value}
                onChange={handleInputChange}
                placeholder="Message…"
                className="custom-scrollbar min-h-[32px] min-w-0 flex-1 resize-none border-0 bg-transparent px-2 py-1 text-[13px] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus:ring-0"
                {...textareaProps}
              />
              {voiceSendPair}
            </div>
          )}
        </TooltipProvider>
      </div>
    );
  },
);
PromptBox.displayName = 'PromptBox';
