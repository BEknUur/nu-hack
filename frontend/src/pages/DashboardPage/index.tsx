import { LogOut, Send } from 'lucide-react';
import { useLangPath, useTranslation } from '@/i18n';
import { useAuth } from '@/hooks/useAuth';
import { BentoGrid, type BentoItem } from '@/components/ui/bento-grid';

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const { messages } = useTranslation();
  const langPath = useLangPath();
  const l = messages.landingV2;

  const items: BentoItem[] = [
    {
      title: l.features[0]?.title ?? 'Apartments',
      description: l.features[0]?.description ?? '',
      status: l.features[0]?.tag,
      href: langPath('/app/apartments'),
      colSpan: 2,
      hasPersistentHover: true,
      cta: l.openScene,
    },
    {
      title: l.features[1]?.title ?? 'Trees',
      description: l.features[1]?.description ?? '',
      status: l.features[1]?.tag,
      href: langPath('/app/trees'),
      cta: l.openScene,
    },
    {
      title: l.features[2]?.title ?? 'Workers',
      description: l.features[2]?.description ?? '',
      status: l.features[2]?.tag,
      href: langPath('/app/workers'),
      cta: l.openScene,
    },
    {
      title: l.features[3]?.title ?? 'Solar Panel',
      description: l.features[3]?.description ?? '',
      status: l.features[3]?.tag,
      href: langPath('/app/solar-flowers'),
      cta: l.openScene,
    },
    {
      title: l.telegram.title,
      description: l.telegram.description,
      icon: <Send className="h-4 w-4 text-[#f0c24c]" />,
      tags: l.telegram.features,
      colSpan: 2,
      href: 'https://t.me/alem_aiI_bot',
      cta: l.telegram.cta,
    },
  ];

  return (
    <div className="min-h-screen bg-[#06080f] text-white">
      {/* Top bar */}
      <header className="border-b border-white/[0.06]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href={langPath('/')} className="flex flex-col leading-none">
            <span className="font-display text-[15px] font-medium text-white tracking-[-0.04em]">DeCentra</span>
            <span className="ui-mono text-[10px] text-white/30 mt-0.5">sunlight and shadow map</span>
          </a>
          <div className="flex items-center gap-3">
            <span className="ui-mono text-[11px] text-white/40">{user?.email}</span>
            <button
              onClick={() => void signOut()}
              className="flex items-center gap-1.5 rounded-full bg-white/[0.04] ring-1 ring-white/10 px-3 py-1.5 text-xs text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors"
            >
              <LogOut className="h-3 w-3" />
              {messages.common.signOut}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <BentoGrid items={items} />
      </main>
    </div>
  );
}
