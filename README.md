# Savorly

Savorly is a recipe discovery and kitchen planning application.

## Stack

- React 19, TypeScript 6, Vite 8
- React Router 8 for routing
- TanStack Query 5 and its devtools for data fetching and caching
- shadcn/ui on Base UI, styled with Tailwind CSS 4
- React Hook Form with Zod 4 for forms and validation
- Zustand 5 for client state
- Axios for HTTP requests

## Getting started

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

## Scripts

| Script                       | Description                                       |
| ---------------------------- | ------------------------------------------------- |
| `npm run dev`                | Start the Vite dev server with HMR                |
| `npm run build`              | Type-check, then build for production             |
| `npm run lint`               | Run ESLint                                        |
| `npm run preview`            | Serve the production build locally                |
| `npm run uipro`              | Install the UI/UX Pro Max skill                   |
| `npm run impeccable:install` | Install the Impeccable design skills and commands |

## Agent tooling

Two design skill packs back the agent workflow in this repo. Both are safe to
re-run to pick up a newer version.

Install the UI/UX Pro Max skill (palettes, fonts, UX guidance):

```bash
npm run uipro
```

Install the Impeccable skills and commands (design, critique, and polish
passes, plus anti-pattern detection) for both harnesses:

```bash
npm run impeccable:install
```

`uipro` resolves from the global `uipro-cli` package. If it is not installed,
run the equivalent directly:

```bash
npx uipro-cli init --ai opencode && npx uipro-cli init --ai codex
```

## Structure

```
src/
├── App.tsx                 # App shell: catalogue states and cross-tab sync
├── main.tsx                # Entry point: providers and router
├── router.ts               # Route table and breadcrumb handles
├── components/
│   ├── ui/                 # shadcn/ui primitives
│   ├── app-shared.tsx      # Navigation shell and page layout
│   ├── recipe-card.tsx     # Recipe card and recipe grid
│   └── primitives.tsx      # Shared app UI: badges, dialogs, empty states
├── domain/                 # Pure logic: scoring, pantry, taste, week maths
├── hooks/                  # Shared queries, personalisation and URL filters
├── lib/                    # API client, queries, storage, formatting, clipboard
├── pages/                  # One module per route
├── schemas/                # Zod 4 form schemas
├── stores/                 # Persisted Zustand stores
└── css/
    └── main.css            # Theme tokens and global styles
```

Kitchen data is local-first: each store persists under its own `savorly.*` key,
and the UI never writes to the recipe service except the creation
normalisation round-trip.
