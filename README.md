# Food Wiki

Food Wiki is a recipe and food discovery application.

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
├── App.tsx                 # Root component
├── main.tsx                # Entry point, providers and router setup
├── components/
│   └── ui/                 # shadcn/ui components
├── lib/
│   └── utils.ts            # Shared helpers
└── css/
    └── main.css            # Global styles
```
