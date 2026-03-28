# Shadow Map

An interactive map that visualizes real-time building and terrain shadows for any date and time of day. Click anywhere on the map to check whether a location is in sunlight or shade.

## Features

- **Real-time shadows** — drag the time slider and shadows move instantly
- **Terrain shadows** — elevation data from AWS Open Data (always visible)
- **Building shadows** — loads buildings from OpenStreetMap at zoom ≥ 15
- **Sun exposure mode** — shows how many hours of sunlight a location receives across the day
- **Click to check** — click any point to see if it is in sun or shade at the selected time

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and add your ShadeMap API key:

```
VITE_SHADEMAP_API_KEY=your_key_here
```

Get a free key at [shademap.app/about](https://shademap.app/about/).

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |

## Tech Stack

- [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vite.dev)
- [Tailwind CSS v3](https://tailwindcss.com)
- [Leaflet](https://leafletjs.com) — map rendering
- [leaflet-shadow-simulator](https://www.npmjs.com/package/leaflet-shadow-simulator) — shadow engine
- [Overpass API](https://overpass-api.de) + [osmtogeojson](https://www.npmjs.com/package/osmtogeojson) — building data

## Project Structure

```
src/
├── config/        # Map constants (center, zoom, colors, terrain source)
├── types/         # Shared TypeScript types
├── services/      # Pure async functions (Overpass API)
├── hooks/         # useDateTime, useShadeMapSetup
├── components/    # Pure UI components (ControlPanel, SunInfoPopup, MapView)
└── pages/         # MapPage — orchestrates hooks and components
```
