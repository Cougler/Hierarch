# Hierarch — Claude Handoff

> Last updated: 2026-03-16

## What This Is
Hierarch is a React-based task and project management app built for designers. It uses nonlinear design phases (Explore, Define, Refine, Feedback, Handoff), an Overview dashboard, board/list views, inline focus timer, capacity planning, artifacts (rich text notes + links + Figma files), and a working Linear integration.

## Status
The Integrations page is live with Linear, Jira, Slack, and Figma cards. Linear connect flow uses a custom drawer matching the app's design system. The sidebar conditionally shows integrations as a section (when connected) or a single nav item (when not). Linear OAuth migration is planned and scoped — replacing localStorage token storage with Supabase-backed OAuth for proper user isolation and security. A new data-flow audit agent joins the review team. Next: create Linear OAuth app, build the OAuth flow (edge function + callback + integrations table), then wire up demo mode with fake Linear data.

## Stack
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind v4 + shadcn/ui (Radix primitives)
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

## Architecture Notes
- `src/app/App.tsx` — root component, manages all state, routes views via `activeView` string. Drawer system uses `drawerStack: DrawerFrame[]` with `pushDrawerTask`, `pushDrawerArtifact`, `handleDrawerBack` for stack-based navigation. `closeAllDrawers()` clears stack + all selected items. `handleTaskUpdate` auto-records `PhaseTransition` on every status change and auto-creates an artifact (type `feedback`, with `taskId` set) when entering a phase with `isFeedback: true`. Mobile gets standalone fallback drawers since `UnifiedDrawer` returns null on mobile.
- `src/app/components/UnifiedDrawer.tsx` — single drawer shell for desktop. Renders `ProjectDrawerContent`, `TaskDetailsDrawer` (embedded), or `NoteDrawer` (embedded) based on current stack frame. `AnimatePresence mode="popLayout"` with directional slide transitions. Navigation bar with back button and breadcrumb trail. Fixed position `top-8 right-8 bottom-8 w-[420px]`.
- `src/app/components/ProjectDrawerContent.tsx` — extracted project drawer content. Self-contained: computes its own filtered tasks, notes, attention items from raw props.
- `src/app/components/TaskDetailsDrawer.tsx` — task detail panel. `embedded` prop skips the shell and returns just content. Phase pill selector, PickerPopover for project, unified due date+time in single popover, linked artifacts section, phase history.
- `src/app/components/NoteDrawer.tsx` — rich-text artifact editor. `embedded` prop skips shell. 10 artifact types. Rich text toolbar: bold, italic, heading dropdown (H1/H2/H3/P), lists, link (Cmd+K). Figma type shows URL input with oEmbed thumbnail.
- `src/app/components/Briefing.tsx` — Overview dashboard. Metric cards (top/bottom borders, no bg). Active Projects as cards with project icons (gray) and "X needs attention" indicators. Recent Progress in glass container with unified activity feed.
- `src/app/components/Sidebar.tsx` — nav items: Overview, All Tasks, Artifacts, Capacity. Projects section with inline list, context menus, inline creation. Integrations: shows as section with connected providers when any are connected, or single "Integrations" nav item with plug icon above account dropdown when none connected. Linear shown with actual SVG logo.
- `src/app/components/IntegrationsPage.tsx` — grid of integration cards (Linear, Jira, Slack, Figma). Linear: clickable, opens connect drawer when not connected or navigates to Linear view when connected. Others show "Coming soon" badge. Connect drawer uses app's custom drawer design (motion.div, spring animations, pill close button matching UnifiedDrawer).
- `src/app/components/LinearView.tsx` — Linear issue board. Token currently from localStorage (`hierarch-linear-token`). Shows fallback message when not connected. Full-page setup screen removed — connect flow now in IntegrationsPage.
- `src/app/components/ProjectDetails.tsx` — project page with editable name, icon picker (ghost variant, no border), "Details" button opening ProjectDetailsDrawer. Description removed from header (lives in details drawer only).
- `src/app/components/TaskBoard.tsx` — All Tasks page. List (CSS Grid table) and board (kanban) views. Resizable columns, search, sort, filter, group, multi-select bulk ops, DnD, inline task creation.
- `src/app/components/AttachmentsView.tsx` — Artifacts page. CSS Grid table with own column widths hook. Exports `ARTIFACT_TYPE_ICONS/COLORS/LABELS`.
- `src/app/api/data.ts` — all Supabase CRUD. Tasks encode `description` + `waitingFor` + `phaseHistory` as JSON in a single `description` column.
- `src/app/demo-data.ts` — STARTER_* (minimal for new accounts) and DEMO_* (realistic fake data for demo mode).
- `.claude/agents/` — 4 audit agents: security-audit, code-quality, consistency-check, data-flow. Run with `/audit`.

## Drawer System
- **Desktop**: `UnifiedDrawer` renders a single shell. Navigation stack (`DrawerFrame[]`) supports project → task → artifact with back navigation. Content slides directionally (push right, pop left). Breadcrumbs show type labels.
- **Mobile**: `UnifiedDrawer` returns null. Standalone `TaskDetailsDrawer` and `NoteDrawer` render as fallbacks in App.tsx.
- `DrawerFrame` type: `{ type: 'project'; projectId } | { type: 'task'; taskId } | { type: 'artifact'; artifactId }`
- `embedded` prop on TaskDetailsDrawer and NoteDrawer: when true, returns just content (no motion.div shell, no close button).
- **Custom drawer design**: `#1c1c1a` bg, `rounded-2xl`, `border-white/[0.08]`, spring scale animation (stiffness 420, damping 32, mass 0.7), pill close button (60px tall, slides in from right with delay). Used by UnifiedDrawer, ProjectDetailsDrawer, IntegrationsPage connect drawer, and NewProjectDrawer.

## Design Phases System
- **Phases**: Explore (violet) → Define (blue) → Refine (amber) → Feedback (orange) → Handoff (emerald)
- **Phase history**: stored as `PhaseTransition[]` in the task's `description` JSON blob
- **Feedback flow**: entering feedback phase auto-creates an `Artifact` with `type: 'feedback'` and `taskId` set, then opens the artifact drawer.

## Artifact Types
- **Original 4**: freeform, decision, feedback, research
- **New 6**: link, figma, prototype, screenshot, video, doc
- Each type has icon (Lucide), color, and label defined in `ARTIFACT_TYPE_ICONS/COLORS/LABELS` in AttachmentsView.tsx
- Figma type: URL input validates against `figma.com/(file|design|proto|board)/` pattern, fetches oEmbed thumbnail

## Linear OAuth Migration (Planned)
Currently Linear tokens are stored in localStorage (`hierarch-linear-token`), which causes cross-account bleed (token persists across logins on same browser). The planned fix:
1. **`integrations` table** in Supabase with RLS — stores `user_id`, `provider`, `access_token`, `refresh_token`, `scopes`, `provider_user_id`, `provider_team_id`
2. **Edge function routes** on existing Hono server: authorize (generates OAuth URL), callback (exchanges code for token), disconnect (revokes + deletes), token (returns token to frontend), list (returns connected providers)
3. **OAuth callback** in frontend — intercepts `/auth/callback/linear` URL on app load, exchanges code via edge function
4. **Frontend service** `src/app/api/integrations.ts` — wraps all edge function calls
5. **Prerequisite**: Create OAuth app in Linear developer settings (manual step, needs `client_id` + `client_secret`)
6. **`vercel.json` rewrites** needed so callback URL serves `index.html`

## DataTable Refactor Plan
Extracting a shared `DataTable` component from duplicated table patterns in TaskBoard (list view) and AttachmentsView. Both implement: CSS Grid layout, resizable column widths, search/sort/filter/group toolbar, group headers, row animations, empty states. Domain-specific features (selection, DnD, inline creation) stay in parent components.

## Recent Changes (this session)
- Created IntegrationsPage with Linear, Jira, Slack, Figma cards and custom connect drawer
- Sidebar integrations: conditional section (connected) vs nav item (not connected)
- Replaced Layers icon with Linear SVG logo in sidebar and integrations page
- Removed full-page Linear setup screen from LinearView
- Removed "active tasks" from Overview header, description from project page header
- "Edit details" → "Details", ProjectDetailsDrawer close button matches UnifiedDrawer
- Project icons in Active Projects section (gray), icon picker ghost variant
- Project name + icon vertically centered in project header
- Planned full Linear OAuth migration (documented above)
- Created data-flow audit agent, updated /audit to run 4 agents

## What's Next
- **Create Linear OAuth app** in Linear developer settings (manual step)
- **Build Linear OAuth flow**: integrations table, edge function routes, frontend callback, integrations.ts service
- **Demo mode Linear data**: fake issues for demo account
- **Deploy latest changes** to Vercel
- **Build Insights view**: phase analytics (avg feedback rounds, time per phase, completion funnel)
- **DataTable refactor**: extract shared component, refactor TaskBoard and AttachmentsView

## Known Issues / Gotchas
- Linear token in localStorage bleeds across accounts on same browser — OAuth migration will fix this
- Existing Supabase tasks have old status IDs (`backlog`, `in-progress`, `review`, `done`) — `LEGACY_STATUS_MAP` is ready but auto-migration on load isn't wired up yet
- Statuses auto-reset from localStorage when IDs don't match `DEFAULT_STATUSES`
- `due_at` DB column: app stores `'yyyy-MM-ddTHH:mm'` (local time, no timezone) — column is `timestamptz`
- Supabase Free plan pauses projects after 1 week inactivity
- `ProjectsPage.tsx`, `TodayOverview.tsx`, `FocusTimerWidget.tsx`, `PhaseRing.tsx`, `FeedbackPrompt.tsx` still exist on disk but are no longer imported — can be deleted
- Deploy requires `--scope acportfolio`: `npx vercel deploy --prod --yes --scope acportfolio`
- Sidebar nav still uses `activeView === 'today'` for the Overview tab
- `useColumnWidths` hook and `useArtifactColumnWidths` are duplicated logic — will be unified in DataTable refactor
