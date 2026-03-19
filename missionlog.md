# Hierarch — Mission Log

---

## 2026-03-06 — Supabase connection, Vercel deploy, project column fix

Hierarch is fully connected to the Hierarch Supabase project (Pro UX Tasks) and deployed to Vercel at hierarch.vercel.app. The custom domain hierarchical.app is configured on Vercel and just needs two DNS records added in Squarespace to go live. This session fixed a root cause bug where task.project stored project names instead of IDs, widened the project column in list view, and updated the Add Task button to amber.

**Done this session:**
- Fixed login/signup screen backgrounds to match app dark background
- Connected Hierarch to Hierarch Supabase project (`bccmvisblpuiceuowfez` — "Pro UX Tasks")
- Created `.env` with Supabase credentials, added `.env` to `.gitignore`
- Added `start_date` and `end_date` columns to `projects` table via Supabase MCP migration
- Updated `Project` type and `data.ts` to support `start_date`/`end_date` as top-level fields
- Fixed multiple TypeScript build errors (missing `vite-env.d.ts`, `USER_DELETED` event type, etc.)
- Deployed Hierarch to Vercel at `hierarch.vercel.app` with Supabase env vars set
- Added `hierarchical.app` and `www.hierarchical.app` domains to Vercel project
- Authenticated Supabase MCP server
- Changed Add Task button to amber `#bf7535` in TaskBoard and TodayOverview
- Fixed project column in task list: widened to 200px, fixed ID vs name lookup in `ProjectCell`
- Fixed root cause: task creation now stores `project.id` instead of `project.name`
- Fixed project task/resource filtering to match on both ID and name for backward compat

**Up next:**
- Add DNS records in Squarespace: `A @ → 76.76.21.21` and `CNAME www → cname.vercel-dns.com`
- Update `package.json` name from `"hierarch"` to `"hierarch"`
- Continue UI/UX polish

---

## 2026-03-09 — UI polish: inline tasks, Capacity redesign, color picker, handoff skill

Hierarch has had a big UI polish session — inline task creation is live across all task views with the optimistic ID flicker fixed, the Capacity page is fully redesigned with translucent range bars, project labels above the bars, and task due-date dots. Color selection is restored to the IconPicker and flows through to capacity bar colors. Deployed to hierarch.vercel.app.

**Done this session:**
- Inline task creation added to Today view (was incorrectly opening task drawer)
- Fixed inline task creation flicker — removed `y: 4` translate from motion.div initial state
- Fixed deeper flicker: stopped replacing tempId with realId in state (AnimatePresence was treating it as delete+create); `resolveTaskId` already handles server ops
- Kanban drag-and-drop fixed: extracted `KanbanColumn` with `useDroppable` so columns register as drop targets
- Sort ascending/descending now works for grouped status view
- Project cell dropdown fixed: wrapped Badge in `<button>` so Radix `asChild` ref attaches correctly
- Project column now truncates instead of overflowing into due date column (`min-w-0 overflow-hidden`)
- Capacity page redesigned: no sidebar, project label above bar, translucent bars, task due-date dots, auto-scrolls to today
- Capacity timeline now starts 1 month before today so you can scroll back
- Range bars made brighter (border `70`/`90` opacity, label `dd` opacity)
- Color selection restored to IconPicker — hex values stored, legacy `bg-*` class names resolved on load; icon tinted in selected color
- `/handoff` skill created for resuming sessions in new chats

**Up next:**
- Add DNS records in Squarespace (`A @ → 76.76.21.21`, `CNAME www → cname.vercel-dns.com`) for hierarchical.app
- Rename `package.json` name from `"hierarch"` to `"hierarch"`
- Continue UX polish

---

## 2026-03-09 — Task drawer polish, time on due dates, Linear bug fix, smart paste planning

The task drawer has been heavily polished — Waiting For and Resources sections are redesigned with custom circular toggles and subtle containers, due dates now support time selection, and the close button is a floating pill that springs out from under the drawer on open. The Linear integration was already fully built from a previous session; a labels normalization bug was fixed and it's ready to test. Next up is building smart paste with Claude Haiku (text or image, structured extraction via a Vercel Edge Function).

**Done this session:**
- Redesigned Waiting For section: custom circular toggle buttons, progress count ("2/4 done"), inline add input, animated items, subtle rounded container
- Redesigned Resources section: icon + title rows with external link for URLs, matching container style, removed old ResourceItem/ChecklistSection usage
- Added time support to due date in TaskDetailsDrawer and NewTaskDrawer — stores as `yyyy-MM-ddTHH:mm`, shows `"Mar 15, 2024 at 2:30 PM"` when time is set
- Revamped task drawer close button: floating pill (60px tall, rounded-full), springs out from under the drawer after it opens, 85% opacity at rest, full opacity on hover
- Fixed Linear labels bug: GraphQL returns `labels { nodes: [] }` but interface expected flat array — added `LinearIssueRaw` type and `normalizeIssue()` helper
- Researched Jira, Linear, Slack integration requirements, auth flows, SDKs, rate limits, and 2026 compliance notes
- Planned smart paste feature: Claude Haiku, accepts text or image, prompt caching, Vercel Edge Function for API key security
- Discovered Linear integration was already fully built (personal API key auth, team selector, kanban board, issue detail drawer, create/update, design metadata overlay)

**Up next:**
- Test Linear integration — get personal API key from `linear.app → Settings → Security & Access`
- Build smart paste: Vercel Edge Function → Claude Haiku with cached system prompt → structured task extraction from text or screenshot
- Add DNS records for hierarchical.app (`A @ → 76.76.21.21`, `CNAME www → cname.vercel-dns.com`)
- Consider Supabase Pro upgrade once webhooks/always-on features are needed

---

## 2026-03-09 — Nonlinear design phases, Linear fixes, flowki→hierarch rename

Hierarch now has a nonlinear design phases system replacing the old engineering-style statuses — tasks move through Explore, Define, Refine, Critique, and Handoff phases with full phase history tracking, a critique prompt that asks for reviewer and deadline, and a vertical activity log in the task drawer. The Linear integration is fixed and working, Figma URLs sync to Linear as attachments, and all flowki references are renamed to hierarch. Next: discuss the personal design cockpit vision, build the Insights view for phase analytics, and plan Jira/ClickUp integrations.

**Done this session:**
- Fixed Linear integration: GraphQL uses `state` not `status`, mutations use `stateId` not `statusId`, added `normalizeIssue()` to map `state` → `status` in app types
- Added Figma URL sync to Linear via `attachmentCreate`/`deleteAttachment` mutations — syncs on blur from the Figma input in the issue drawer
- Renamed all `flowki-*` references to `hierarch-*` across 15+ files (localStorage keys, package.json, docs, schema, README, etc.)
- Renamed `flowki.md` → `hierarch.md`
- Built nonlinear design phases system:
  - New `PhaseTransition` type with `fromPhase`, `toPhase`, `timestamp`, `reviewer`, `deadline`
  - `Task.phaseHistory` stored in description JSON blob (no DB migration needed)
  - `DEFAULT_STATUSES` replaced: Explore (violet), Define (blue), Refine (amber), Critique (orange), Handoff (emerald)
  - `StatusConfig.isCritique` flag triggers CritiquePrompt dialog on phase entry
  - `App.tsx` `handleTaskUpdate` auto-records phase transitions on every status change
  - `CritiquePrompt.tsx` — dialog asking for reviewer name + deadline when entering critique phase
  - `PhaseJourney.tsx` — vertical activity log in task drawer showing all phase transitions (most recent first)
  - `StatusManager.tsx` renamed to "Manage Phases" with critique toggle button
  - Updated demo data to use new phase IDs
  - Updated all hardcoded `'backlog'` fallbacks to `'explore'`
- UI polish: phase dot is smaller (8px) with larger click area (16px), empty project/due date cells show dash with hover highlight, task drawer label changed from "Status" to "Phase", drawer scrollable on both desktop and mobile

**Up next:**
- Discuss product vision #2: "personal design cockpit" — Hierarch as designer's home base pulling from multiple tools
- Build Insights view: avg critique rounds, time per phase, phase flow patterns
- Plan Jira and ClickUp integrations
- Auto-migrate existing Supabase tasks from old status IDs to new phase IDs
- Smart paste feature (Claude Haiku via Vercel Edge Function)
- DNS for hierarchical.app

---

## 2026-03-09 — Briefing dashboard, inline focus timer, Resources table, task drawer polish

The Today view is replaced by a designer's Briefing — a two-column morning dashboard with active projects (2/3 width), recent progress timeline (1/3), needs-attention items, and a design notes capture area with task linking and convert-to-task. The focus timer is removed from the sidebar and integrated into task rows as an inline icon that shows a live pulsing countdown when running, with a redesigned full-screen timer view featuring a progress ring, large play/pause button, and session notepad that appends to the task on save. Resources view is now a table list with checkboxes and bulk actions. Next: Insights view for phase analytics, deploy these changes, and continue the design cockpit vision.

**Done this session:**
- Replaced TodayOverview with Briefing component — two-column layout (2/3 left, 1/3 right)
- Left column: Active Projects (with proper Lucide icons via `getIconComponent`), Needs Attention (overdue/critique/stale), Design Notes
- Right column: Recent Progress timeline (last 48h phase transitions, no dots)
- Design Notes: localStorage-persisted, linkable to tasks and projects, convert-to-task action, hover delete
- Removed Focus Timer from sidebar nav
- Added focus timer icon to task row actions (next to new delete icon)
- Mini live timer display on task row when focus session is running (pulsing dot + countdown)
- Redesigned FocusTimerView: large 280px progress ring, 64px play/pause button, timer/stopwatch toggle, session notepad that appends to task description on save
- Replaced More menu on task rows with direct delete icon
- Redesigned Resources/AttachmentsView as table list with checkboxes, select-all, bulk delete, per-row actions menu
- Renamed "Phase Journey" to "Recent Progress" in task drawer, moved to bottom, capped at 4 items with "View more" expand
- Streamlined task drawer date/time: date and time pickers side by side, time uses matching popover style

**Up next:**
- Deploy these changes to Vercel
- Build Insights view for phase analytics (avg critique rounds, time per phase, completion funnel)
- Continue the "personal design cockpit" vision
- Auto-migrate existing Supabase tasks from old status IDs to new phase IDs
- DNS for hierarchical.app

---

## 2026-03-10 — Critique→Feedback rename, Briefing dashboard redesign, contrast boost

The Critique phase is renamed to Feedback with a redesigned prompt that captures person/team name, notes, and deadline — feedback notes now display in the task's progress timeline. The Briefing page is fully redesigned with a dashboard-style layout: large greeting header with Search/New Task actions, 4 stat cards (active tasks, projects, needs attention, completed), two-column body (clean project list rows + needs attention cards), and design notes below. Sidebar and overview text contrast are significantly boosted for readability. Next: deploy these changes, build the Insights view for phase analytics, and continue the design cockpit vision.

**Done this session:**
- Renamed "Critique" to "Feedback" across the entire app (types, components, demo data, status manager, briefing)
- `isCritique` → `isFeedback` on `StatusConfig`, phase id `'critique'` → `'feedback'`
- Added `notes` field to `PhaseTransition` type for feedback notes
- New `FeedbackPrompt.tsx` replaces `CritiquePrompt.tsx` — captures person/team name, notes textarea, and deadline
- `PhaseJourney.tsx` now displays "Feedback from [name]" and renders notes below timeline entries
- Deleted old `CritiquePrompt.tsx`
- Redesigned Briefing page layout to match dashboard reference: large greeting header with Search + New Task buttons, 4 stat cards row, two-column Active Projects (clean divider rows) + Needs Attention, full-width Design Notes below
- `onNewTask` prop added to Briefing and wired up in App.tsx
- Boosted sidebar text contrast: inactive nav items `text-muted-foreground` → `text-foreground/60`, project icons → `text-foreground/50`
- Boosted Briefing overview contrast: systematic bump of all muted-foreground opacity values by ~20 points

**Up next:**
- Deploy these changes to Vercel
- Build Insights view for phase analytics
- Continue the design cockpit vision
- Auto-migrate existing Supabase tasks from old status IDs to new phase IDs
- DNS for hierarchical.app

---

## 2026-03-10 — Briefing overhaul: glass morphism, NoteDrawer, project preview

The Briefing overview page is fully overhauled with glass morphism styling, viewport-contained scrolling, and a project preview drawer that opens inline so users don't navigate away. Design notes are now a full system with a rich-text NoteDrawer (contentEditable with toolbar), note types (Freeform/Decision/Feedback/Research/Critique), and create-note buttons on task rows across all views. The resources tab in projects now uses a table layout matching the main resources page. Next: deploy these changes, build the Insights view, and continue the design cockpit vision.

**Done this session:**
- Added glass morphism styling (`bg-white/[0.04] backdrop-blur-xl border border-white/[0.08]`) to stat cards, needs attention items, recent progress, and project preview drawer
- Merged needs-attention tasks under their associated project cards on Briefing page
- Attached design notes to projects (not standalone) with note count indicators and create-note buttons on project cards
- Created `NoteDrawer.tsx` — floating rich-text editor with contentEditable, toolbar (Bold/Italic/Heading/Lists/Quote/Divider), keyboard shortcuts, auto-save with 500ms debounce
- Added note type tabs in NoteDrawer: Freeform, Decision, Feedback, Research, Critique — with animated underline indicator
- Moved design notes state from Briefing (local) to App.tsx (global) with localStorage persistence and old format migration
- Added create-note icon (`MessageSquarePlus`) to TaskRow actions across all views (Today, TaskBoard, ProjectDetails)
- Threaded `onCreateNote` prop through TaskBoard → ListView → TaskRow
- Converted ProjectDetails resources tab from card layout to table grid (`1fr 120px 120px 40px`) with type icons, date, and actions dropdown
- Made Briefing layout viewport-contained: flex with `min-h-0` and `overflow-y-auto` on individual columns, no page-level scroll
- Changed grid from `[3fr_2fr]` to `[1fr_320px]` to prevent left column horizontal overflow
- Built project preview drawer with AnimatePresence inside Briefing — shows header, 3 stat cards, needs attention, active tasks, design notes, and "Open full project view" link
- Added `contenteditable[data-placeholder]` CSS for rich text placeholder support
- Fixed blank screen bugs: re-added `isToday` import, added non-null assertions for array access

**Up next:**
- Deploy these changes to Vercel
- Build Insights view for phase analytics
- Continue the design cockpit vision
- Auto-migrate existing Supabase tasks from old status IDs to new phase IDs
- DNS for hierarchical.app

---

## 2026-03-10 — Overview polish, Linear table, demo data rewrite, drawer system overhaul

Overview page is polished and live — responsive two-column layout, unified activity feed (phase changes, notes, tasks, projects), project preview drawer, and all drawers close each other via centralized closeAllDrawers(). Linear issues now display as a table instead of kanban. Demo data and onboarding are rewritten with realistic projects and design-phase-focused content. Deployed to hierarchical.app. Next: build Insights view, continue design cockpit vision.

**Done this session:**
- Fixed Overview left column horizontal overflow with `minmax(0,1fr)` grid and `overflow-x-hidden`
- Increased right column width to 360px, removed max-width cap for full responsiveness
- Replaced Linear kanban board with table view (ID, Title, Status, Priority, Type, Assignee, Updated)
- Built unified activity feed in Recent Progress: phase changes, task creation, note creation/editing, project creation — each with distinct icon and color
- Added `createdAt` to Task type, mapped from Supabase `created_at`
- Made project preview drawer show per-project icons via `getIconComponent`
- Made Recent Progress glass background lighter (`bg-white/[0.07]`), scrollbar auto-hides without layout shift
- Compact project rows: single-line with inline metadata, hover highlight, full-row clickable
- More prominent project dividers (`border-border/50`)
- "Add task" button uses primary color, renamed from "New Task"
- Renamed page from "Briefing" to "Overview" in sidebar and header
- Rewrote demo data: Noma Checkout Redesign, Wavelength Design System, Basecamp Mobile App, Sonder Brand Identity — with full phase histories, `createdAt`, and `DEMO_DESIGN_NOTES`
- Rewrote onboarding: 4 steps focused on design phases, core concepts, and Overview page with phase pipeline visual
- Centralized drawer management: `closeAllDrawers()` in App.tsx closes task/new-task/note/project-preview drawers
- Lifted `previewProject` state from Briefing to App.tsx for unified drawer control
- All drawers positioned 32px from top/right/bottom, close buttons snug against drawer edge
- Added project breadcrumb to task drawer (icon + project name + "Task")
- Fixed main content `overflow-y-scroll` with `scrollbar-auto-hide` to prevent layout shift on page transitions
- Deployed to hierarchical.app

**Up next:**
- Build Insights view for phase analytics (avg feedback rounds, time per phase, completion funnel)
- Continue design cockpit vision (pull from Linear, Jira, ClickUp, Figma)
- Auto-migrate existing Supabase tasks from old status IDs to new phase IDs
- Smart paste feature (Claude Haiku via Vercel Edge Function)
- DNS for hierarchical.app in Squarespace

---

## 2026-03-12 — Sidebar restructure, feedback-note flow, edge function deploy, starter data

Sidebar restructured with Projects and Notes as their own table-view pages, pinnable projects, and a project creation drawer. Feedback phase now auto-creates a linked note and opens the note drawer immediately for editing. Notes appear on the task drawer and in the activity feed with inline links. Edge function deployed to Supabase with basePath fix. New accounts get self-documenting starter data seeded to the database. Scrollbars hidden globally until scrolling. Next: build Insights view, Jira integration, deploy latest changes.

**Done this session:**
- Restructured sidebar nav: Overview, All Tasks, Projects, Notes, Capacity, Linear
- Created `ProjectsPage.tsx` with table view, pin/unpin, inline rename, create drawer with icon grid and color swatches
- Pinned projects appear in sidebar below nav items, driven by `pinnedVersion` counter pattern
- Renamed "Resources" to "Notes", rewrote `AttachmentsView` to show `DesignNote` data in table format
- Removed all resource/attachment references, deleted unused resource component files
- Created self-documenting demo data: 2 projects, 11 tasks, 5 notes, 4 time entries explaining each feature
- Added `seedStarterData()` in `loadData` — seeds projects/tasks to Supabase and notes to localStorage for new accounts, mapping demo IDs to real UUIDs
- Deployed `server` edge function to Supabase with `.basePath("/server")` fix for Hono routing
- Fixed `AccountSettings.tsx` error body reading `body.error` instead of `body.message`
- Added `taskId` to `DesignNote` type for linking notes to tasks
- Feedback phase now skips the dialog and directly creates a feedback note linked to the task, opening the note drawer
- Task drawer shows linked notes section with clickable items that open the note drawer
- Activity feed shows "Moved to feedback with note" where "note" is an inline link
- `PhaseJourney` rewritten with natural language ("Moved to Feedback with note", "Handed off") and relative timestamps
- Removed "critique" note type, consolidated under "feedback" (4 types: Freeform, Decision, Feedback, Research)
- Added localStorage migration for statuses: resets to `DEFAULT_STATUSES` when saved IDs don't match current defaults
- Scrollbars hidden globally until hovering/scrolling via CSS

**Up next:**
- Build Insights view for phase analytics
- Jira integration (saved to memory, mirrors Linear pattern with Vercel serverless proxy)
- Deploy latest changes to Vercel
- DNS for hierarchical.app in Squarespace

---

## 2026-03-14 — Artifacts rename, sidebar restructure, Figma oEmbed, CSS Grid table

Notes are renamed to Artifacts across the entire app, with 6 new artifact types (Link, Figma, Prototype, Screenshot, Video, Doc) alongside the original 4. The Artifacts view uses the same CSS Grid table as All Tasks with resizable columns, sorting, filtering by type/project, and grouping. Figma artifacts show a URL input with oEmbed thumbnail preview. Sidebar is restructured with inline project list, context menu actions, and an Integrations section with Linear. New accounts get minimal starter data while demo mode has realistic fake projects. Next: deploy latest changes, build Insights view, Jira integration.

**Done this session:**
- Renamed "Notes" to "Artifacts" across the entire app (types, components, props, localStorage keys, demo data)
- `DesignNote` type renamed to `Artifact` with deprecated alias kept for compatibility
- `NoteType` expanded to `ArtifactType` with 6 new types: link, figma, prototype, screenshot, video, doc
- Each type has icon, color, and label metadata exported from `AttachmentsView.tsx`
- Rewrote `AttachmentsView.tsx` to use CSS Grid table matching All Tasks pattern (resizable columns, motion rows, ScrollArea)
- Added `useArtifactColumnWidths` hook with localStorage persistence
- Sorting by updated/title/type/project, filtering by type and project, grouping by type or project
- Figma artifact type: URL input with oEmbed thumbnail preview via `https://www.figma.com/api/oembed`
- Fixed NoteDrawer responsiveness: type tabs wrap instead of horizontal scroll, content overflow hidden
- Removed Projects page from sidebar, moved projects inline under "Projects" label with context menus (rename, duplicate, delete)
- Added inline project creation in sidebar
- Added "Integrations" section in sidebar with Linear and + button
- Split demo data: STARTER_* (minimal for new accounts) and DEMO_* (realistic fake data for demo mode)
- Fixed project rename navigation bug: all `project:` view keys now use project ID instead of name
- localStorage migration: `hierarch-artifacts` with fallback to `hierarch-design-notes`

**Up next:**
- Deploy latest changes to Vercel
- Build Insights view for phase analytics
- Jira integration
- DNS for hierarchical.app in Squarespace

---

## 2026-03-15 — UnifiedDrawer system, Overview page refinements

The UnifiedDrawer system is live with a navigation stack (project → task → artifact) that transitions content within a single drawer shell using directional slide animations and breadcrumbs. The Overview page is refined with subtler metric cards (top/bottom borders only, smaller type), project cards with inline needs-attention indicators, and swapped background treatments between Active Projects and Recent Progress. Mobile fallback drawers are restored. Next: deploy these changes, build the Insights view, continue DataTable refactor.

**Done this session:**
- Built `UnifiedDrawer.tsx` — single drawer shell with `DrawerFrame[]` navigation stack, directional slide transitions via `AnimatePresence mode="popLayout"`, breadcrumb trail, back button
- Created `ProjectDrawerContent.tsx` — extracted from Briefing.tsx inline project drawer, self-contained with its own computed data
- Added `embedded` prop to `TaskDetailsDrawer` and `NoteDrawer` — returns just content when rendered inside UnifiedDrawer
- Rewrote App.tsx drawer management: `drawerStack`, `pushDrawerTask`, `pushDrawerArtifact`, `handleDrawerBack` replacing simple open/close booleans
- Added mobile fallback drawers (standalone `TaskDetailsDrawer`/`NoteDrawer` render when `isMobile`)
- Redesigned task drawer: phase pill selector, PickerPopover for project, unified due date+time component, project+due date on same row
- Updated rich text editor toolbar: heading dropdown (H1/H2/H3/Paragraph), link button with Cmd+K
- Removed search button from Overview page
- Overview metric cards: removed bg/border-radius/side borders, smaller type (`text-xl`), top/bottom borders only
- Active Projects: project cards with subtle containment, replaced nested attention tasks with inline "X needs attention" indicator
- Swapped background colors between Active Projects cards and Recent Progress container
- Font size swap: project names `text-sm`, recent progress titles `text-xs`
- Recent Progress background opacity reduced to 3%
- Swapped first two metric cards (Projects first, Active Tasks second)

**Up next:**
- Deploy these changes to Vercel
- Build Insights view for phase analytics
- Continue DataTable refactor
- Jira integration
- DNS for hierarchical.app

---

## 2026-03-15 — DataTable component planning and table feature audit

All Tasks and Artifacts views share identical CSS Grid table patterns (resizable columns, search, sort, filter, group, row animations) with duplicated implementations. This session reviewed both table components in detail and outlined the full feature set for extraction into a shared DataTable component. Next: build the reusable DataTable component and refactor TaskBoard list view and AttachmentsView to consume it.

**Done this session:**
- Deep audit of TaskBoard.tsx list view: documented all 5 columns, resizable column hook, sort/filter/group logic, selection + bulk operations, drag-and-drop, inline task creation, context menu, keyboard shortcuts, animations, StatusManager and ColumnManager dialogs
- Deep audit of AttachmentsView.tsx: documented its own useArtifactColumnWidths hook, sort/filter/group logic, row rendering, artifact type metadata exports
- Compared both implementations and identified shared patterns: CSS Grid layout, useColumnWidths hooks (duplicated), search/sort/filter/group toolbar, group headers with badge counts, row animations via Framer Motion, ScrollArea wrapper, empty states
- Identified domain-specific differences: TaskBoard has selection/bulk ops, view toggle (list/board), DnD, inline creation, status manager; AttachmentsView has simpler toolbar, no selection, no DnD
- Read TaskRow.tsx, use-column-widths.ts, and types.ts to understand the full data flow

**Up next:**
- Build generic DataTable component with: configurable columns, resizable widths hook, search/sort/filter/group toolbar, group headers, row animations, empty states
- Refactor TaskBoard ListView to use DataTable (add selection, DnD, inline creation as extensions)
- Refactor AttachmentsView to use DataTable
- Deploy latest changes to Vercel

---

## 2026-03-16 — Integrations page, Linear OAuth planning, data-flow audit agent

The Integrations page is live with Linear, Jira, Slack, and Figma cards. Linear connect flow uses a custom drawer matching the app's design system. The sidebar conditionally shows integrations as a section (when connected) or a single nav item (when not). Linear OAuth migration is planned and scoped — replacing localStorage token storage with Supabase-backed OAuth for proper user isolation and security. A new data-flow audit agent joins the review team. Next: create Linear OAuth app, build the OAuth flow (edge function + callback + integrations table), then wire up demo mode with fake Linear data.

**Done this session:**
- Created `IntegrationsPage.tsx` with cards for Linear, Jira, Slack, Figma (coming soon badges for unbuilt integrations)
- Linear connect drawer uses app's custom drawer design (motion.div, spring animations, pill close button) instead of Sheet component
- Sidebar integrations: shows as a section with connected integrations listed when any are connected, or a single "Integrations" nav item with plug icon above account dropdown when none are connected
- Replaced Layers icon with actual Linear SVG logo (`/public/linear.svg`) in sidebar and integrations page
- Removed full-page Linear setup screen from `LinearView.tsx` — connect flow now lives in IntegrationsPage drawer
- Removed "active tasks" count from Overview header, removed inline description from project page header
- Changed "Edit details" button to "Details", matched ProjectDetailsDrawer close button to UnifiedDrawer style
- Added project icons to Active Projects section on Overview (gray, matching sidebar)
- Icon picker button changed from outline to ghost variant (no border)
- Project name and icon vertically centered in project page header
- Planned full Linear OAuth migration: `integrations` table with RLS, edge function for token exchange, OAuth callback handler, token stored in Supabase per user
- Identified localStorage token isolation bug (Linear token bleeds across accounts on same browser)
- Created `data-flow.md` audit agent (schema review, query efficiency, data encoding, state sync, schema simplicity)
- Updated `/audit` skill to run all 4 agents in parallel (security, code quality, consistency, data flow)

**Up next:**
- Create Linear OAuth app in Linear developer settings (manual step)
- Build Linear OAuth flow: `integrations` table, edge function routes, frontend callback handler
- Wire up demo mode with fake Linear data
- Deploy latest changes to Vercel
- Build Insights view for phase analytics
- Continue DataTable refactor

---

## 2026-03-17 — Light mode theming, blockers system, phase rename, artifact enhancements

Light mode is fully themed with dynamic CSS variable tokens (shell, drawer, surface, attention) replacing all hardcoded dark-only colors. Phases renamed from Explore/Define/Refine/Feedback/Handoff to Explore/Design/Iterate/Review/Handoff with full DB migration support via LEGACY_STATUS_MAP. Blockers are now a first-class entity (task_blockers Supabase table with RLS) replacing the old waitingFor JSON blob, with full CRUD, dashboard integration, and lock icons on blocked tasks.

**Done this session:**
- Built complete light mode theme system: extracted colors from reference screenshot, created `--shell`, `--shell-border`, `--drawer`, `--surface`, `--surface-hover`, `--attention` CSS variable tokens
- Replaced all hardcoded `#262624` and `#1c1c1a` inline styles across 14+ files with theme-aware Tailwind classes (`bg-shell`, `bg-drawer`, `bg-surface`, etc.)
- Replaced all `border-white/[0.06-0.08]`, `bg-white/[0.02-0.08]`, `hover:bg-white/[0.04-0.12]` with semantic tokens
- Added `@custom-variant dark` for class-based dark mode support in Tailwind v4
- Updated all accent text colors (artifact types, phase colors) from `-400` to `-700` light / `dark:-400` for WCAG accessibility
- Linear SVG logo: added `invert-on-light` CSS class for dark appearance in light mode
- Logo opacity changed from 50% to 100%
- Created `task_blockers` Supabase table with RLS, replacing `waitingFor` JSON blob in task descriptions
- Built full blocker CRUD: `getBlockersForUser`, `createBlocker`, `resolveBlocker`, `unresolveBlocker`, `deleteBlocker`
- New `Blocker` type with `type` (person/team/external/task), `title`, `owner`, `linkedTaskId`, `createdAt`, `resolvedAt`
- TaskDetailsDrawer: blocker section with type icons, age display, resolve/unresolve, collapsible resolved section
- NewTaskDrawer: inline blocker creation with type picker
- Lock icon on TaskCard (kanban) and TaskRow (list) for blocked tasks
- Dashboard: blocked tasks surface in "Needs Attention" with highest priority, stale blocker detection (>3 days)
- One-time migration from legacy waitingFor items to task_blockers table
- Renamed phases: Define→Design, Refine→Iterate, Feedback→Review across all files (types, demo data, UI, onboarding)
- Added LEGACY_STATUS_MAP entries for old→new phase ID migration on DB read
- Fixed critical import bug: `LEGACY_STATUS_MAP` was inside `import type` (stripped at runtime)
- Renamed artifact type "Freeform" to "Quick Note"
- Added URL fields with previews for link, video, prototype, screenshot, figma artifact types
- Video embeds for YouTube, Vimeo, Loom with iframe preview
- Image preview for screenshot URLs, favicon cards for link/prototype
- Domain-aware link labels (e.g., "YouTube Video", "Loom Recording", "Figma File")
- Inline link detection in rich text editor: detects typed URLs and offers Badge (inline pill) or Card (block preview) conversion
- Link badge: favicon + label with close button; link card: favicon + hostname + URL with external link icon
- CSS styles for `.hierarch-link-badge` and `.hierarch-link-card` using theme CSS variables
- Added "New Artifact" to sidebar create menu
- Added "Add artifact" button to task drawer artifacts section (creates artifact linked to task)
- Content area max-width constraint on editor to prevent URL overflow

**Up next:**
- Deploy latest changes to Vercel
- Fix any remaining light mode contrast issues
- Build Insights view for phase analytics
- Linear OAuth flow
- Continue DataTable refactor

---

## 2026-03-17 — Project phases, task statuses, onboarding redesign, project drawer overhaul

Projects now own the design phases (Research/Explore/Design/Iterate/Review/Handoff) while tasks use simple statuses (To Do/In Progress/Feedback/Done). The blockers system is fully wired with selectedTask sync fixed. Project drawer is redesigned with inline editable description, Popover phase picker, compact stats, artifacts section with type icons, and pinned footer. Onboarding is a 4-step flow with mock UI. Deployed to hierarchical.app.

**Done this session:**
- Separated project phases from task statuses: `PROJECT_PHASES` (6 design phases) + `DEFAULT_STATUSES` (4 task statuses)
- Added `phase` to `ProjectMetadata`, stored in Supabase metadata JSONB
- Phase picker in ProjectDetailsDrawer and ProjectDrawerContent using same Popover dropdown as task drawer
- Inline editable description textarea in project drawer (saves on blur)
- Compact metric stats replacing card grid (inline text: "3 active 2 done 5 artifacts")
- Pinned footer in project drawer for "Open full project view"
- Artifacts section in project drawer with type icons, "+ Add" button, styled container
- Renamed "Design Notes" to "Artifacts" in project drawer
- Removed "Blocked" task status (handled entirely by blockers system)
- Fixed blocker state sync: all blocker handlers now update both `tasks` and `selectedTask`
- Redesigned onboarding: 4 steps (Welcome + phases, Feedback loop, Data model grid, Overview standup)
- Onboarding uses mock UI components (phase list, review flow, 2x2 grid, overview dashboard)
- Navigation moved to right column with large round Next button, progress dots + Back/Skip at top
- "As a designer, I..." user stories in step 3 alongside the data model grid
- Needs-attention tasks nested under parent projects with arrow-down-right SVG icon
- "View all" moved next to "Active Projects" label
- Increased contrast on attention task titles and reasons
- Renamed artifact type "Quick Note" to "Note"
- Updated all demo data to use new task statuses
- Added project phases to demo project metadata
- `LEGACY_STATUS_MAP` updated to map old phase IDs to new task statuses
- Deployed to hierarchical.app

**Up next:**
- Build Insights view for phase analytics
- Linear OAuth flow
- Push to GitHub
- DataTable refactor
- Continue light mode polish

---

## 2026-03-17 — Project details dialog, empty state placeholders, new account cleanup

Project details is now a dialog with save/cancel, Popover phase picker, and typed blockers (person/team/external/task with resolve/unresolve). Task drawer labels "Status" correctly, project column hides on project pages. New accounts start empty with descriptive placeholders on the Overview (faded activity examples in Recent Progress, create-project CTA in Active Projects) and sidebar. Starter data seeding and stale localStorage artifacts are cleared for fresh accounts. Next: build Insights view, Linear OAuth flow, push to GitHub.

**Done this session:**
- Converted ProjectDetailsDrawer from floating panel to Dialog with Save/Cancel buttons (buffered edits)
- Phase picker in dialog uses Popover dropdown with 2-col grid matching ProjectDrawerContent
- Blockers in dialog upgraded from ChecklistSection to typed blocker system (person/team/external/task pills, age badges, resolve/unresolve, collapsible resolved section)
- Extended BlockerItem type with optional type, owner, createdAt, resolvedAt fields (backward compatible)
- Task drawer "Phase" label renamed to "Status" for correctness
- Project column hidden on project pages (TaskBoard, ListView, TaskRow, InlineTaskRow)
- Auto-open project details dialog when navigating to a project with no tasks and no details
- Removed starter data seeding for new accounts (no more pre-filled Getting Started project)
- New accounts clear stale localStorage artifacts on first load
- Sidebar empty project list: "Your projects will appear here" + "Create a project" CTA
- Overview Active Projects empty state: folder icon, descriptive text, "Create a project" button
- Overview Recent Progress empty state: 4 faded example activity rows (status change, task created, note created, note edited) with caption
- Sidebar nav items adjusted to 13px font and reduced vertical padding

**Up next:**
- Build Insights view for phase analytics
- Linear OAuth flow
- Push to GitHub
- DataTable refactor
- Continue light mode polish

---

## 2026-03-17 — Onboarding redesign, project page Add Task, Overview polish

Onboarding is redesigned as a 6-slide image-based walkthrough dialog overlaying the real app, covering Projects, Tasks, Artifacts, Overview, and Capacity. The project page header now has an Add Task button next to Details, and the empty task list shows a centered Add Task CTA instead of the inline affordance. Overview needs-attention tasks use 13px text and the per-project attention badge is removed. Next: build Insights view, Linear OAuth flow, push to GitHub.

**Done this session:**
- Redesigned onboarding as 6-slide image-based dialog overlay (replaces old 4-step mock UI flow)
- Uses Radix DialogPrimitive with custom transparent overlay (`bg-black/40 backdrop-blur-sm`)
- Slides use images from `/public/page1-6.webp` with text left or top, amber accent keywords
- Same experience for demo and real users (removed project creation steps from onboarding)
- Data loads during `'onboarding'` auth state so the real app renders behind the dialog
- Added "Add Task" button to project page header next to "Details" button
- Empty task list shows centered "Add Task" button, hides inline "+ Add a task..." affordance when empty
- Sidebar project names set to `text-[13px]`
- Overview needs-attention task titles set to `text-[13px]`
- Removed per-project "X needs attention" badge from project rows on Overview

**Up next:**
- Build Insights view for phase analytics
- Linear OAuth flow
- Push to GitHub
- DataTable refactor
- Continue light mode polish

---

## 2026-03-18 — Linear and Figma OAuth integrations, webhook-based comments

Linear and Figma OAuth integrations are fully built with Supabase Edge Function routes, token storage in an integrations table with RLS, auto-refresh on 401, and reactive sidebar badges. Figma comments flow through a team webhook into a figma_comments table, with a threaded chat UI for viewing and replying. The Add Task button is removed from the project page header. Next: deploy edge function for Figma webhooks, test the full Figma comment flow, build Insights view, push to GitHub.

**Done this session:**
- Created `integrations` Supabase table with RLS (owner_id, provider, access_token, refresh_token, token_expires_at, provider_metadata)
- Built Linear OAuth flow: 4 edge function routes (authorize, callback, refresh, disconnect), client-side state validation via sessionStorage, `useLinearToken` hook as single source of truth
- Built Figma OAuth flow: same pattern (4 edge function routes, `useFigmaToken` hook, callback handler in App.tsx)
- OAuth callback in App.tsx navigates to the integration's page (Linear or Figma) after successful connection
- Custom event system (`LINEAR_TOKEN_CHANGED`, `FIGMA_TOKEN_CHANGED`) so all hook instances reload when connection state changes (no manual refresh needed)
- Removed legacy localStorage token fallback and `LinearSetup` component
- Sidebar reads connection status from hooks instead of localStorage, shows both Linear and Figma under Integrations section
- IntegrationsPage refactored to use both hooks, shows connected account name, disconnect button per integration
- 401 auto-retry in `linear.ts` via `setOnUnauthorized` callback wired from the hook
- Created Figma API module (`src/app/api/figma.ts`): types, file/comment endpoints, unread tracking, file key extraction
- FigmaView: threaded comment UI with top-level thread list (comment preview, file name link, reply count) and chat view (chronological messages, reply input, "View in file" link)
- Created `figma_comments` and `figma_webhooks` Supabase tables with RLS and GIN index on mentions
- Webhook receive endpoint (`POST /server/figma/webhook`) stores incoming FILE_COMMENT events with passcode verification
- Webhook register endpoint (`POST /server/figma/webhook/register`) registers with Figma API and stores webhook info
- FigmaView reads comments from Supabase filtered by user's Figma ID (mentions or authored)
- Unread badge on Figma sidebar item reads from `figma_comments` table, polls every 30s
- Team setup screen with reference image for finding Figma team URL
- Created test account (test@hierarch.app / Test2026) with Pro IC user metadata
- Added `vercel.json` with SPA rewrite for OAuth callback routes
- Renamed edge function files from `.tsx` to `.ts` and fixed import paths for Supabase deployment
- Removed Add Task button from project page header
- Set Supabase Edge Function secrets for LINEAR_CLIENT_ID, LINEAR_CLIENT_SECRET, FIGMA_CLIENT_ID, FIGMA_CLIENT_SECRET

**Up next:**
- Deploy edge function with Figma webhook routes and test the full comment flow
- Build Insights view for phase analytics
- Push all changes to GitHub
- DataTable refactor
- Continue light mode polish
- Post-launch: list Figma app in Figma Community

---

## 2026-03-18 — Cost audit, Supabase Realtime planning

Linear and Figma OAuth integrations are fully built. Cost audit completed: no overnight billing risk (Supabase Free plan, static Vite SPA on Vercel, all polling is client-side only). Priority for next session: replace Figma unread 30s polling with Supabase Realtime subscriptions, then deploy edge function for Figma webhooks and build Insights view.

**Done this session:**
- Full cost risk audit of Vercel and Supabase usage (no runaway process risk found)
- Identified Figma unread polling (30s interval in `use-figma-unread.ts`) as optimization target
- Identified Figma webhook endpoint as public with passcode-only validation (no rate limiting)
- Planned migration from 30s polling to Supabase Realtime subscriptions for `figma_comments` table

**Up next:**
- **Priority:** Replace Figma unread 30s polling with Supabase Realtime subscription
- Deploy edge function with Figma webhook routes
- Build Insights view for phase analytics
- Push all changes to GitHub
- Add HMAC request signing to Figma webhook endpoint

---

## 2026-03-18 — Linear webhooks, Recent Progress event ledger, unified UI components

The Overview page has a full-height Recent Progress panel that shows an immutable event ledger from Linear webhooks (via Supabase Realtime), local task/project activity, and Figma comments. Linear webhook pipeline is live: edge function receives events, stores them in `linear_events` table, and the client auto-updates via Supabase Realtime subscriptions. This session also unified all status/phase selectors, redesigned the Linear issue drawer to use the standard floating drawer shell, added assignee picker and team members API, renamed task Feedback status to Review, and polished the Briefing layout. Next: Jira integration (same webhook pattern), re-enable Linear webhook signature verification, and submit Figma app for review.

**Done this session:**
- Redesigned Linear issue drawer to use standard floating drawer shell (matches UnifiedDrawer)
- Stripped Hierarch-specific features from Linear drawer (keep only Linear data + Figma sync)
- Added linkified URLs, video embeds (YouTube/Vimeo/Loom), and Figma thumbnail previews in issue descriptions
- Added `getTeamMembers` API and assignee picker using `PickerPopover` component
- Unified all status/phase selectors across task drawer, project drawer, and Linear drawer (rounded-lg bg-surface trigger, bg-accent/50 active state)
- Renamed task "Feedback" status to "Review" (id stays `feedback` for backwards compat, forced localStorage refresh)
- Updated artifact type switcher to match unified selector design
- Fixed rich text editor: paragraph 12px, h3 14px, h2 18px, h1 24px; fixed `formatBlock` to wrap tags in angle brackets
- Auto-create feedback artifact when project enters "review" phase
- Added project phase change tracking (`phaseHistory` in ProjectMetadata) and display in Recent Progress
- Moved Recent Progress panel outside padded content area, flush to right edge, full height with border-l
- Removed "Add task" button from Overview header
- Extended Recent Progress cutoff from 2 days to 7 days; added `createdAt` to new task creation
- Built Linear webhook pipeline: `linear_events` Supabase table with Realtime, edge function `POST /linear/webhook`, HMAC signature verification (temporarily disabled for debugging)
- Edge function deployed with `--no-verify-jwt` to allow Linear webhook POSTs
- Switched Recent Progress Linear feed from issue snapshots to immutable event ledger (reads from `linear_events` table)
- LinearView auto-refreshes via Supabase Realtime subscription on `linear_events`
- Added Figma comments and Linear events to Recent Progress feed with contextual subtext
- Added 15-day cleanup cron job for `linear_events` table (pg_cron, runs 3am UTC daily)
- Polished active projects: subtle bg treatment, anglearrow.svg for nested tasks, 16px gap between projects
- Adjusted sidebar item left padding to pl-1.5
- Gated Figma integration behind "Coming Soon" on production (pending Figma app review)
- Exported `PickerPopover` from TaskDetailsDrawer for reuse
- Fixed `previewProject` stale state bug (project phase changes now sync to drawer)
- Priority bars replace "P4" text in Linear issues table, priority column moved to left of ID

**Up next:**
- Jira integration (same webhook-based pattern as Linear)
- Re-enable Linear webhook HMAC signature verification (currently disabled)
- Submit Figma app for review to enable production OAuth
- Replace Figma unread 30s polling with Supabase Realtime
- Build Insights view for phase analytics
- Push all changes to GitHub

---
