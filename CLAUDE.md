# Hierarch — Claude Handoff

> Last updated: 2026-03-18

## What This Is
Hierarch is a React-based task and project management app built for designers. Projects move through design phases (Research, Explore, Design, Iterate, Review, Handoff) while tasks have simple statuses (To Do, In Progress, Review, Done). Includes an Overview dashboard with a real-time Recent Progress feed, board/list views, inline focus timer, capacity planning, artifacts (rich text notes + links + embeds), a blockers system, and working Linear and Figma integrations via OAuth with webhook-based real-time updates.

## Status
The Overview page has a full-height Recent Progress panel that shows an immutable event ledger from Linear webhooks (via Supabase Realtime), local task/project activity, and Figma comments. Linear webhook pipeline is live: edge function receives events, stores them in `linear_events` table, and the client auto-updates via Supabase Realtime subscriptions. This session also unified all status/phase selectors, redesigned the Linear issue drawer to use the standard floating drawer shell, added assignee picker and team members API, renamed task Feedback status to Review, and polished the Briefing layout. Next: Jira integration (same webhook pattern), re-enable Linear webhook signature verification, and submit Figma app for review.

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
- **Edge function deploy**: `npx supabase functions deploy server --project-ref bccmvisblpuiceuowfez --no-verify-jwt`

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

### Linear Webhooks (Real-time)
- `linear_events` Supabase table stores webhook events (action, type, title, status, assignee, actor, etc.)
- `POST /server/linear/webhook` — public endpoint receives Linear webhook events, inserts into `linear_events`
- **HMAC signature verification temporarily disabled** — need to fix and re-enable (`LINEAR_WEBHOOK_SECRET` env var is set)
- Edge function deployed with `--no-verify-jwt` so Linear can POST without auth
- Supabase Realtime enabled on `linear_events` table (REPLICA IDENTITY FULL)
- Client subscribes to Realtime: App.tsx for Recent Progress feed, LinearView for issues table auto-refresh
- `pg_cron` job runs daily at 3am UTC to delete events older than 15 days
- Linear webhook configured in Linear API settings: Issues + Comments + Issue Labels checked
- Webhook URL: `https://bccmvisblpuiceuowfez.supabase.co/functions/v1/server/linear/webhook`

### Linear Integration (Client)
- `src/app/components/LinearView.tsx` — issues table with priority bars, assignee picker (`PickerPopover`), status selector (2-col grid popover)
- Issue drawer uses standard floating drawer shell (matches `UnifiedDrawer` pattern)
- `linearApi.getTeamMembers()` fetches team members for assignee picker
- `linearApi.updateIssue()` supports `assigneeId` for changing assignees
- Figma URL field in drawer syncs to Linear as attachment
- Description shows linkified URLs, video embeds (YouTube/Vimeo/Loom), Figma thumbnail previews
- Team ID stored in localStorage (`hierarch-linear-team`)

### Figma Comments (Webhook-based)
- `figma_webhooks` table stores registered webhooks (team_id, passcode, owner_id)
- `figma_comments` table stores incoming comments (GIN index on `mentions` array)
- `POST /server/figma/webhook` — public endpoint receives Figma FILE_COMMENT events, verifies passcode, upserts comments
- FigmaView reads from `figma_comments` table filtered by user's Figma ID (mentions or authored)
- **Figma OAuth app is in draft/pending review** — works on localhost only, gated behind "Coming Soon" on production
- **Unread badge**: `use-figma-unread.ts` polls `figma_comments` table every 30s — **migrate to Supabase Realtime** (priority)

### Supabase Edge Function Secrets
- `LINEAR_CLIENT_ID`, `LINEAR_CLIENT_SECRET`, `LINEAR_WEBHOOK_SECRET`
- `FIGMA_CLIENT_ID`, `FIGMA_CLIENT_SECRET`
- After changing edge function code, must redeploy: `npx supabase functions deploy server --project-ref bccmvisblpuiceuowfez --no-verify-jwt`

## Architecture: Two-Level Status System

### Project Phases (`PROJECT_PHASES` in types.ts)
Projects move through 6 design phases stored in `project.metadata.phase`:
- **Research** (rose) → **Explore** (violet) → **Design** (blue) → **Iterate** (amber) → **Review** (orange) → **Handoff** (emerald)
- Phase changes tracked in `project.metadata.phaseHistory` (array of `PhaseTransition`)
- Entering "review" phase auto-creates a feedback artifact associated with the project

### Task Statuses (`DEFAULT_STATUSES` in types.ts)
Tasks have 4 simple statuses stored in the `tasks.status` DB column:
- **To Do** (slate) → **In Progress** (blue) → **Review** (orange, `isFeedback: true`, id=`feedback`) → **Done** (emerald, `isDone: true`)
- `LEGACY_STATUS_MAP` maps old phase IDs to new task statuses on DB read
- Statuses cached in localStorage (`hierarch-statuses`), auto-reset when titles change vs defaults

## Architecture: Recent Progress Feed
- `src/app/components/Briefing.tsx` — Overview page with full-height Recent Progress panel flush to right edge
- Feed shows immutable event ledger (7-day window): task status changes, project phase changes, task/artifact/project creation, artifact edits, Linear webhook events, Figma comments
- Linear events read from `linear_events` Supabase table (not API snapshots) — events persist even if issue state changes later
- Contextual subtext: "Changed to [status]", "Issue created", "Assigned to [name]", "Comment by [actor]", "Comment from [handle]"
- `App.tsx` calls `useLinearToken()` and `useFigmaToken()` at top level for feed data
- Realtime subscription on `linear_events` auto-refreshes feed when webhooks arrive

## Architecture Notes
- `src/app/App.tsx` — root component, manages all state. OAuth callback handlers. Drawer system uses `drawerStack: DrawerFrame[]`. Calls `useLinearToken()` and `useFigmaToken()` for Recent Progress feed.
- `src/app/components/UnifiedDrawer.tsx` — standard drawer shell: floating rounded panel, spring animations, breadcrumb nav
- `src/app/components/TaskDetailsDrawer.tsx` — exports `PickerPopover` (searchable dropdown) for reuse across drawers
- `src/app/components/LinearView.tsx` — subscribes to `linear_events` Realtime for auto-refresh
- `src/app/components/IntegrationsPage.tsx` — Figma gated behind `comingSoon: window.location.hostname !== 'localhost'`
- `src/app/components/NoteDrawer.tsx` — rich text editor with `contentEditable`, `formatBlock` wraps tags in angle brackets for browser compat. Font sizes: p=12px, h3=14px, h2=18px, h1=24px.
- `src/app/components/ProjectDrawerContent.tsx` — `handlePhaseChange` records transitions in `metadata.phaseHistory` and auto-creates feedback artifact on review phase
- `src/app/components/Sidebar.tsx` — nav items use `pl-1.5 pr-3` padding
- All status/phase selectors use unified design: `rounded-lg bg-surface hover:bg-surface-hover` trigger, 2-column grid popover with `bg-accent/50` active state
- `supabase/functions/server/index.ts` — all edge function routes (signup, avatar, time-entries, delete-account, Linear OAuth x4, Linear webhook, Figma OAuth x4, Figma webhook x3)

## Blockers System
- **Task blockers** (Supabase): `task_blockers` table with RLS
- **Project blockers** (metadata JSONB): `BlockerItem` type with optional type/owner/createdAt/resolvedAt
- **Dashboard**: blocked tasks appear in "Needs Attention" with highest priority

## Theme System
- CSS variables in `src/styles/theme.css` under `.light` and `.dark` classes
- Custom tokens: `--shell`, `--drawer`, `--surface`, `--surface-hover`, `--attention`, `--shell-border`
- `.invert-on-light` class for white SVG logos (Linear, arrow-down-right)

## Recent Changes (this session)
- Built Linear webhook pipeline: `linear_events` table, edge function endpoint, Supabase Realtime subscriptions, 15-day cleanup cron
- Redesigned Linear issue drawer to standard floating drawer shell with assignee picker, Figma sync, video/Figma previews
- Unified all status/phase/type selectors to consistent design
- Renamed task "Feedback" status to "Review" (id unchanged for backwards compat)
- Recent Progress panel: full-height, flush-right, immutable event ledger from Linear webhooks + local activity + Figma comments
- Project phase change tracking in metadata.phaseHistory
- Auto-create feedback artifact on project review phase
- Rich text editor font size fixes and paragraph switching fix
- Active projects: subtle bg treatment, anglearrow icon, spacing
- Sidebar padding adjustment, Figma Coming Soon gate on production

## What's Next
- **Jira integration**: Same webhook-based pattern as Linear (edge function routes, `jira_events` table, Realtime, JiraView component)
- **Re-enable Linear webhook HMAC signature verification** (currently disabled — fix hex comparison or encoding)
- **Submit Figma app for review** to enable production OAuth
- **Replace Figma unread polling** with Supabase Realtime subscription on `figma_comments`
- **Build Insights view**: phase analytics (avg feedback rounds, time per phase, completion funnel)
- **Push to GitHub**: commit and push all changes

## Known Issues / Gotchas
- **Linear webhook signature verification is disabled** — edge function logs show 401 even with correct secret. Need to debug HMAC hex comparison. Endpoint is currently open (no auth).
- Edge function deployed with `--no-verify-jwt` — required for webhooks but means all routes skip Supabase JWT check. Internal routes still check auth via `getAuthUser()`.
- Deno KV is broken on Supabase Edge Functions — time-entries endpoint returns 500. OAuth state uses sessionStorage instead of KV.
- Existing Supabase tasks have old phase IDs as status values — `LEGACY_STATUS_MAP` auto-maps them on read but doesn't update the DB
- Supabase Free plan pauses projects after 1 week inactivity
- Artifacts stored in localStorage, not Supabase — could desync across devices
- Figma OAuth app in draft/pending review — works on localhost only
- Linear OAuth callback URLs registered: localhost:3000, hierarchical.app, hierarch.vercel.app
- Figma OAuth callback URLs registered: same three origins
- Deploy requires `--scope acportfolio`: `npx vercel deploy --prod --yes --scope acportfolio`
- Figma webhook endpoint is public with passcode-only validation (no rate limiting or HMAC signing)
