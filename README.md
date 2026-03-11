# Hierarch — Visual-First Task Management

A modern, visual-first task management web application built with React 18, Tailwind CSS v4, and Supabase.

## Tech Stack

- **React 18** — Single-page app with view state routing
- **Tailwind CSS v4** — Utility-first CSS with custom theming
- **Motion** — Smooth animations and transitions
- **Supabase** — Auth, Postgres database, Storage, Edge Functions
- **@dnd-kit** — Drag-and-drop for boards, lists, and reordering
- **Radix UI** — Accessible UI primitives (shadcn/ui pattern)
- **Tiptap** — Rich text editing for resources
- **Lucide React** — Beautiful icon library

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

### Setup

1. **Clone and install dependencies:**

```bash
cd Hierarch
npm install
```

2. **Configure environment variables:**

```bash
cp .env.example .env
```

Edit `.env` with your Supabase project URL and anon key:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

3. **Set up the database:**

Run the SQL in `supabase/schema.sql` in your Supabase SQL Editor.

4. **Start the dev server:**

```bash
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173)

### Supabase Edge Functions

Deploy the server function for signup, avatar upload, time tracking, and account deletion:

```bash
supabase functions deploy server
```

## Features

- **Kanban Board & List View** — Drag-and-drop task management with customizable status columns
- **Project Organization** — Group tasks by project with custom icons and colors
- **Rich Resources** — Create notes, meeting notes, research docs, and links with a rich text editor
- **Focus Timer** — Built-in timer and stopwatch for time tracking
- **Waiting For** — Track task dependencies and blockers
- **Linear Integration** — Sync design issues with your team's Linear workspace
- **Dark/Light/System Theme** — Beautiful theming with CSS custom properties
- **Responsive Design** — Full mobile support with adaptive layouts
- **Onboarding Flow** — Guided setup for new users

## Project Structure

```
src/
  app/
    App.tsx              — Main app, auth flow, state, view routing
    types.ts             — TypeScript interfaces
    supabase-client.ts   — Supabase client singleton
    api/data.ts          — Data access layer
    api/linear.ts        — Linear GraphQL integration
    hooks/               — Custom React hooks
    lib/utils.ts         — Utility functions
    components/
      ui/                — 26 shadcn/ui-style primitives
      Login.tsx          — Auth login page
      Signup.tsx         — Auth signup page
      Splash.tsx         — Loading screen
      Onboarding.tsx     — Multi-step walkthrough
      Sidebar.tsx        — Navigation sidebar with DnD
      TaskBoard.tsx      — Board/List view
      TaskCard.tsx       — Kanban card
      TaskRow.tsx        — List row
      TaskDetailsDrawer  — Task editor drawer
      TodayOverview.tsx  — Dashboard view
      ProjectDetails.tsx — Project page
      LinearView.tsx     — Linear design board
      AttachmentsView    — Global resources
      ResourceEditor     — Resource create/edit
      RichTextEditor     — Tiptap editor
      ...and more
  styles/
    index.css            — Global styles + Tailwind
    theme.css            — CSS custom properties
supabase/
  schema.sql             — Database schema
  functions/server/      — Edge Function server
```
