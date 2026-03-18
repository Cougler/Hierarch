# Hierarch — Claude Handoff

> Last updated: 2026-03-18

## What This Is
Hierarch is a React-based task and project management app built for designers. Projects move through design phases (Research, Explore, Design, Iterate, Review, Handoff) while tasks have simple statuses (To Do, In Progress, Feedback, Done). Includes an Overview dashboard, board/list views, inline focus timer, capacity planning, artifacts (rich text notes + links + embeds), a blockers system, and working Linear and Figma integrations via OAuth.

## Status
Linear and Figma OAuth integrations are fully built. Cost audit completed: no overnight billing risk (Supabase Free plan, static Vite SPA on Vercel, all polling is client-side only). Priority for next session: replace Figma unread 30s polling with Supabase Realtime subscriptions, then deploy edge function for Figma webhooks and build Insights view.

## Stack
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind v4 + shadcn/ui (Radix primitives) + `@custom-variant dark` for class-based dark mode
- **Backend**: Supabase (auth + Postgres) — project `bccmvisblpuiceuowfez` ("Pro UX Tasks") — **Free plan**
- **Edge Functions**: Hono framework on Deno (Supabase Edge Functions) — basePath `/server`
- **Drag & drop**: @dnd-kit
- **Animations**: Framer Motion (motion/react)
- **Deployment**: Vercel (`acportfolio` team, project `hierarch`)

## Key Locations
- **App**: `~/Apps/Hierarch/`
- **GitHub**: https://github.com/Cougler/Hierarch
- **Live URL**: https://hierarchical.app (also https://hierarch.vercel.app)
- **Dev server**: `npm run dev -- --port 3000` → http://localhost:3000
- **Supabase dashboard**: https://supabase.com/dashboard/project/bccmvisblpuiceuowfez
- **Edge function deploy**: `npx supabase functions deploy server --project-ref bccmvisblpuiceuowfez`

## Architecture: Integrations System

### OAuth Flow (Linear + Figma)
- `integrations` Supabase table stores tokens per user per provider (RLS: owner_id = auth.uid())
- Edge function routes in `supabase/functions/server/index.ts`: `/linear/authorize`, `/linear/callback`, `/linear/refresh`, `/linear/disconnect` (same pattern for `/figma/*`)
- Client-side state validation via `sessionStorage` (not server KV, which is broken)
- Frontend hooks: `src/app/hooks/use-linear-token.ts` and `use-figma-token.ts` — single source of truth for token, viewer info, OAuth start, disconnect
- Custom events (`LINEAR_TOKEN_CHANGED`, `FIGMA_TOKEN_CHANGED`) broadcast state changes so all hook instances reload
- `App.tsx` handles OAuth callbacks: detects `/auth/linear/callback` or `/auth/figma/callback` paths, exchanges code, navigates to integration page
- `vercel.json` has SPA rewrite so callback routes resolve in production
- 401 auto-retry: `linear.ts` has `setOnUnauthorized` callback wired from the hook for automatic token refresh

### Figma Comments (Webhook-based)
- `figma_webhooks` table stores registered webhooks (team_id, passcode, owner_id)
- `figma_comments` table stores incoming comments (GIN index on `mentions` array)
- `POST /server/figma/webhook` — public endpoint receives Figma FILE_COMMENT events, verifies passcode, upserts comments
- `POST /server/figma/webhook/register` — registers a webhook with Figma API for a team
- FigmaView reads from `figma_comments` table filtered by user's Figma ID (mentions or authored)
- Team setup screen prompts for Figma team URL on first use (extracts team ID, registers webhook)
- **Unread badge**: `use-figma-unread.ts` polls `figma_comments` table every 30s — **migrate to Supabase Realtime** (priority)

### Supabase Edge Function Secrets
- `LINEAR_CLIENT_ID`, `LINEAR_CLIENT_SECRET` — set via Supabase dashboard > Edge Functions > Manage Secrets
- `FIGMA_CLIENT_ID`, `FIGMA_CLIENT_SECRET` — same location
- After changing edge function code, must redeploy: `npx supabase functions deploy server --project-ref bccmvisblpuiceuowfez`
- Must run `npx supabase login` first (interactive browser auth)

## Architecture: Two-Level Status System

### Project Phases (`PROJECT_PHASES` in types.ts)
Projects move through 6 design phases stored in `project.metadata.phase`:
- **Research** (rose) → **Explore** (violet) → **Design** (blue) → **Iterate** (amber) → **Review** (orange) → **Handoff** (emerald)

### Task Statuses (`DEFAULT_STATUSES` in types.ts)
Tasks have 4 simple statuses stored in the `tasks.status` DB column:
- **To Do** (slate) → **In Progress** (blue) → **Feedback** (orange, `isFeedback: true`) → **Done** (emerald, `isDone: true`)
- `LEGACY_STATUS_MAP` maps old phase IDs to new task statuses on DB read

## Architecture Notes
- `src/app/App.tsx` — root component, manages all state. OAuth callback handlers for Linear and Figma. Drawer system uses `drawerStack: DrawerFrame[]`.
- `src/app/components/IntegrationsPage.tsx` — uses both `useLinearToken` and `useFigmaToken` hooks, shows connected account info, OAuth redirect, disconnect
- `src/app/components/LinearView.tsx` — uses `useLinearToken` hook (no more `LinearSetup` component or localStorage)
- `src/app/components/FigmaView.tsx` — threaded comment UI reading from `figma_comments` Supabase table. Team setup screen if no webhook registered. Thread list → chat view with reply.
- `src/app/components/Sidebar.tsx` — uses both token hooks + `useFigmaUnread` for badge. Shows connected integrations dynamically.
- `src/app/api/linear.ts` — GraphQL client with 401 auto-retry via `setOnUnauthorized`
- `src/app/api/figma.ts` — REST client, file key extraction, saved files tracking, unread timestamp tracking
- `supabase/functions/server/index.ts` — all edge function routes (signup, avatar, time-entries, delete-account, Linear OAuth x4, Figma OAuth x4, Figma webhook x3)

## Blockers System
- **Task blockers** (Supabase): `task_blockers` table with RLS
- **Project blockers** (metadata JSONB): `BlockerItem` type with optional type/owner/createdAt/resolvedAt
- **Dashboard**: blocked tasks appear in "Needs Attention" with highest priority

## Theme System
- CSS variables in `src/styles/theme.css` under `.light` and `.dark` classes
- Custom tokens: `--shell`, `--drawer`, `--surface`, `--surface-hover`, `--attention`, `--shell-border`
- `.invert-on-light` class for white SVG logos (Linear, arrow-down-right)

## Recent Changes (this session)
- Cost audit: confirmed no overnight billing risk (Supabase Free plan, Vite SPA on Vercel, client-side-only polling)
- Identified Figma unread 30s polling (`use-figma-unread.ts`) as optimization target for Supabase Realtime
- Identified public Figma webhook endpoint lacks rate limiting (passcode-only validation)

## What's Next
- **Priority: Replace Figma unread polling with Supabase Realtime subscription** on `figma_comments` table
- **Deploy edge function** with Figma webhook routes and test full comment flow
- **Add HMAC request signing** to Figma webhook endpoint for security
- **Build Insights view**: phase analytics (avg feedback rounds, time per phase, completion funnel)
- **Push to GitHub**: commit and push all changes
- **DataTable refactor**: extract shared component from TaskBoard and ArtifactsView
- **Continue light mode polish**: test all views for contrast/readability
- **Post-launch**: list Figma app in Figma Community

## Known Issues / Gotchas
- Deno KV is broken on Supabase Edge Functions — time-entries endpoint returns 500. OAuth state uses sessionStorage instead of KV.
- Existing Supabase tasks have old phase IDs as status values — `LEGACY_STATUS_MAP` auto-maps them on read but doesn't update the DB
- Supabase Free plan pauses projects after 1 week inactivity
- Artifacts stored in localStorage, not Supabase — could desync across devices
- Figma API doesn't expose team membership via `/me` — team ID must be provided manually via URL paste
- Figma `/teams/:id/projects` returns 404 on Professional plans (may need Organization plan for team browsing)
- Linear OAuth callback URLs registered: localhost:3000, hierarchical.app, hierarch.vercel.app
- Figma OAuth callback URLs registered: same three origins
- Deploy requires `--scope acportfolio`: `npx vercel deploy --prod --yes --scope acportfolio`
- Edge function files are `.ts` (not `.tsx`) — import path in index.ts references `./kv_store.ts`
- Figma webhook endpoint is public with passcode-only validation (no rate limiting or HMAC signing)
