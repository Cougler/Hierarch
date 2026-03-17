# Hierarch — Claude Handoff

> Last updated: 2026-03-17

## What This Is
Hierarch is a React-based task and project management app built for designers. It uses nonlinear design phases (Explore, Design, Iterate, Review, Handoff), an Overview dashboard, board/list views, inline focus timer, capacity planning, artifacts (rich text notes + links + embeds), a blockers system, and a working Linear integration.

## Status
Light mode is fully themed with dynamic CSS variable tokens (shell, drawer, surface, attention) replacing all hardcoded dark-only colors. Phases renamed from Explore/Define/Refine/Feedback/Handoff to Explore/Design/Iterate/Review/Handoff with full DB migration support via LEGACY_STATUS_MAP. Blockers are now a first-class entity (task_blockers Supabase table with RLS) replacing the old waitingFor JSON blob, with full CRUD, dashboard integration, and lock icons on blocked tasks. Artifacts gained URL fields with previews (YouTube/Vimeo/Loom embeds, image previews, favicon cards) and inline link detection in the rich text editor. Next: deploy latest changes, fix any remaining light mode contrast issues, build Insights view.

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

## Architecture Notes
- `src/app/App.tsx` — root component, manages all state, routes views via `activeView` string. Drawer system uses `drawerStack: DrawerFrame[]` with `pushDrawerTask`, `pushDrawerArtifact`, `handleDrawerBack` for stack-based navigation. `closeAllDrawers()` clears stack + all selected items. `handleTaskUpdate` auto-records `PhaseTransition` on every status change and auto-creates an artifact (type `feedback`, with `taskId` set) when entering a phase with `isFeedback: true`. Blocker handlers (`handleCreateBlocker`, `handleResolveBlocker`, `handleDeleteBlocker`) with optimistic updates. `handleArtifactCreateForTask` creates an artifact linked to a task and pushes it onto the drawer stack. Mobile gets standalone fallback drawers since `UnifiedDrawer` returns null on mobile.
- `src/styles/theme.css` — all color tokens as CSS variables in `.light` and `.dark` classes. Tokens: `--background`, `--foreground`, `--card`, `--popover`, `--shell` (outer container), `--shell-border`, `--drawer` (floating panels), `--surface` (interactive surfaces), `--surface-hover`, `--attention` (needs-attention text), `--sidebar`, plus standard shadcn tokens. Registered via `@theme` block for Tailwind v4.
- `src/styles/index.css` — `@custom-variant dark (&:where(.dark, .dark *))` enables `dark:` prefix with class-based theming. `.invert-on-light` class for white SVG logos. `.hierarch-link-badge` and `.hierarch-link-card` styles for inline link components in the editor.
- `src/app/types.ts` — `Blocker` interface (`id`, `taskId`, `type: BlockerType`, `title`, `owner?`, `linkedTaskId?`, `createdAt`, `resolvedAt?`). `BlockerType = 'person' | 'team' | 'external' | 'task'`. `Task.blockers?: Blocker[]`. `LEGACY_STATUS_MAP` maps old phase IDs (`define`→`design`, `refine`→`iterate`, `feedback`→`review`) and old engineering statuses (`backlog`→`explore`, etc.) to current IDs. `WaitingForItem` deprecated.
- `src/app/api/data.ts` — all Supabase CRUD. `mapDbTaskToTask` auto-migrates old phase IDs via `LEGACY_STATUS_MAP` on read. Blocker CRUD: `getBlockersForUser`, `createBlocker`, `resolveBlocker`, `unresolveBlocker`, `deleteBlocker`. `migrateWaitingForToBlockers()` one-time migration (non-blocking, gated by localStorage flag). Tasks encode `description` + `phaseHistory` as JSON in a single `description` column (waitingFor removed).
- `src/app/components/UnifiedDrawer.tsx` — single drawer shell for desktop. Renders `ProjectDrawerContent`, `TaskDetailsDrawer` (embedded), or `NoteDrawer` (embedded). Passes blocker handlers through to TaskDetailsDrawer.
- `src/app/components/TaskDetailsDrawer.tsx` — task detail panel. Blockers section with type icons (User/Users/Globe/Link2), age display, resolve/unresolve, collapsible resolved section, inline add form with type picker pills. "Add artifact" button creates artifact linked to the task. Phase pill selector uses PHASE_COLORS map.
- `src/app/components/NoteDrawer.tsx` — rich-text artifact editor. 10 artifact types (Quick Note, Decision, Feedback, Research, Link, Figma, Prototype, Screenshot, Video, Doc). URL fields for link/video/prototype/screenshot/figma types with type-specific previews (YouTube/Vimeo/Loom embeds, image previews, favicon cards, Figma oEmbed thumbnails). `DOMAIN_LABELS` map for smart link labels. Inline link detection on input with Badge/Card conversion options. `getLinkLabel()` returns human-readable names for known domains.
- `src/app/components/TaskCard.tsx` / `TaskRow.tsx` — lock icon indicator when task has active (unresolved) blockers.
- `src/app/components/Briefing.tsx` — Overview dashboard. Needs-attention logic includes blocked tasks (highest priority) with stale blocker detection (>3 days). Uses `--attention` token for accessible orange text.
- `src/app/components/Sidebar.tsx` — create menu (SquarePen) has New Task, New Artifact, New Project. Linear logo uses `invert-on-light` class.

## Design Phases System
- **Phases**: Explore (violet) → Design (blue) → Iterate (amber) → Review (orange) → Handoff (emerald)
- **Phase history**: stored as `PhaseTransition[]` in the task's `description` JSON blob
- **Review flow**: entering Review phase auto-creates an `Artifact` with `type: 'feedback'` and `taskId` set, then opens the artifact drawer
- **Iterate ↔ Review** is the natural loop. Moving back to Iterate from Review reads as intentional progress, not regression.

## Blockers System
- **Supabase table**: `task_blockers` with RLS (`user_id = auth.uid()`), cascade delete on task removal
- **Types**: person, team, external, task (with optional `linked_task_id`)
- **States**: active (`resolved_at` is null) or resolved (`resolved_at` set)
- **Dashboard integration**: blocked tasks appear in "Needs Attention" with highest priority; stale blockers (>3 days) get time-based messaging
- **Visual indicators**: Lock icon on TaskCard (kanban) and TaskRow (list view)
- **Migration**: `migrateWaitingForToBlockers()` converts legacy `waitingFor` JSON items to `task_blockers` rows (one-time, non-blocking)

## Theme System
- All colors defined as CSS variables in `src/styles/theme.css` under `.light` and `.dark` classes
- Custom tokens beyond standard shadcn: `--shell` (outer app frame), `--drawer` (floating panels), `--surface`/`--surface-hover` (interactive fills), `--attention` (warning text), `--shell-border`
- `@custom-variant dark (&:where(.dark, .dark *))` in index.css enables `dark:` Tailwind prefix with class-based theming
- All accent text colors use `-700` for light mode with `dark:text-*-400` for dark mode (WCAG accessible)
- White SVG logos (Linear) use `.invert-on-light` class (`filter: invert(1)` in light mode only)

## Artifact Types
- **Quick Note** (freeform), Decision, Feedback, Research — text-only
- **Link**, **Prototype** — URL field with favicon + hostname preview card
- **Video** — URL field with embedded iframe for YouTube, Vimeo, Loom
- **Screenshot** — URL field with inline image preview
- **Figma** — URL field with oEmbed thumbnail preview
- **Doc** — text-only
- Each type has icon (Lucide), color (light+dark), bg, and label defined in `TYPE_META` (NoteDrawer) and `ARTIFACT_TYPE_ICONS/COLORS/LABELS` (ArtifactsView)

## Inline Link Components
- Rich text editor detects URLs on input (after space) and shows a floating tooltip with Badge/Card options
- **Badge**: inline rounded pill with favicon + smart label (e.g., "YouTube Video") + close button
- **Card**: block-level preview with favicon + label + full URL + external link icon
- Both styled via CSS classes (`.hierarch-link-badge`, `.hierarch-link-card`) using CSS variable tokens for theme support
- `DOMAIN_LABELS` map provides human-readable names for 20+ known domains

## Recent Changes (this session)
- Complete light mode theme with dynamic CSS variable tokens
- Replaced all hardcoded dark-only colors across 14+ files
- Added `@custom-variant dark` for Tailwind v4 class-based dark mode
- WCAG-accessible accent text colors (artifact types, phase colors)
- Linear logo inversion in light mode
- Blockers system: Supabase table, full CRUD, UI in task/new-task drawers, board/list indicators, dashboard integration
- Phase rename: Define→Design, Refine→Iterate, Feedback→Review with DB migration
- Fixed critical `import type` bug stripping `LEGACY_STATUS_MAP` at runtime
- Artifact URL fields with previews for link, video, prototype, screenshot types
- Inline link detection with Badge/Card conversion in rich text editor
- "New Artifact" in sidebar create menu
- "Add artifact" button in task drawer
- "Freeform" renamed to "Quick Note"

## What's Next
- **Deploy latest changes** to Vercel
- **Fix remaining light mode issues** — test all views in light mode for contrast/readability
- **Build Insights view**: phase analytics (avg review rounds, time per phase, completion funnel)
- **Linear OAuth flow**: integrations table, edge function routes, frontend callback
- **DataTable refactor**: extract shared component from TaskBoard and ArtifactsView
- **Demo mode Linear data**: fake issues for demo account

## Known Issues / Gotchas
- Existing Supabase tasks have old status IDs (`backlog`, `define`, `refine`, `feedback`) — `LEGACY_STATUS_MAP` auto-maps them on read but doesn't update the DB
- `isFeedback` flag on StatusConfig is still named `isFeedback` even though the phase is now "Review" — renaming would touch too many files for no behavioral change
- Supabase Free plan pauses projects after 1 week inactivity
- `ProjectsPage.tsx`, `TodayOverview.tsx`, `FocusTimerWidget.tsx`, `PhaseRing.tsx`, `FeedbackPrompt.tsx`, `WaitingForWidget.tsx`, `ChecklistSection.tsx` still exist on disk but are no longer imported — can be deleted
- Deploy requires `--scope acportfolio`: `npx vercel deploy --prod --yes --scope acportfolio`
- Sidebar nav still uses `activeView === 'today'` for the Overview tab
- `useColumnWidths` hook and `useArtifactColumnWidths` are duplicated logic — will be unified in DataTable refactor
- Link badge close button uses inline event listener (not React-managed) since it's inside contentEditable HTML
