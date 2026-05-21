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

const labelVariants = cva("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70");

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
));
Label.displayName = LabelPrimitive.Root.displayName;

// ── Button ────────────────────────────────────────────────────────────────────

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary-foreground/60 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-md px-6",
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
        "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-3 text-sm text-foreground shadow-sm transition-shadow placeholder:text-muted-foreground focus-visible:bg-accent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
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
            className="absolute inset-y-0 end-0 flex h-full w-10 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-none"
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
        <h1 className="text-2xl font-bold text-foreground">Войти в аккаунт</h1>
        <p className="text-sm text-muted-foreground">Введите email и пароль для входа</p>
      </div>
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
        </div>
        <PasswordInput name="password" label="Пароль" required autoComplete="current-password" placeholder="••••••••" />
        {error && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">{error}</p>}
        <Button type="submit" variant="outline" className="mt-2" disabled={loading}>
          {loading ? "Загрузка..." : "Войти"}
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
        <h1 className="text-2xl font-bold text-foreground">Создать аккаунт</h1>
        <p className="text-sm text-muted-foreground">Введите данные для регистрации</p>
      </div>
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
        </div>
        <PasswordInput name="password" label="Пароль" required autoComplete="new-password" placeholder="••••••••" />
        {error && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">{error}</p>}
        <Button type="submit" variant="outline" className="mt-2" disabled={loading}>
          {loading ? "Загрузка..." : "Создать аккаунт"}
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

  const signInQuote = "Добро пожаловать обратно. Астана ждёт тебя.";
  const signUpQuote = "Новый аккаунт. Новые возможности.";

  return (
    <div className="w-full min-h-screen bg-background md:grid md:grid-cols-2">
      <style>{`
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear { display: none; }
      `}</style>

      {/* Left — form */}
      <div className="flex h-screen items-center justify-center p-6 md:h-auto md:p-0 md:py-12">
        <div className="mx-auto grid w-[350px] gap-4">
          {/* Logo */}
          <a href="/" className="flex flex-col items-center leading-none mb-2">
            <span className="font-display text-xl font-medium text-foreground tracking-[-0.04em]">DeCentra</span>
            <span className="text-[11px] text-muted-foreground mt-1 tracking-widest uppercase">Shadow Map</span>
          </a>

          {isSignIn
            ? <SignInForm onSubmit={(e, p) => handleSubmit(onSignIn, e, p)} error={error} loading={loading} />
            : <SignUpForm onSubmit={(e, p) => handleSubmit(onSignUp, e, p)} error={error} loading={loading} />
          }

          <div className="text-center text-sm text-muted-foreground">
            {isSignIn ? "Нет аккаунта?" : "Уже есть аккаунт?"}{" "}
            <button
              className="text-foreground underline-offset-4 hover:underline pl-1"
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
        style={{ backgroundImage: `url(/imgs/alem.jpg)` }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-x-0 bottom-0 h-[120px] bg-gradient-to-t from-background to-transparent" />
        <div className="relative z-10 flex h-full flex-col items-center justify-end p-2 pb-8">
          <blockquote className="space-y-2 text-center text-foreground">
            <p className="text-lg font-medium">
              "<Typewriter key={isSignIn ? signInQuote : signUpQuote} text={isSignIn ? signInQuote : signUpQuote} speed={60} />"
            </p>
            <cite className="block text-sm font-light text-muted-foreground not-italic">— DeCentra</cite>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
