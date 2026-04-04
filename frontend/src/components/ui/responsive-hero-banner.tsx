import React, { useState, useEffect } from 'react';

interface NavLink {
  label: string;
  href: string;
  isActive?: boolean;
}

interface Partner {
  logoUrl: string;
  href: string;
}

interface ResponsiveHeroBannerProps {
  logoSlot?: React.ReactNode;
  logoUrl?: string;
  backgroundImageUrl?: string;
  backgroundSlides?: string[];
  slideInterval?: number;
  navLinks?: NavLink[];
  ctaButtonText?: string;
  ctaButtonHref?: string;
  title?: string;
  titleLine2?: string;
  description?: string;
  partnersTitle?: string;
  partners?: Partner[];
  rightSlot?: React.ReactNode;
  heroTextSlot?: React.ReactNode;
  descriptionSlot?: React.ReactNode;
}

const ResponsiveHeroBanner: React.FC<ResponsiveHeroBannerProps> = ({
  logoSlot,
  logoUrl,
  backgroundImageUrl,
  backgroundSlides,
  slideInterval = 5000,
  navLinks = [
    { label: 'Apartments', href: '/app/apartments' },
    { label: 'Trees', href: '/app/trees' },
    { label: 'Workers', href: '/app/workers' },
  ],
  ctaButtonText = 'Open Map',
  ctaButtonHref = '/app/apartments',
  title = 'Sunlight',
  titleLine2 = 'in Motion.',
  description = 'Analyze building shadows, optimize tree placement, plan outdoor shifts, and map sunlight — all on one city map.',
  partnersTitle = '',
  partners = [],
  rightSlot,
  heroTextSlot,
  descriptionSlot,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Slideshow logic
  const slides = backgroundSlides && backgroundSlides.length > 0
    ? backgroundSlides
    : backgroundImageUrl
      ? [backgroundImageUrl]
      : [];
  const [activeSlide, setActiveSlide] = useState(0);
  const [prevSlide, setPrevSlide] = useState<number | null>(null);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setPrevSlide((s) => s);
      setActiveSlide((cur) => {
        setPrevSlide(cur);
        return (cur + 1) % slides.length;
      });
    }, slideInterval);
    return () => clearInterval(timer);
  }, [slides.length, slideInterval]);

  return (
    <section className="w-full isolate min-h-screen overflow-hidden relative">
      {/* Slideshow background */}
      {slides.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          className="w-full h-full object-cover absolute inset-0 pointer-events-none select-none"
          style={{
            opacity: i === activeSlide ? 1 : 0,
            transition: i === activeSlide || i === prevSlide
              ? 'opacity 1.4s ease-in-out'
              : 'none',
            zIndex: i === activeSlide ? 1 : 0,
          }}
        />
      ))}

      {/* Dark overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[#06080f]/65" style={{ zIndex: 2 }} />

      {/* Bottom fade to page background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, transparent 0%, transparent 50%, rgba(6,8,15,0.7) 80%, #06080f 100%)',
          zIndex: 2,
        }}
      />

      {/* Warm gold center glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 70%, rgba(240,194,76,0.07) 0%, transparent 70%)',
          zIndex: 2,
        }}
      />

      {/* Slide dots indicator */}
      {slides.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2" style={{ zIndex: 10 }}>
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => { setPrevSlide(activeSlide); setActiveSlide(i); }}
              className="h-1.5 rounded-full transition-all duration-500"
              style={{
                width: i === activeSlide ? '24px' : '6px',
                background: i === activeSlide ? '#f0c24c' : 'rgba(255,255,255,0.3)',
              }}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Header */}
      <header className="relative" style={{ zIndex: 20 }}>
        <div className="mx-6 pt-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            {logoSlot ? (
              <div>{logoSlot}</div>
            ) : logoUrl ? (
              <a
                href="/"
                className="inline-flex items-center justify-center w-[100px] h-[40px] bg-cover bg-center rounded"
                style={{ backgroundImage: `url(${logoUrl})` }}
              />
            ) : null}

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-full bg-white/5 px-1 py-1 ring-1 ring-white/10 backdrop-blur-md">
                {navLinks.map((link, i) => (
                  <a
                    key={i}
                    href={link.href}
                    className={`px-3 py-2 text-sm font-medium transition-colors hover:text-white ${
                      link.isActive ? 'text-white' : 'text-white/65'
                    }`}
                  >
                    {link.label}
                  </a>
                ))}
                <a
                  href={ctaButtonHref}
                  className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-[#f0c24c] px-4 py-2 text-sm font-semibold text-[#06080f] hover:bg-[#f0c24c]/90 transition-colors"
                >
                  {ctaButtonText}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7 7h10v10" />
                    <path d="M7 17 17 7" />
                  </svg>
                </a>
              </div>
            </nav>

            {/* Right slot + mobile button */}
            <div className="flex items-center gap-2">
              {rightSlot && (
                <div className="hidden md:block">{rightSlot}</div>
              )}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/8 ring-1 ring-white/15 backdrop-blur-md"
                aria-expanded={mobileMenuOpen}
                aria-label="Toggle menu"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white/80"
                >
                  {mobileMenuOpen ? (
                    <>
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </>
                  ) : (
                    <>
                      <path d="M4 6h16" />
                      <path d="M4 12h16" />
                      <path d="M4 18h16" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-3 rounded-2xl bg-[#0d1117]/90 ring-1 ring-white/10 backdrop-blur-xl p-2">
              {navLinks.map((link, i) => (
                <a
                  key={i}
                  href={link.href}
                  className="flex items-center px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                >
                  {link.label}
                </a>
              ))}
              {rightSlot && (
                <div className="px-4 py-3 border-t border-white/5 mt-1">{rightSlot}</div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Hero content */}
      <div className="relative" style={{ zIndex: 10 }}>
        <div className="mx-auto max-w-7xl px-6 pt-28 sm:pt-32 md:pt-40 lg:pt-48 pb-20">
          <div className="mx-auto max-w-3xl text-center">
            {/* Headline */}
            {heroTextSlot ? (
              <div className="mt-2 mb-2">{heroTextSlot}</div>
            ) : (
              <h1 className="animate-fade-slide-in-2 font-display text-[clamp(3.2rem,9vw,7rem)] font-bold leading-[0.88] tracking-[-0.04em] text-white">
                {title}
                <br />
                <span className="text-[#f0c24c]">{titleLine2}</span>
              </h1>
            )}

            {/* Description */}
            {descriptionSlot ? (
              <div className="mt-7">{descriptionSlot}</div>
            ) : (
              <p className="animate-fade-slide-in-3 mx-auto mt-7 max-w-xl text-base md:text-lg text-white/50 leading-relaxed">
                {description}
              </p>
            )}
          </div>

          {/* Partners */}
          {partners.length > 0 && (
            <div className="mx-auto mt-24 max-w-5xl">
              {partnersTitle && (
                <p className="mb-6 text-center text-sm text-white/30">{partnersTitle}</p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 items-center justify-items-center gap-6">
                {partners.map((partner, i) => (
                  <a
                    key={i}
                    href={partner.href}
                    className="inline-flex items-center justify-center w-[120px] h-[36px] bg-cover bg-center rounded-full opacity-50 hover:opacity-80 transition-opacity"
                    style={{ backgroundImage: `url(${partner.logoUrl})` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ResponsiveHeroBanner;
