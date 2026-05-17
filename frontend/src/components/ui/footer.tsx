interface FooterProps {
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
  mainLinks,
  legalLinks,
  copyright,
}: FooterProps) {
  return (
    <footer className="border-t border-white/5 pb-8 pt-16 lg:pb-10 lg:pt-20">
      <div className="px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-10">
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
