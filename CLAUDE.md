# Hierarch — Claude Handoff

> Last updated: 2026-03-10

## What This Is
Hierarch is a React-based task and project management app built for designers — with nonlinear design phases, an Overview dashboard, board/list views, inline focus timer, capacity planning, resource management, design notes with rich text editing, and a working Linear integration with design-specific overlays (Figma links, design type tags, review checklists).

## Status
Overview page is polished and live — responsive two-column layout, unified activity feed (phase changes, notes, tasks, projects), project preview drawer, and all drawers close each other via centralized closeAllDrawers(). Linear issues now display as a table instead of kanban. Demo data and onboarding are rewritten with realistic projects and design-phase-focused content. Deployed to hierarchical.app. Next: build Insights view, continue design cockpit vision.

## Stack
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind v4 + shadcn/ui (Radix primitives)
- **Backend**: Supabase (auth + Postgres) — project `bccmvisblpuiceuowfez` ("Pro UX Tasks") — **Free plan**
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
- `src/app/App.tsx` — root component, manages all state, routes views via `activeView` string. `closeAllDrawers()` helper closes task drawer, new task drawer, note drawer, and project preview drawer before any drawer opens. `handleTaskUpdate` auto-records `PhaseTransition` on every status change and triggers `FeedbackPrompt` when entering a phase with `isFeedback: true`. `focusTask` state tracks which task has the active focus timer. Design notes state (`designNotes`, `selectedNote`, `noteDrawerOpen`) managed here with localStorage persistence. `previewProject` state lifted from Briefing into App.tsx for centralized drawer management.
- `src/app/components/Briefing.tsx` — Overview dashboard page. Glass morphism styling throughout (`bg-white/[0.04] backdrop-blur-xl border border-white/[0.08]`). Responsive grid: `[minmax(0,1fr)_360px]` — left column has active projects with hover highlights and needs-attention items merged under each project card; right column has unified Recent Progress feed in glass scrollable container with auto-hide scrollbar. `previewProject` and `onPreviewProjectChange` props controlled by App.tsx. Receives `designNotes`, `onNoteCreate`, `onNoteClick`, `onProjectUpdate` as props.
- `src/app/components/Briefing.tsx` — unified activity feed: `ActivityItem` union type with 5 variants (phase, task-created, note-created, note-edited, project-created), all filtered to last 48h, sorted newest-first. Each type has a distinct icon color.
- `src/app/components/NoteDrawer.tsx` — floating rich-text note editor. Desktop: motion.div panel (32px from top/right/bottom). Mobile: Radix Drawer. ContentEditable with toolbar (Bold/Italic/Heading/Lists/Quote/Divider), keyboard shortcuts (Cmd+B, Cmd+I), auto-save with 500ms debounce. Note type tabs: Freeform, Decision, Feedback, Research, Critique.
- `src/app/components/TaskDetailsDrawer.tsx` — floating task detail panel (32px from top/right/bottom). Shows project breadcrumb above title. Phase pills, project selector, due date with time, waiting for items, resources, phase journey.
- `src/app/components/NewTaskDrawer.tsx` — floating new task panel (32px from top/right/bottom, 520px wide).
- `src/app/components/LinearView.tsx` — Linear issues displayed as a table (not kanban) with columns: ID, Title, Status, Priority, Type, Assignee, Updated. Clicking a row opens the issue detail sheet.
- `src/app/components/Onboarding.tsx` — 4-step onboarding: Welcome (design phases positioning), Projects/Tasks/Notes, Overview page explanation with phase pipeline visual, Ready to Go.
- `src/app/api/data.ts` — all Supabase CRUD. Tasks encode `description` + `waitingFor` + `phaseHistory` as JSON in a single `description` column. `mapDbTaskToTask` now includes `createdAt` from `created_at`.
- `src/app/types.ts` — `Task` now has optional `createdAt` field. `PhaseTransition` (with `notes` field), `StatusConfig` with `isFeedback`/`isDone` flags, `DEFAULT_STATUSES` with design phase IDs.
- `src/styles/theme.css` — CSS variables, scrollbar styles, `.scrollbar-auto-hide` utility (thumb transparent by default, visible on hover via `scrollbar-color`). Primary color: dark `#cd8a3a` / light `#bf7535` (amber).
- `src/app/demo-data.ts` — realistic demo data: Noma Checkout Redesign, Wavelength Design System, Basecamp Mobile App, Sonder Brand Identity. Tasks have full `phaseHistory` and `createdAt`. Exports `DEMO_DESIGN_NOTES`.
- Demo mode: `localStorage['hierarch-demo'] = 'true'`. Data from `src/app/demo-data.ts`.
- localStorage keys all use `hierarch-*` prefix. Design notes: `hierarch-design-notes`. Timer state: `hierarch-timer-state`.

## Design Phases System
- **Phases**: Explore (violet) → Define (blue) → Refine (amber) → Feedback (orange) → Handoff (emerald)
- **Phase history**: stored as `PhaseTransition[]` in the task's `description` JSON blob — no DB migration needed
- **PhaseTransition**: `id`, `fromPhase`, `toPhase`, `timestamp`, `reviewer?`, `deadline?`, `notes?`
- **FeedbackPrompt.tsx**: dialog triggered when entering any phase with `isFeedback: true` — captures person/team, notes, and deadline
- **PhaseJourney.tsx**: vertical activity log, most recent first, capped at 4 items with expand toggle, shows feedback notes inline

## Drawer System
- All drawers (task details, new task, note, project preview) are managed in App.tsx
- `closeAllDrawers()` closes all four before any drawer opens — no overlapping drawers
- All desktop drawers positioned `top-8 right-8 bottom-8` (32px inset)
- Close buttons positioned 8px left of the drawer edge
- Mobile drawers use Radix Drawer component

## Recent Changes (this session)
- **Overview responsive layout**: `minmax(0,1fr)` for left column, `360px` fixed right column, removed `max-w-[1200px]` cap, `overflow-x-hidden` on left column
- **Linear table view**: replaced kanban board with sortable table (ID, Title, Status, Priority, Type, Assignee, Updated)
- **Unified activity feed**: Recent Progress now shows phase changes, task creation, note creation/editing, and project creation — each with distinct icon and color
- **Task `createdAt`**: added to type, mapped from Supabase `created_at`
- **Demo data rewrite**: realistic projects (Noma, Wavelength, Basecamp, Sonder) with full phase histories and `DEMO_DESIGN_NOTES`
- **Onboarding rewrite**: 4 steps focused on design phases, Overview page, and core concepts
- **Drawer management**: all drawers close each other via centralized `closeAllDrawers()`, project preview state lifted to App.tsx
- **Task drawer breadcrumb**: shows project icon + name above task title
- **Consistent drawer positioning**: all drawers 32px from top/right/bottom, close buttons snug against drawer edge
- **Overview UX**: project rows fully clickable with hover highlight, dividers more prominent, compact row height, "Add task" button uses primary color, scrollbar auto-hide without layout shift
- **Page renamed**: "Briefing" → "Overview" in sidebar and header
- **Deployed to hierarchical.app**

## What's Next
- **Insights view**: aggregate phase data — avg feedback rounds, time per phase, phase flow patterns, completion funnel
- **Design cockpit vision**: Hierarch as designer's home base pulling from multiple tools (Linear, Jira, ClickUp, Figma)
- **Auto-migrate existing tasks**: map old status IDs to new phase IDs on load
- **Smart paste**: Claude Haiku via Vercel Edge Function, accepts text or image, returns structured task JSON
- **DNS for hierarchical.app**: `A @ → 76.76.21.21` and `CNAME www → cname.vercel-dns.com` in Squarespace

## Known Issues / Gotchas
- Existing Supabase tasks have old status IDs (`backlog`, `in-progress`, `review`, `done`) — `LEGACY_STATUS_MAP` is ready but auto-migration on load isn't wired up yet
- Users with old `hierarch-statuses` in localStorage need to clear it to see new default phases
- `due_at` DB column: app stores `'yyyy-MM-ddTHH:mm'` (local time, no timezone) — column is `timestamptz`
- Supabase Free plan pauses projects after 1 week inactivity — not suitable for always-on webhooks
- `TodayOverview.tsx` still exists but is no longer imported — can be deleted
- `FocusTimerWidget.tsx` still exists but is no longer imported — can be deleted
- `PhaseRing.tsx` still exists but is no longer imported — can be deleted or repurposed for Insights view
- Legacy tasks in Supabase may have `project_id = null` — appear in Inbox (unassigned) view
- Deploy requires `--scope acportfolio`: `npx vercel deploy --prod --yes --scope acportfolio`
- Sidebar nav still uses `activeView === 'today'` for the Overview tab — renaming the key would require updating resetAppState and other references
