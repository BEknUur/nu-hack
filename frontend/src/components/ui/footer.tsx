import { Button } from '@/components/ui/button';

interface FooterProps {
  logo: React.ReactNode;
  brandName: string;
  socialLinks: Array<{
    icon: React.ReactNode;
    href: string;
    label: string;
  }>;
  mainLinks: Array<{
    href: string;
    label: string;
  }>;
  legalLinks: Array<{
    href: string;
    label: string;
  }>;
  copyright: {
    text: string;
    license?: string;
  };
}

export function Footer({
  logo,
  brandName,
  socialLinks,
  mainLinks,
  legalLinks,
  copyright,
}: FooterProps) {
  return (
    <footer className="border-t border-white/5 pb-8 pt-16 lg:pb-10 lg:pt-20">
      <div className="px-6 lg:px-8">
        <div className="md:flex md:items-start md:justify-between">
          <a href="/" className="flex items-center gap-x-2.5" aria-label={brandName}>
            {logo}
            <div className="flex flex-col leading-none">
              <span className="font-display font-bold text-lg text-white tracking-[-0.03em]">
                {brandName}
              </span>
            </div>
          </a>

          <ul className="flex list-none mt-6 md:mt-0 space-x-2">
            {socialLinks.map((link, i) => (
              <li key={i}>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  asChild
                >
                  <a href={link.href} target="_blank" rel="noopener noreferrer" aria-label={link.label}>
                    {link.icon}
                  </a>
                </Button>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-white/5 mt-8 pt-8 lg:grid lg:grid-cols-10">
          <nav className="lg:mt-0 lg:col-[4/11]">
            <ul className="list-none flex flex-wrap -my-1 -mx-2 lg:justify-end">
              {mainLinks.map((link, i) => (
                <li key={i} className="my-1 mx-2 shrink-0">
                  <a
                    href={link.href}
                    className="text-sm text-white/50 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-4 lg:mt-0 lg:col-[4/11]">
            <ul className="list-none flex flex-wrap -my-1 -mx-3 lg:justify-end">
              {legalLinks.map((link, i) => (
                <li key={i} className="my-1 mx-3 shrink-0">
                  <a
                    href={link.href}
                    className="text-sm text-white/25 hover:text-white/50 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 lg:mt-0 lg:row-[1/3] lg:col-[1/4]">
            <div className="text-sm text-white/25">{copyright.text}</div>
            {copyright.license && (
              <div className="ui-mono text-[11px] text-white/15 mt-1">{copyright.license}</div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
