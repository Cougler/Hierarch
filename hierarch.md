# Hierarch — Full App Recreation Prompt

Build "Hierarch," a visual-first task management web application using **React 18**, **Tailwind CSS v4**, **Motion (framer-motion)**, and **Supabase** (Auth, Database with custom tables, Storage, Edge Functions). The app uses **email/password authentication only** (no OAuth/social login). The term "Attachments" must always be referred to as **"Resources"** throughout the entire UI and codebase.

---

## Tech Stack & Libraries

- **React 18** (no React Router — single-page app with view state, not URL routing)
- **Tailwind CSS v4** with CSS custom properties for theming
- **Motion** (`motion/react`) for animations and transitions
- **Supabase JS v2** (`@supabase/supabase-js`) for auth, DB, and storage
- **@dnd-kit** (`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`) for drag-and-drop (sidebar project reordering, task board, resource list ordering)
- **Radix UI primitives** for all UI components (shadcn/ui pattern): Dialog, Sheet, Drawer, DropdownMenu, ContextMenu, AlertDialog, Popover, Select, Tabs, Tooltip, ScrollArea, Accordion, Checkbox, Switch, RadioGroup, Avatar, Badge, Separator, Progress, Slider, Toggle, etc.
- **Tiptap** (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-placeholder`, `@tiptap/extension-underline`) for rich text editing in Resources
- **lucide-react** for all icons
- **sonner** for toast notifications
- **date-fns** for date formatting
- **class-variance-authority**, **clsx**, **tailwind-merge** for class utilities
- **vaul** for mobile drawer components
- **react-day-picker** for calendar picker
- **cmdk** for command palette

---

## Database Schema (Supabase Postgres — Custom Tables)

The app uses **custom Postgres tables** (NOT the default KV store). The following SQL must be run in Supabase:

```sql
-- 1. Projects Table
create table projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  name text not null,
  description text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- 2. Tasks Table
create table tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'Backlog',
  due_at timestamptz,
  position int,
  created_at timestamptz not null default now()
);

-- 3. Resources Table
create table resources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  project_id uuid references projects(id) on delete cascade,
  task_id uuid references tasks(id) on delete set null,
  type text not null,
  title text,
  content text,
  created_at timestamptz not null default now()
);

-- 4. Enable Row Level Security
alter table projects enable row level security;
alter table tasks enable row level security;
alter table resources enable row level security;

-- 5. RLS Policies — Users can only CRUD their own data
create policy "Users can manage their own projects" on projects for all using (owner_id = auth.uid());
create policy "Users can manage their own tasks" on tasks for all using (owner_id = auth.uid());
create policy "Users can manage their own resources" on resources for all using (owner_id = auth.uid());
```

**Important schema notes:**
- `tasks.project_id` is nullable — tasks without a project are "Inbox" tasks.
- `resources.project_id` is nullable — resources can be global or project-scoped.
- `tasks.description` stores a JSON string: `{ "content": "...", "waitingFor": [...] }` to pack extra metadata into the single column.
- `resources.content` stores a JSON string: `{ "content": "...", "pinned": false, "order": 0, "metadata": {} }` for the same reason.

---

## Data Access Layer (`/src/app/api/data.ts`)

All data operations go **directly through the Supabase JS client** (not through the Edge Function server), except for:
- **Signup** (calls server endpoint because it needs `SUPABASE_SERVICE_ROLE_KEY` to create users with `email_confirm: true`)
- **Avatar upload** (calls server endpoint for Storage operations)
- **Time entries** (CRUD via server endpoints using KV store)
- **Account deletion** (calls server endpoint for admin user deletion + data cleanup)

The data layer functions:
- `getProjects()` — fetches projects filtered by `owner_id`, ordered by `created_at`
- `createProject(name, metadata)` — inserts a project
- `updateProject(id, updates)` — updates a project (always filtered by `owner_id`)
- `deleteProject(id)` — deletes a project (cascade deletes tasks and resources)
- `getTasks(projectId?)` — fetches tasks; if `projectId` is null, fetches unassigned; if undefined, fetches all. Maps DB fields (`due_at` → `dueDate`, `position` → `order`, `project_id` → `project_id`). Parses JSON `description` to extract `content` and `waitingFor`.
- `createTask(task, projectId)` — creates task, wrapping `description` and `waitingFor` into JSON
- `updateTask(id, updates)` — updates task; validates UUID before updating; merges `description`/`waitingFor` by fetching current value first
- `deleteTask(id)` — deletes task; validates UUID first
- `getResources()` — fetches resources, parses JSON `content` to extract `content`, `pinned`, `order`, `metadata`
- `createResource(resource, projectId)` — creates resource with JSON-wrapped content
- `updateResource(id, updates)` — fetches current content, merges, updates
- `deleteResource(id)` — deletes resource

---

## Supabase Edge Function Server (`/supabase/functions/server/index.tsx`)

A **Hono** web server running on Deno with these endpoints (all prefixed with a unique route prefix):

1. **POST `/signup`** — Creates user via `supabase.auth.admin.createUser()` with `email_confirm: true`. Accepts `{ email, password, name }`.
2. **POST `/upload-avatar`** — Authenticated. Parses multipart form data, uploads to a private Supabase Storage bucket (`make-{id}-avatars`), creates bucket if needed (idempotent), returns public URL.
3. **GET/POST/DELETE `/time-entries`** — CRUD for time tracking sessions stored in the KV store with prefix `time_entry:`.
4. **DELETE `/delete-account`** — Authenticated. Deletes user from auth via `supabase.auth.admin.deleteUser()`, then cleans up all user data from KV store (tasks, attachments, resources, projects) and Storage (avatar files). Best-effort cleanup.
5. Legacy KV endpoints for tasks/attachments/resources/projects (kept for migration support but not used by the current frontend data layer).

Server requirements:
- CORS enabled for all origins
- Logger middleware
- Auth helper that extracts Bearer token and verifies via `supabase.auth.getUser(token)`
- Uses `SUPABASE_SERVICE_ROLE_KEY` for admin operations (never exposed to frontend)

---

## Authentication Flow

1. **Login page** — Email/password sign-in via `supabase.auth.signInWithPassword()`. Has "Remember me" checkbox. Styled with backdrop blur, gradient effects, and the Hierarch logo/branding.
2. **Signup page** — Calls the server `/signup` endpoint, then auto-logs in via `signInWithPassword()`. Collects name, email, password.
3. **Session management** — On app load, calls `supabase.auth.getSession()`. Listens to `onAuthStateChange` for `SIGNED_IN`, `SIGNED_OUT`, `USER_DELETED` events. If refresh token is invalid, auto-signs out.
4. **Post-auth onboarding flow** (strict sequential gates):
   - If `user_metadata.has_seen_avatar` is falsy → Show **Avatar Selection** screen (full-screen overlay)
   - If `user_metadata.has_seen_onboarding` is falsy → Show **Onboarding** walkthrough
   - Otherwise → Show main app

---

## Theming

- **ThemeProvider** wraps the entire app, supports `dark`, `light`, `system` themes
- Theme stored in `localStorage` under key `hierarch-theme`
- Default theme: `dark`
- CSS custom properties define all colors (see theme details below)
- Light theme: Clean zinc/white palette with `--primary: #0091BB` (teal/cyan)
- Dark theme: True black background (`#000000`) with `--primary: #1EA5CF`, card bg `#121215`
- Custom scrollbar styling for both Webkit and Firefox
- Mobile input zoom prevention (`font-size: 16px !important` on inputs under 768px)

---

## App Architecture & Views

The app is a **single-page application** with a sidebar + main content area. No React Router — navigation is controlled by an `activeView` state string.

### Layout
- **Desktop**: Fixed sidebar (w-64) on the left + main content area
- **Mobile**: Sidebar is a full-screen overlay toggled by a back button; main content has a fixed top header bar (56px min-height) with back button and view title

### Sidebar
- User avatar + name at top with dropdown menu (Account, Settings, Theme toggle, Log Out)
- Two "nav cards" in a row: **Today** (with count badge of due/overdue tasks) and **All Tasks** (with count of non-done tasks)
- **Projects section** with:
  - Drag-and-drop reordering via `@dnd-kit`
  - Projects displayed with customizable icons (from a curated set of ~25 Lucide icons) and optional color
  - "Sections" (label-only dividers, stored as projects with `metadata.type: 'section'`)
  - Context menu on each project: Rename, Duplicate, Delete (with confirmation dialog)
  - "Add Project" and "Add Section" buttons
- Quick links: Resources, Time Tracking, Figma (placeholder), Apps (placeholder)
- Help button that re-triggers onboarding

### Views

1. **Today Overview** (`activeView === 'today'`)
   - "Good [morning/afternoon/evening], [Name]" greeting with date
   - Summary cards: Tasks due today, overdue tasks, completed tasks
   - **Focus Timer widget** (inline, with timer/stopwatch modes)
   - **Waiting For widget** — shows tasks that have `waitingFor` items (checklist of dependencies)
   - **Pinned Resources** section — resources with `pinned: true`
   - Task list showing today's due + overdue tasks with inline editing
   - Task detail drawer on click

2. **All Tasks** (`activeView === 'tasks'`)
   - **TaskBoard** component with two view modes: `list` (default) and `board`
   - **List view**: Spreadsheet-like table with columns: Select (checkbox), Done (status toggle), Task (title), Project, Due Date. Columns are resizable and toggleable via ColumnManager dialog.
   - **Board view**: Kanban board with draggable cards across status columns
   - Status columns are configurable via **StatusManager** dialog (add/remove/reorder/recolor statuses, mark one as "Done")
   - Default statuses: Backlog, In Progress, Review, Done (with slate/blue/amber/emerald colors)
   - Search/filter bar, sort options (by date, status, project), grouping by project
   - Bulk selection mode with multi-delete
   - Add task button + keyboard shortcut (Cmd+,)
   - Task detail drawer on click/tap

3. **Project Details** (`activeView === 'project:{name}'`)
   - Project header with icon, name, and description (editable)
   - **Blockers widget** — project-level blockers stored in `project.metadata.blockers` (checklist)
   - Embedded TaskBoard filtered to project tasks
   - **Resources section** — project-scoped resources shown as cards, with ability to create/edit/delete
   - Resources drawer for creating/editing documents (opens ResourceEditor in a Sheet/Drawer)

4. **Resources View** (`activeView === 'attachments'`)
   - Global resources not assigned to any project or task
   - Grid/list of ResourceCards with search, filter by type, sort
   - Drag-and-drop reordering
   - Create new resource button → opens DocumentResourceDrawer
   - Resource types: `Project Note`, `Meeting Note`, `Research`, `Link`

5. **Time Tracking** (`activeView === 'time-tracking'`)
   - History of recorded time sessions grouped by day
   - Each entry shows label, duration, start/end times
   - Delete entries

6. **Figma View** (`activeView === 'figma'`) — Placeholder/mock showing Figma-like file browser

7. **Apps Dashboard** (`activeView === 'apps'`) — Placeholder showing available integrations (Figma, Slack, GitHub, etc.) with install/connected states

8. **Account Settings** (`activeView === 'account'`)
   - View/edit profile (name, email, password)
   - Change avatar (select from pre-made Figma avatars or upload custom)
   - Avatar upload via server endpoint → Supabase Storage
   - **Delete Account** with confirmation dialog (calls server endpoint)

9. **Settings** (`activeView === 'settings'`)
   - Toggle sidebar project icons on/off (persisted to localStorage)
   - Theme selector (Light/Dark/System)

---

## Key Components

### TaskCard
- Compact card for board view with title, due date badge, project badge
- Drag handle via `@dnd-kit/sortable`
- Context menu (right-click): Duplicate, Delete
- Status toggle checkbox

### TaskRow
- Row for list view with inline cells
- Sortable via `@dnd-kit`
- Cells: Select (checkbox), Done (animated status dot), Task title (inline-editable Input), Project (badge), Due Date (with color coding: red for overdue, amber for today)
- Context menu: Select, Duplicate, Delete
- Tooltip on status dot showing status name

### TaskDetailsDrawer
- Opens as Sheet (desktop) or Drawer (mobile)
- Full task editing: title, description (with rich text option), status, project, due date
- **Waiting For** section — add/remove/toggle dependency checklist items per task
- **Resources** section — link/view resources associated with this task
- Delete task button

### ResourceEditor
- Full editor for creating/editing Resources
- Fields: Title, Type (select), Content (RichTextEditor for notes, URL input for links), Project assignment, Pinned toggle
- **Action Items** section for Meeting Notes (checklist)
- Auto-save support

### RichTextEditor
- Tiptap-based rich text editor
- Toolbar: Bold, Italic, Underline, Heading 1, Heading 2, Bullet List, Ordered List, Blockquote, Link
- Placeholder text support

### ResourceCard
- Three size variants: `sm`, `md`, `lg`
- Shows type icon, title, content preview, date
- Dropdown menu: Edit, Delete
- Link type shows external link icon

### FocusTimerWidget
- Dual mode: Timer (countdown) and Stopwatch (count-up)
- Multiple concurrent timers with labels
- Play/Pause/Reset controls
- Auto-saves completed sessions via time entries API
- State persisted to localStorage

### WaitingForWidget
- Shows all tasks that have `waitingFor` items
- Grouped display with task title and its dependency checklist
- Can add new waiting-for items, toggle completion, delete
- Filters out tasks where all items are completed

### IconPicker
- Popover with grid of ~25 curated Lucide icons
- Color picker with 8 preset colors
- Used for project customization

### Onboarding
- Multi-step fullscreen walkthrough (4-5 steps)
- Animated transitions between steps using Motion
- Steps: Welcome → How It Works (Projects/Tasks/Resources) → Key Features → Get Started
- Sets `user_metadata.has_seen_onboarding` on completion

### AvatarSelection
- Grid of 20 pre-made illustrated avatars (hosted on Supabase Storage at known URLs)
- Custom upload option
- Sets `user_metadata.has_seen_avatar` and `user_metadata.avatar_url` on completion

### Splash Screen
- Full-screen loading screen with Hierarch logo, animated spinner, "Loading Workspace..." text

### UpdateNotification
- Fixed bottom-right toast that appears when the app detects a new version (via ETag polling every 2 minutes)
- "Refresh Now" button

---

## Task Data Model

```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  status: Status; // string matching a StatusConfig.id
  tags: string[];
  dueDate: string; // ISO date string
  assignees: string[];
  order: number;
  project?: string; // Project name (UI-side); mapped from project_id
  waitingFor?: { id: string; title: string; completed: boolean }[];
  // Additional context fields (stored in description JSON or future columns):
  blocker?: string;
  decisionNeeded?: boolean;
  decisionDetails?: string;
  dependency?: string;
  artifact?: string;
}
```

## Resource Data Model

```typescript
type ResourceType = 'Project Note' | 'Meeting Note' | 'Research' | 'Link';

interface Resource {
  id: string;
  type: ResourceType;
  title: string;
  content?: string;
  url?: string;
  projectId?: string;
  taskId?: string;
  createdAt: string;
  pinned?: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
  order?: number;
}
```

## Project Data Model

```typescript
interface Project {
  id: string;
  name: string;
  description?: string;
  metadata?: {
    icon?: string; // Lucide icon name
    color?: string; // Tailwind color class
    type?: string; // 'section' for dividers
    order?: number;
    blockers?: { id: string; title: string; completed: boolean }[];
    [key: string]: any;
  };
  created_at: string;
  owner_id?: string;
}
```

## Status Configuration

```typescript
interface StatusConfig {
  id: string;
  title: string;
  color: string; // Tailwind bg class (e.g., 'bg-blue-500')
  countColor: string; // Tailwind text class
  order: number;
  width: number;
  visible?: boolean;
  isDone?: boolean; // Only one status should be marked as Done
}
```

Default statuses:
- Backlog (slate), In Progress (blue), Review (amber), Done (emerald, isDone)

---

## Important Implementation Details

### Optimistic Updates with Temp ID Mapping
- When creating a task locally, a temporary ID is generated via `Math.random().toString(36).substr(2, 9)`
- The task is saved to the DB asynchronously; the real UUID comes back
- A `tempIdMapping` ref (`Record<string, string>`) maps temp IDs → real UUIDs
- A `savingTaskIds` ref (`Set<string>`) prevents duplicate saves
- During the async save, if the user edits the task, the latest state is pushed after the ID is resolved
- All update/delete operations validate that the ID is a real UUID before hitting the DB

### Project Name ↔ ID Mapping
- The UI uses project **names** everywhere for display and state
- The data layer maps names ↔ UUIDs when talking to the DB
- Resources also map `projectId` (UUID from DB) to project name for UI consistency

### Responsive Design
- `useIsMobile()` hook (media query `max-width: 768px`)
- Sheet component on desktop, Drawer (vaul) on mobile for all slide-out panels
- Mobile: collapsible full-screen sidebar, fixed top header, adjusted spacing
- Prevent zoom on mobile inputs via CSS

### Keyboard Shortcuts
- `Cmd+,` (or `Ctrl+,`): Add new blank task

### Branding
- App name: **Hierarch**
- Tagline: "Build today, ship tomorrow." (login), "Design • Manage • Flow" (footer)
- Logo hosted at: Supabase Storage public bucket
- Primary color: Teal/Cyan (#0091BB light, #1EA5CF dark)
- Login page has a cell-shaded background image with gradient overlay and blur effects

---

## File Structure

```
/src/app/
  App.tsx                    # Main app component, auth flow, state management, view routing
  supabase-client.ts         # Singleton Supabase client
  types.ts                   # All TypeScript interfaces
  api/
    data.ts                  # Data access layer (direct Supabase queries)
  components/
    Login.tsx                # Login form
    Signup.tsx               # Signup form
    Splash.tsx               # Loading screen
    Onboarding.tsx           # Multi-step onboarding walkthrough
    AvatarSelection.tsx      # Avatar picker (pre-made + upload)
    Sidebar.tsx              # Main sidebar navigation with DnD project reordering
    SidebarNavCard.tsx       # Today/All Tasks summary cards
    TodayOverview.tsx        # Today view with timer, waiting-for, pinned resources
    TaskBoard.tsx            # Board/List view with DnD, search, filter, sort, bulk ops
    TaskCard.tsx             # Board view card
    TaskRow.tsx              # List view row
    TaskCells.tsx            # Inline cell components (Select, Title, Project, DueDate)
    TaskContextMenu.tsx      # Right-click context menu for tasks
    TaskDetailsDrawer.tsx    # Full task editor drawer/sheet
    ProjectDetails.tsx       # Project view with tasks + resources + blockers
    AttachmentsView.tsx      # Global resources view
    ResourceCard.tsx         # Resource display card (sm/md/lg variants)
    ResourceEditor.tsx       # Resource create/edit form with rich text
    ResourceList.tsx         # Draggable resource list with reordering
    DocumentResourceDrawer.tsx # Sheet/Drawer wrapper for ResourceEditor
    RichTextEditor.tsx       # Tiptap rich text editor
    FocusTimerWidget.tsx     # Timer/Stopwatch widget + hook
    WaitingForWidget.tsx     # Dependency tracking widget
    IconPicker.tsx           # Icon + color picker popover
    StatusManager.tsx        # Status column configuration dialog
    ColumnManager.tsx        # List column visibility/width dialog
    ThemeProvider.tsx         # Dark/Light/System theme context
    FigmaView.tsx            # Placeholder Figma file browser
    AppsDashboard.tsx        # Placeholder integrations page
    TimeTrackingView.tsx     # Time entry history view
    AccountSettings.tsx      # Profile + avatar + delete account
    SettingsPage.tsx         # App preferences (theme, sidebar icons)
    FigmaAvatars.tsx         # Pre-made avatar data + UserAvatar component
    UpdateNotification.tsx   # Version update toast
    ui/                      # ~48 shadcn/ui-style Radix primitive components
/supabase/functions/server/
  index.tsx                  # Hono server (signup, avatar upload, time entries, account deletion)
  kv_store.tsx               # KV store utility (used by server for time entries)
  migrate.ts                 # Data migration utility (KV → Postgres tables)
/src/styles/
  theme.css                  # CSS custom properties, scrollbar styles, base typography
  fonts.css                  # Font imports (currently empty)
  index.css                  # Global styles entry
  tailwind.css               # Tailwind directives
```

---

## Guidelines

- Always use "Resources" instead of "Attachments" in the UI (the code uses `Attachment` type alias for backward compatibility but all user-facing text says "Resources")
- Never mock API calls — always use real Supabase integration
- All DB queries filter by `owner_id` for security (RLS + application-level checks)
- Toast notifications for all success/error states via `sonner`
- Animations should be subtle and performant (fade-in, slide-in, scale)
- The app defaults to dark theme
- Error handling: log to console + show user-friendly toast
- Keep components modular and in separate files
