# Hierarch — Claude Handoff

> Last updated: 2026-03-23

## What This Is
Hierarch is a React-based task and project management app built for designers. Projects move through design phases (Research, Explore, Design, Iterate, Review, Handoff) while tasks have simple statuses (To Do, In Progress, Review, Done). Includes an Overview dashboard with a real-time Recent Progress feed, board/list views, inline focus timer, capacity planning, artifacts (rich text notes + links + embeds), a blockers system, and working Linear, Figma, and Jira integrations via OAuth with webhook-based real-time updates.

## Status
A comprehensive Design System page is live at /design-system, publicly accessible without auth, documenting all colors, typography, spacing, radii, elevation, buttons, inputs, badges, cards, icons, phases, statuses, and artifact types. Pushed 13 accumulated commits to GitHub covering months of feature work. Attempted Figma capture of screens via MCP but z-index conflicts with modals need resolution. Next: re-enable Linear webhook HMAC, submit Figma app for review, upgrade Supabase to Pro, build Insights view, make primary action buttons consistent.

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
- **Design System**: http://localhost:3000/design-system (or hierarchical.app/design-system)
- **Figma file**: https://www.figma.com/design/dXL0qSIa8HkE6IuhHoPjDC

## Architecture: Integrations System

### OAuth Flow (Linear + Figma + Jira)
- `integrations` Supabase table stores tokens per user per provider (RLS: owner_id = auth.uid())
- Edge function routes in `supabase/functions/server/index.ts`: `/linear/authorize`, `/linear/callback`, `/linear/refresh`, `/linear/disconnect` (same pattern for `/figma/*` and `/jira/*`)
- Client-side state validation via `sessionStorage` (not server KV, which is broken)
- Frontend hooks: `src/app/hooks/use-linear-token.ts`, `use-figma-token.ts`, `use-jira-token.ts` — single source of truth for token, viewer info, OAuth start, disconnect
- Custom events (`LINEAR_TOKEN_CHANGED`, `FIGMA_TOKEN_CHANGED`) broadcast state changes so all hook instances reload
- `App.tsx` handles OAuth callbacks: detects `/auth/linear/callback`, `/auth/figma/callback`, `/auth/jira/callback` paths, exchanges code, navigates to integration page
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
- Webhook URL: `https://bccmvisblpuiceuowfez.supabase.co/functions/v1/server/linear/webhook`

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

## Architecture: Design System Page
- `src/app/components/DesignSystemPage.tsx` — standalone page at `/design-system`
- Public (no auth required) — rendered before auth check in App.tsx
- 13 sections with sticky side nav: Brand, Colors (dark/light tabs), Typography, Spacing, Border Radii, Elevation, Buttons, Inputs & Controls, Badges, Cards, Icons, Phases & Statuses, Artifact Types
- Color swatches are click-to-copy (copies CSS variable name)
- Uses actual shadcn/ui components (Button, Badge, Input, Card, Checkbox, Switch, Tabs)

## Architecture Notes
- `src/app/App.tsx` — root component, manages all state. OAuth callback handlers. Drawer system uses `drawerStack: DrawerFrame[]`. `/design-system` route rendered before auth check. `/signup` detected on load to set authView.
- `src/app/components/UnifiedDrawer.tsx` — standard drawer shell: floating rounded panel, spring animations, breadcrumb nav
- `src/app/components/TaskDetailsDrawer.tsx` — exports `PickerPopover` (searchable dropdown) for reuse across drawers
- `src/app/components/LinearView.tsx` — subscribes to `linear_events` Realtime for auto-refresh
- `src/app/components/IntegrationsPage.tsx` — Figma gated behind `comingSoon: window.location.hostname !== 'localhost'`
- `src/app/components/NoteDrawer.tsx` — rich text editor with `contentEditable`, `formatBlock` wraps tags in angle brackets for browser compat. Font sizes: p=12px, h3=14px, h2=18px, h1=24px.
- All status/phase selectors use unified design: `rounded-lg bg-surface hover:bg-surface-hover` trigger, 2-column grid popover with `bg-accent/50` active state
- Theme tokens in `src/styles/theme.css`: `--shell`, `--drawer`, `--surface`, `--surface-hover`, `--attention`, `--shell-border`

## Recent Changes (this session)
- Built `DesignSystemPage.tsx` with 13 sections documenting the full design system
- Wired `/design-system` as a public route in App.tsx (rendered before auth check)
- Pushed 13 accumulated commits to origin/main
- Created Figma file "Hierarch" and captured design system + overview screens via Figma MCP
- Attempted onboarding capture but z-index conflict between capture toolbar and onboarding modal (z-50) prevented access

## What's Next
- **Re-enable Linear webhook HMAC signature verification** (currently disabled — fix hex comparison or encoding)
- **Submit Figma app for review** to enable production OAuth
- **Upgrade Supabase to Pro** for custom auth domain and Realtime
- **Build Insights view**: phase analytics (avg feedback rounds, time per phase, completion funnel)
- **Make primary action buttons consistent** across all views
- **Complete Figma file** with remaining screen captures (resolve z-index issue for modal captures)
- **Replace Figma unread polling** with Supabase Realtime subscription on `figma_comments`

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
- Figma MCP capture toolbar z-index conflicts with z-50 modals (onboarding dialog) — toolbar gets hidden behind overlay
