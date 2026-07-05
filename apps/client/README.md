# @difflane/client

Difflane frontend — Milestone 1 (Foundation).

This app was scaffolded standalone (its own `package.json`, deployable on its
own) rather than as a pnpm workspace package, since M1 only touches
`apps/client` and the rest of the monorepo (`apps/server`, `packages/`) does
not exist yet in this repo.

## Setup

```bash
npm install
npm run dev        # start the Vite dev server
npm run build       # type-check + production build
npm run typecheck   # tsc only, no emit
npm run lint         # eslint
```

## What's in this milestone

- React + Vite + TypeScript + Tailwind CSS v3 + React Router v6
- Global app shell (sidebar + header) and public marketing layout
- Shared UI foundation in `src/components/common`
- Dark theme only, using the frozen "Difflane Slate" design tokens
  (`tailwind.config.ts`)
- Landing page and Dashboard implemented pixel-for-pixel against the approved
  Stitch designs
- Placeholder routes for `/create-room`, `/join-room`, `/workspace`,
  `/history`, `/settings` (content arrives in later milestones)

## What's intentionally NOT here

Monaco, Socket.io, Yjs, backend calls, GitHub integration, comments,
presence, history/search/settings logic. See
`Milestone_01_Implementation_Guide.md` in the project docs for the full scope
boundary. The `src/components/{workspace,editor,review,presence,history,search,settings}`
folders exist (per the frozen folder structure) but intentionally contain
only a `.gitkeep` — no logic should be added to them until their milestone.

## Notes / assumptions made during this milestone

- `hooks/`, `services/`, `lib/`, `store/`, `types/` were **not** created.
  They're part of the frozen folder structure but weren't in M1's "Allowed
  Files" list, and there's no business/service logic yet for them to hold.
- Create Room / Join Room render inside the public `MarketingLayout` (no
  sidebar); Dashboard / Workspace / History / Settings render inside the
  authenticated `AppLayout` (with sidebar). There's no auth in the MVP, so
  this split is an assumption based on the product's Entry vs. Dashboard
  flow — flag if that's wrong and it's a one-line change in `App.tsx`.
- The dashboard sidebar's "Activity" and "Repositories" links point at
  `/history` and `/workspace` respectively, since M1's route list has no
  dedicated page for them yet (see comment in `src/constants/navigation.ts`).
