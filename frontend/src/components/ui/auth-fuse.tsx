import * as React from "react";
import { useState, useId, useEffect } from "react";
import { Slot } from "@radix-ui/react-slot";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import { Eye, EyeOff } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Typewriter ────────────────────────────────────────────────────────────────

export interface TypewriterProps {
  text: string | string[];
  speed?: number;
  cursor?: string;
  loop?: boolean;
  deleteSpeed?: number;
  delay?: number;
  className?: string;
}

export function Typewriter({ text, speed = 100, cursor = "|", loop = false, deleteSpeed = 50, delay = 1500, className }: TypewriterProps) {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [textArrayIndex, setTextArrayIndex] = useState(0);
  const textArray = Array.isArray(text) ? text : [text];
  const currentText = textArray[textArrayIndex] || "";

  useEffect(() => {
    if (!currentText) return;
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (currentIndex < currentText.length) {
          setDisplayText((prev) => prev + currentText[currentIndex]);
          setCurrentIndex((prev) => prev + 1);
        } else if (loop) {
          setTimeout(() => setIsDeleting(true), delay);
        }
      } else {
        if (displayText.length > 0) {
          setDisplayText((prev) => prev.slice(0, -1));
        } else {
          setIsDeleting(false);
          setCurrentIndex(0);
          setTextArrayIndex((prev) => (prev + 1) % textArray.length);
        }
      }
    }, isDeleting ? deleteSpeed : speed);
    return () => clearTimeout(timeout);
  }, [currentIndex, isDeleting, currentText, loop, speed, deleteSpeed, delay, displayText, text]);

  return (
    <span className={className}>
      {displayText}
      <span className="animate-pulse">{cursor}</span>
    </span>
  );
}

// ── Label ─────────────────────────────────────────────────────────────────────

const labelVariants = cva("ui-mono text-[10px] uppercase tracking-[1px] text-white/35 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70");

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
));
Label.displayName = LabelPrimitive.Root.displayName;

// ── Button ────────────────────────────────────────────────────────────────────

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[#f0c24c] text-[#06080f] hover:bg-[#f0c24c]/90 shadow-[0_4px_20px_rgba(240,194,76,0.2)]",
        destructive: "bg-red-500/20 text-red-400 ring-1 ring-red-500/20",
        outline: "bg-[#f0c24c] text-[#06080f] hover:bg-[#f0c24c]/90 shadow-[0_4px_20px_rgba(240,194,76,0.2)]",
        secondary: "bg-white/[0.04] text-white/70 ring-1 ring-white/10 hover:bg-white/[0.08]",
        ghost: "text-white/50 hover:text-white hover:bg-white/[0.06]",
        link: "text-[#f0c24c]/60 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-12 rounded-xl px-6",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

// ── Input ─────────────────────────────────────────────────────────────────────

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-xl bg-white/[0.04] ring-1 ring-white/10 px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none transition-all focus:ring-[#f0c24c]/40 focus:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";

// ── PasswordInput ─────────────────────────────────────────────────────────────

export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, label, ...props }, ref) => {
    const id = useId();
    const [showPassword, setShowPassword] = useState(false);
    return (
      <div className="grid w-full items-center gap-2">
        {label && <Label htmlFor={id}>{label}</Label>}
        <div className="relative">
          <Input id={id} type={showPassword ? "text" : "password"} className={cn("pe-10", className)} ref={ref} {...props} />
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="absolute inset-y-0 end-0 flex h-full w-10 items-center justify-center text-white/30 hover:text-white/60 transition-colors focus-visible:outline-none"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

// ── Forms ─────────────────────────────────────────────────────────────────────

interface FormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  error: string | null;
  loading: boolean;
}

function SignInForm({ onSubmit, error, loading }: FormProps) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    await onSubmit(email, password);
  };

  return (
    <form onSubmit={handleSubmit} autoComplete="on" className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold text-white">Войти в аккаунт</h1>
        <p className="text-sm text-white/35">Введите email и пароль для входа</p>
      </div>
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
        </div>
        <PasswordInput name="password" label="Пароль" required autoComplete="current-password" placeholder="••••••••" />
        {error && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2 ring-1 ring-red-500/20">{error}</p>}
        <Button type="submit" variant="outline" className="mt-2" disabled={loading}>
          {loading ? "Loading..." : "Войти"}
        </Button>
      </div>
    </form>
  );
}

function SignUpForm({ onSubmit, error, loading }: FormProps) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    await onSubmit(email, password);
  };

  return (
    <form onSubmit={handleSubmit} autoComplete="on" className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold text-white">Создать аккаунт</h1>
        <p className="text-sm text-white/35">Введите данные для регистрации</p>
      </div>
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
        </div>
        <PasswordInput name="password" label="Пароль" required autoComplete="new-password" placeholder="••••••••" />
        {error && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2 ring-1 ring-red-500/20">{error}</p>}
        <Button type="submit" variant="outline" className="mt-2" disabled={loading}>
          {loading ? "Loading..." : "Создать аккаунт"}
        </Button>
      </div>
    </form>
  );
}

// ── AuthUI (public API) ───────────────────────────────────────────────────────

export interface AuthUIProps {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
}

export function AuthUI({ onSignIn, onSignUp }: AuthUIProps) {
  const [isSignIn, setIsSignIn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (fn: (e: string, p: string) => Promise<void>, email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      await fn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Что-то пошло не так");
    } finally {
      setLoading(false);
    }
  };

  const signInQuote = "Welcome back. Astana is waiting for you.";
  const signUpQuote = "New account. New opportunities.";

  return (
    <div className="w-full min-h-screen bg-[#06080f] md:grid md:grid-cols-2">
      <style>{`
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear { display: none; }
      `}</style>

      {/* Left — form */}
      <div className="flex h-screen items-center justify-center p-6 md:h-auto md:p-0 md:py-12">
        <div className="mx-auto grid w-[350px] gap-4">
          {/* Logo */}
          <a href="/" className="flex flex-col items-center leading-none mb-2">
            <span className="font-display text-xl font-medium text-white tracking-[-0.04em]">DeCentra</span>
            <span className="ui-mono text-[10px] text-white/30 mt-1 tracking-widest uppercase">Shadow Map</span>
          </a>

          {isSignIn
            ? <SignInForm onSubmit={(e, p) => handleSubmit(onSignIn, e, p)} error={error} loading={loading} />
            : <SignUpForm onSubmit={(e, p) => handleSubmit(onSignUp, e, p)} error={error} loading={loading} />
          }

          <div className="text-center text-sm text-white/30">
            {isSignIn ? "Нет аккаунта?" : "Уже есть аккаунт?"}{" "}
            <button
              className="text-[#f0c24c]/70 hover:text-[#f0c24c] transition-colors pl-1"
              onClick={() => { setIsSignIn((p) => !p); setError(null); }}
            >
              {isSignIn ? "Зарегистрироваться" : "Войти"}
            </button>
          </div>
        </div>
      </div>

      {/* Right — photo */}
      <div
        className="hidden md:block relative bg-cover bg-center"
        style={{ backgroundImage: `url(/imgs/image2.png)` }}
      >
        <div className="absolute inset-0 bg-[#06080f]/60" />
        <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 70%, rgba(240,194,76,0.06) 0%, transparent 70%)' }} />
        <div className="absolute inset-x-0 bottom-0 h-[160px] bg-gradient-to-t from-[#06080f] to-transparent" />
        <div className="relative z-10 flex h-full flex-col items-center justify-end p-2 pb-10">
          <blockquote className="space-y-2 text-center">
            <p className="text-lg font-medium text-white">
              "<Typewriter key={isSignIn ? signInQuote : signUpQuote} text={isSignIn ? signInQuote : signUpQuote} speed={60} />"
            </p>
            <cite className="block text-sm font-light text-white/30 not-italic">— DeCentra</cite>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
