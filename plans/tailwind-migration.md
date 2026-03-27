# Plan: Tailwind CSS v4 Migration

## Problem Analysis

### Double node_modules
- `/map/node_modules` — Tailwind установлен в **корне проекта** (неправильно)
- `/map/frontend/node_modules` — зависимости фронтенда (правильно)

Root `package.json` содержит конфликт версий:
- `tailwindcss: ^3.4.19` (v3)
- `@tailwindcss/postcss: ^4.2.2` (v4 плагин)

Это сломано. Нужно всё перенести в `frontend/` и использовать одну версию.

### Выбор версии: Tailwind v4
Tailwind v4 — нативная интеграция с Vite через `@tailwindcss/vite`.
- Не нужен `tailwind.config.js`
- Не нужен `postcss.config.js`
- Одна строка в CSS: `@import "tailwindcss"`
- Кастомные токены через `@theme {}` прямо в CSS

---

## Step-by-Step Plan

### Step 1 — Удалить мусор из корня
```
/map/node_modules/        → DELETE
/map/package.json         → DELETE
/map/package-lock.json    → DELETE
/map/tailwind.config.js   → DELETE
/map/postcss.config.js    → DELETE
```

### Step 2 — Установить Tailwind v4 в frontend/
```bash
cd frontend
npm install tailwindcss @tailwindcss/vite
```

### Step 3 — Подключить в vite.config.ts
```ts
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  ...
})
```

### Step 4 — Обновить index.css
```css
@import "tailwindcss";

/* Кастомные CSS-переменные для дизайна */
@theme {
  --color-panel-bg: rgba(8, 12, 28, 0.9);
  --color-accent: #4fc3f7;
  --color-sun: #ffd54f;
  --color-shade: #90caf9;
  --color-active: #69f0ae;
}

/* Кастомные анимации (не покрываются Tailwind) */
@keyframes pulse-dot { ... }
@keyframes slide-up  { ... }
```

### Step 5 — Мигрировать CSS файлы → Tailwind классы в JSX

Файлы для удаления после миграции:
```
components/ControlPanel/ControlPanel.css
components/SunInfoPopup/SunInfoPopup.css
components/MapView/MapView.css
pages/MapPage/MapPage.css
```

#### Маппинг классов

**MapPage (враппер)**
```
.map-page → className="relative w-screen h-screen overflow-hidden"
```

**MapView (контейнер карты)**
```
.mv__map → className="w-full h-full"
```

**ControlPanel**
```
.cp                 → absolute top-4 right-4 z-[1000] w-68 rounded-2xl p-[18px] ...
                      bg-[rgba(8,12,28,0.9)] backdrop-blur border border-white/[0.08]
                      text-[#e8eaf6] shadow-[0_12px_40px_rgba(0,0,0,0.5)]
.cp__title          → text-[15px] font-bold text-white tracking-[0.2px]
.cp__loader         → w-2 h-2 rounded-full bg-[#4fc3f7] animate-[pulse-dot_1.1s_ease-in-out_infinite]
.cp__label          → block text-[10px] font-semibold tracking-[0.9px] uppercase
                      text-[rgba(163,175,220,0.7)] mb-1.5
.cp__date-input     → w-full bg-white/[0.07] border border-white/[0.12] rounded-lg
                      text-[#e8eaf6] px-2.5 py-2 text-[13px] outline-none
                      focus:border-[rgba(79,195,247,0.5)] cursor-pointer
.cp__toggle-btn     → flex-1 py-2 text-xs font-medium rounded-lg border
                      border-white/[0.12] bg-white/[0.06] text-white/[0.55]
                      cursor-pointer transition-all hover:bg-white/10 hover:text-white/80
.cp__toggle-btn--active → bg-[rgba(79,195,247,0.18)] border-[rgba(79,195,247,0.6)] text-[#4fc3f7] font-semibold
.cp__hint-dot       → w-1.5 h-1.5 rounded-full bg-white/25 shrink-0 transition-colors
.cp__hint-dot--active → bg-[#69f0ae] shadow-[0_0_6px_rgba(105,240,174,0.7)]
```

**Слайдер (особый случай)**
Слайдер с градиентом по `--pct` CSS-переменной — нельзя сделать чистым Tailwind.
Решение: оставить 1 блок кастомного CSS только для стилей слайдера.

**SunInfoPopup**
```
.sip                → absolute bottom-7 left-1/2 -translate-x-1/2 z-[1000]
                      min-w-[230px] text-center rounded-xl px-6 py-3
                      bg-[rgba(8,12,28,0.92)] backdrop-blur border border-white/[0.1]
                      shadow-[0_8px_32px_rgba(0,0,0,0.45)] animate-[slide-up_0.2s_ease]
.sip__coords        → text-[11px] text-white/40 mb-1.5 tabular-nums
.sip__status--sun   → text-[#ffd54f] text-base font-bold
.sip__status--shade → text-[#90caf9] text-base font-bold
```

### Step 6 — Проверка
```bash
npx tsc --noEmit   # нет TS ошибок
npm run dev        # карта работает, стили применились
```

---

## Files Changed Summary

| Action | File |
|--------|------|
| DELETE | `/map/package.json` |
| DELETE | `/map/package-lock.json` |
| DELETE | `/map/tailwind.config.js` |
| DELETE | `/map/postcss.config.js` |
| DELETE | `/map/node_modules/` |
| MODIFY | `frontend/vite.config.ts` |
| MODIFY | `frontend/src/index.css` |
| MODIFY | `frontend/src/components/ControlPanel/index.tsx` |
| MODIFY | `frontend/src/components/SunInfoPopup/index.tsx` |
| MODIFY | `frontend/src/components/MapView/index.tsx` |
| MODIFY | `frontend/src/pages/MapPage/index.tsx` |
| DELETE | `frontend/src/components/ControlPanel/ControlPanel.css` |
| DELETE | `frontend/src/components/SunInfoPopup/SunInfoPopup.css` |
| DELETE | `frontend/src/components/MapView/MapView.css` |
| DELETE | `frontend/src/pages/MapPage/MapPage.css` |

## Notes

- Leaflet CSS (`leaflet/dist/leaflet.css`) — **не трогаем**, импортируется из npm
- Слайдер стили — оставляем минимальный CSS блок в `index.css` (градиент по CSS-переменной)
- Кастомные анимации — определяем в `index.css` через `@keyframes`
