# Dashboard Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dashboard page that serves as the user's home after login — showing scenario cards, AI chat access, and quick stats — so the app feels like a platform, not just a single tool.

**Architecture:** New `DashboardPage` component at `/:lang/app`. Current `MapPage` moves to `/:lang/app/:caseId` only (no bare `/app` map). Dashboard uses the dark theme (`#06080f`, `#f0c24c` gold, `white/opacity`) matching the hero and auth pages. No new backend work needed.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, react-router-dom, lucide-react, existing `useAuth` hook, existing `useLangPath` i18n helper.

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `frontend/src/pages/DashboardPage/index.tsx` | Dashboard page component — scenario cards grid, stats, AI chat card |
| Modify | `frontend/src/App.tsx` | Route `/:lang/app` to DashboardPage, keep `/:lang/app/:caseId` for MapPage |
| Modify | `frontend/src/components/ProtectedRoute/index.tsx` | No changes needed — already wraps routes |
| Modify | `frontend/src/pages/AuthPage/index.tsx` | After login redirect to `/:lang/app` (dashboard) instead of `/app` |

---

### Task 1: Create DashboardPage Component

**Files:**
- Create: `frontend/src/pages/DashboardPage/index.tsx`

- [ ] **Step 1: Create the dashboard page file**

```tsx
import { Sun, TreePine, HardHat, Zap, MessageCircle, BarChart3, MapPin, Clock, LogOut } from 'lucide-react';
import { useLangPath, useTranslation } from '@/i18n';
import { useAuth } from '@/hooks/useAuth';

const SCENARIOS = [
  {
    id: 'apartments',
    icon: Sun,
    color: '#f0c24c',
    glow: 'rgba(240,194,76,0.12)',
    border: 'rgba(240,194,76,0.18)',
  },
  {
    id: 'trees',
    icon: TreePine,
    color: '#4ade80',
    glow: 'rgba(74,222,128,0.12)',
    border: 'rgba(74,222,128,0.18)',
  },
  {
    id: 'workers',
    icon: HardHat,
    color: '#60a5fa',
    glow: 'rgba(96,165,250,0.12)',
    border: 'rgba(96,165,250,0.18)',
  },
  {
    id: 'solar-flowers',
    icon: Zap,
    color: '#fb923c',
    glow: 'rgba(251,146,60,0.12)',
    border: 'rgba(251,146,60,0.18)',
  },
] as const;

const SCENARIO_COPY: Record<string, Record<string, { title: string; description: string }>> = {
  en: {
    apartments: { title: 'Apartments', description: 'Shadow analysis for buildings and optimal sun exposure by facade.' },
    trees: { title: 'Tree Planting', description: 'Find the best spots to plant trees for summer shade and winter light.' },
    workers: { title: 'Workers', description: 'Plan outdoor crew rotations based on sun and shade conditions.' },
    'solar-flowers': { title: 'Solar Flowers', description: 'Identify optimal placements for solar trackers and panels.' },
  },
  ru: {
    apartments: { title: 'Квартиры', description: 'Анализ теней зданий и оптимальная инсоляция по фасадам.' },
    trees: { title: 'Посадка деревьев', description: 'Лучшие точки для посадки деревьев: тень летом, свет зимой.' },
    workers: { title: 'Рабочие', description: 'Планирование ротации бригад на основе солнца и тени.' },
    'solar-flowers': { title: 'Солнечные панели', description: 'Оптимальное размещение солнечных трекеров и панелей.' },
  },
  kk: {
    apartments: { title: 'Пәтерлер', description: 'Ғимараттардың көлеңке талдауы және фасад бойынша күн сәулесі.' },
    trees: { title: 'Ағаш отырғызу', description: 'Жазда көлеңке, қыста жарық үшін ең жақсы нүктелер.' },
    workers: { title: 'Жұмысшылар', description: 'Күн мен көлеңке жағдайына байланысты бригадалар ротациясы.' },
    'solar-flowers': { title: 'Күн панельдері', description: 'Күн трекерлері мен панельдерін оңтайлы орналастыру.' },
  },
};

const DASHBOARD_COPY: Record<string, { welcome: string; scenarios: string; stats: string; aiChat: string; aiChatDesc: string; telegramBtn: string; analyses: string; locations: string; lastActive: string; signOut: string }> = {
  en: {
    welcome: 'Welcome back',
    scenarios: 'Scenarios',
    stats: 'Overview',
    aiChat: 'AI Sun Advisor',
    aiChatDesc: 'Ask about sunlight, shadows, and urban planning — via web chat or Telegram bot.',
    telegramBtn: 'Open Telegram Bot',
    analyses: 'Analyses run',
    locations: 'Locations explored',
    lastActive: 'Last active',
    signOut: 'Sign out',
  },
  ru: {
    welcome: 'С возвращением',
    scenarios: 'Сценарии',
    stats: 'Обзор',
    aiChat: 'AI Sun Advisor',
    aiChatDesc: 'Спросите о солнце, тенях и городском планировании — через веб-чат или Telegram бота.',
    telegramBtn: 'Открыть Telegram бот',
    analyses: 'Анализов проведено',
    locations: 'Локаций изучено',
    lastActive: 'Последняя активность',
    signOut: 'Выйти',
  },
  kk: {
    welcome: 'Қайта қош келдіңіз',
    scenarios: 'Сценарийлер',
    stats: 'Шолу',
    aiChat: 'AI Sun Advisor',
    aiChatDesc: 'Күн, көлеңке және қала жоспарлау туралы сұраңыз — веб-чат немесе Telegram бот арқылы.',
    telegramBtn: 'Telegram ботты ашу',
    analyses: 'Талдаулар жүргізілді',
    locations: 'Локациялар зерттелді',
    lastActive: 'Соңғы белсенділік',
    signOut: 'Шығу',
  },
};

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const { language } = useTranslation();
  const langPath = useLangPath();
  const copy = DASHBOARD_COPY[language] ?? DASHBOARD_COPY.en;
  const scenarioCopy = SCENARIO_COPY[language] ?? SCENARIO_COPY.en;

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
              {copy.signOut}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Welcome */}
        <div className="mb-10">
          <p className="ui-mono text-[10px] uppercase tracking-[1.2px] text-white/30">{copy.welcome}</p>
          <h1 className="mt-1 font-display text-3xl font-medium tracking-[-0.03em] text-white">
            {user?.email?.split('@')[0] ?? 'User'}
          </h1>
        </div>

        {/* Stats row */}
        <div className="mb-10 grid grid-cols-3 gap-4">
          {[
            { label: copy.analyses, value: '12', icon: BarChart3 },
            { label: copy.locations, value: '5', icon: MapPin },
            { label: copy.lastActive, value: 'Today', icon: Clock },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] p-5 flex items-center gap-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0c24c]/10 ring-1 ring-[#f0c24c]/20">
                <stat.icon className="h-4 w-4 text-[#f0c24c]" />
              </div>
              <div>
                <div className="text-xl font-semibold text-white">{stat.value}</div>
                <div className="ui-mono text-[10px] text-white/30 uppercase tracking-[0.5px]">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Scenarios section */}
        <div className="mb-4">
          <p className="ui-mono text-[10px] uppercase tracking-[1.2px] text-white/30">{copy.scenarios}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {SCENARIOS.map((s) => {
            const sc = scenarioCopy[s.id];
            return (
              <a
                key={s.id}
                href={langPath(`/app/${s.id}`)}
                className="group rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] p-6 transition-all duration-200 hover:ring-white/[0.12] hover:bg-white/[0.05]"
                style={{ boxShadow: `0 0 0 0 ${s.glow}` }}
                onMouseEnter={(e) => { (e.currentTarget.style.boxShadow = `0 4px 30px ${s.glow}`); }}
                onMouseLeave={(e) => { (e.currentTarget.style.boxShadow = `0 0 0 0 ${s.glow}`); }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1"
                    style={{ background: `${s.color}15`, borderColor: s.border, ringColor: s.border }}
                  >
                    <s.icon className="h-5 w-5" style={{ color: s.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-semibold text-white group-hover:text-white/90">{sc.title}</div>
                    <p className="mt-1 text-[12.5px] leading-[1.5] text-white/35">{sc.description}</p>
                  </div>
                  <svg className="h-4 w-4 shrink-0 text-white/20 mt-1 group-hover:text-white/40 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>
                </div>
              </a>
            );
          })}
        </div>

        {/* AI Chat card */}
        <div className="rounded-2xl bg-white/[0.03] ring-1 ring-[#f0c24c]/15 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f0c24c]/10 ring-1 ring-[#f0c24c]/20">
            <MessageCircle className="h-5 w-5 text-[#f0c24c]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-white">{copy.aiChat}</div>
            <p className="mt-1 text-[12.5px] leading-[1.5] text-white/35">{copy.aiChatDesc}</p>
          </div>
          <a
            href="https://t.me/alem_aiI_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-2 rounded-xl bg-[#f0c24c] px-5 py-2.5 text-sm font-semibold text-[#06080f] hover:bg-[#f0c24c]/90 transition-colors shadow-[0_4px_20px_rgba(240,194,76,0.2)]"
          >
            {copy.telegramBtn}
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>
          </a>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/DashboardPage/index.tsx
git commit -m "feat: add DashboardPage component"
```

---

### Task 2: Update Routes in App.tsx

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add DashboardPage import and update routes**

In `App.tsx`, add the import at the top with other page imports:

```tsx
import DashboardPage from '@/pages/DashboardPage';
```

Then change the `app` route from MapPage to DashboardPage:

```tsx
{/* Change this line: */}
<Route path="app" element={<ProtectedRoute><MapPage /></ProtectedRoute>} />

{/* To this: */}
<Route path="app" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
```

The `app/:caseId` route stays unchanged — it still renders MapPage.

Also update the legacy redirect:

```tsx
{/* Change: */}
<Route path="/app" element={<Navigate to="/en/app" replace />} />

{/* Stays the same — this is fine, it now goes to dashboard */}
```

- [ ] **Step 2: Verify compilation**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: route /:lang/app to DashboardPage"
```

---

### Task 3: Fix Auth Redirect to Dashboard

**Files:**
- Modify: `frontend/src/pages/AuthPage/index.tsx`

- [ ] **Step 1: Update post-login redirect**

The current `AuthPage` navigates to `/app` after login. This already redirects to `/en/app` via the legacy route, which now shows the dashboard. **No change needed** — the redirect chain works:

```
/app → /en/app → DashboardPage ✓
```

Verify by reading the file. If it uses `navigate('/app')`, this is correct.

- [ ] **Step 2: Commit (skip if no changes)**

---

### Task 4: Update Landing Page CTA Links

**Files:**
- Modify: `frontend/src/pages/LandingPage/index.tsx`

- [ ] **Step 1: Update "Open Map" CTA to point to dashboard**

Change the `ctaButtonHref` from a specific scenario to the dashboard:

```tsx
{/* Change: */}
ctaButtonHref={langPath('/app/apartments')}

{/* To: */}
ctaButtonHref={langPath('/app')}
```

Also update the CTA button text prop if needed. The `l.hero.openMap` i18n key is fine as-is.

- [ ] **Step 2: Verify compilation**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/LandingPage/index.tsx
git commit -m "feat: point landing CTA to dashboard"
```

---

### Task 5: Build, Test, Push

- [ ] **Step 1: Run full TypeScript check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 2: Test locally**

Run: `cd frontend && npm run dev`

Verify flow:
1. Visit `localhost:5173` → landing page with "Open Map" button
2. Click "Open Map" → redirects to `/auth` (not logged in)
3. Log in → redirects to `/en/app` → **dashboard** with 4 scenario cards
4. Click any scenario card → opens map tool at `/en/app/apartments` etc.
5. "Open Telegram Bot" button opens `t.me/alem_aiI_bot` in new tab

- [ ] **Step 3: Rebuild Docker**

```bash
docker compose -f docker-compose/app.yml --env-file envs/dev.env down -v
docker compose -f docker-compose/app.yml --env-file envs/dev.env build --no-cache
docker compose -f docker-compose/app.yml --env-file envs/dev.env up -d
```

- [ ] **Step 4: Final commit and push**

```bash
git add -A
git commit -m "feat: complete dashboard page with scenarios, stats, and AI chat card"
git push origin main
```
