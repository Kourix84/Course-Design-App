# Course Design App

Offline-first React PWA for deterministic showjumping course generation.

## Features

- Step-by-step wizard for arena setup, rider level, height, obstacle count, preferences, and training goals
- Rule-based deterministic course generator (no AI dependency)
- Validation engine with actionable fixes
- SVG arena renderer with draggable obstacle editing and order path
- Local storage save/load and wizard draft restore
- Export as image, PDF, and printable layout
- PWA installability and offline service worker support

## Project Structure

- `src/components/` – Wizard and arena renderer
- `src/data/` – rider levels, height bands, obstacle library
- `src/logic/` – generator, validation, and tests
- `src/utils/` – persistence and export helpers
- `public/` – manifest and service worker

## Development

```bash
npm install
npm run dev
```

## Quality Checks

```bash
npm run lint
npm run test
npm run build
```
