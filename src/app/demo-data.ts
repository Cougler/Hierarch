import type { Task, Project, TimeEntry } from './types'
import type { Artifact } from './components/NoteDrawer'

const today = new Date()
function daysFromNow(n: number) {
  const d = new Date(today)
  d.setDate(d.getDate() + n)
  return d.toISOString()
}
function hoursAgo(n: number) {
  return new Date(today.getTime() - n * 60 * 60 * 1000).toISOString()
}
function isoDate(n: number) {
  const d = new Date(today)
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

// ═════════════════════════════════════════════════════════════════════════════
// STARTER DATA — minimal set seeded into new accounts
// One task per phase, one note per type, one time entry
// ═════════════════════════════════════════════════════════════════════════════

export const STARTER_PROJECTS: Project[] = [
  {
    id: 'proj-starter',
    name: 'Getting Started',
    description: 'A quick tour of Hierarch. Each task below shows a different status. Try dragging them across the board.',
    metadata: {
      icon: 'Compass',
      color: '#8b5cf6',
      phase: 'explore',
      order: 0,
      start_date: isoDate(-3),
      end_date: isoDate(14),
    },
    created_at: daysFromNow(-3),
  },
]

export const STARTER_TASKS: Task[] = [
  {
    id: 'st-todo',
    title: 'Plan the user research sessions',
    description: 'New tasks start here. Move them to In Progress when you begin working.',
    status: 'todo',
    tags: [],
    dueDate: daysFromNow(7),
    assignees: [],
    order: 0,
    project: 'proj-starter',
    createdAt: daysFromNow(-3),
  },
  {
    id: 'st-progress',
    title: 'Draft the navigation structure',
    description: 'Actively working on this. Move to Feedback when you need a review.',
    status: 'in-progress',
    tags: [],
    dueDate: daysFromNow(5),
    assignees: [],
    order: 1,
    project: 'proj-starter',
    createdAt: daysFromNow(-2),
  },
  {
    id: 'st-feedback',
    title: 'Review the homepage layout',
    description: 'Moving a task to Feedback auto-creates a feedback note. Record the response in one place.',
    status: 'feedback',
    tags: [],
    dueDate: daysFromNow(2),
    assignees: [],
    order: 2,
    project: 'proj-starter',
    createdAt: daysFromNow(-3),
  },
  {
    id: 'st-done',
    title: 'Finalize the color palette',
    description: 'Completed tasks land here. These are hidden from active counts.',
    status: 'done',
    tags: [],
    dueDate: daysFromNow(-2),
    assignees: [],
    order: 3,
    project: 'proj-starter',
    createdAt: daysFromNow(-3),
  },
]

export const STARTER_DESIGN_NOTES: Artifact[] = [
  {
    id: 'st-note-freeform',
    title: 'Quick capture',
    text: 'Freeform notes are for anything. Jot down a thought, paste a link, sketch an idea.',
    type: 'freeform',
    projectId: 'proj-starter',
    timestamp: daysFromNow(-2),
    updatedAt: daysFromNow(-2),
  },
  {
    id: 'st-note-decision',
    title: 'Why we chose this direction',
    text: 'Decision notes record choices and rationale. Useful when someone asks "why?" later.',
    type: 'decision',
    projectId: 'proj-starter',
    timestamp: daysFromNow(-2),
    updatedAt: daysFromNow(-2),
  },
  {
    id: 'st-note-feedback',
    title: 'Feedback: waiting for a review',
    text: 'This note was auto-created when the task entered Feedback. Record reviewer comments here.',
    type: 'feedback',
    projectId: 'proj-starter',
    taskId: 'st-feedback',
    timestamp: daysFromNow(-1),
    updatedAt: daysFromNow(-1),
  },
  {
    id: 'st-note-research',
    title: 'Research findings',
    text: 'Research notes hold findings from interviews, audits, or data analysis.',
    type: 'research',
    projectId: 'proj-starter',
    timestamp: daysFromNow(-3),
    updatedAt: daysFromNow(-3),
  },
]

export const STARTER_TIME_ENTRIES: TimeEntry[] = []

// ═════════════════════════════════════════════════════════════════════════════
// DEMO DATA — realistic fake data for demo/test accounts
// ═════════════════════════════════════════════════════════════════════════════

export const DEMO_USER = {
  id: 'demo-user-001',
  email: 'demo@hierarch.app',
  user_metadata: {
    name: 'Jordan Reeves',
    full_name: 'Jordan Reeves',
    avatar_url: '',
    has_seen_avatar: true,
    has_seen_onboarding: true,
  },
  app_metadata: {},
  aud: 'authenticated',
  created_at: daysFromNow(-45),
}

export const DEMO_PROJECTS: Project[] = [
  {
    id: 'proj-finova',
    name: 'Finova Mobile Banking',
    description: 'Full redesign of the Finova consumer banking app. New onboarding flow, account dashboard, and money transfer experience across iOS and Android.',
    metadata: {
      icon: 'Banknote',
      color: '#3b82f6',
      phase: 'iterate',
      order: 0,
      start_date: isoDate(-30),
      end_date: isoDate(14),
    },
    created_at: daysFromNow(-30),
  },
  {
    id: 'proj-luma',
    name: 'Luma Health Portal',
    description: 'Patient-facing portal for Luma Health. Appointment scheduling, lab results, messaging, and prescription refills.',
    metadata: {
      icon: 'HeartPulse',
      color: '#10b981',
      phase: 'design',
      order: 1,
      start_date: isoDate(-21),
      end_date: isoDate(30),
    },
    created_at: daysFromNow(-21),
  },
  {
    id: 'proj-waymark',
    name: 'Waymark Design System',
    description: 'Internal design system for Waymark. Tokens, components, and documentation for the product engineering team.',
    metadata: {
      icon: 'Layers',
      color: '#8b5cf6',
      phase: 'explore',
      order: 2,
      start_date: isoDate(-14),
      end_date: isoDate(60),
    },
    created_at: daysFromNow(-14),
  },
]

export const DEMO_TASKS: Task[] = [

  // ── Finova Mobile Banking ────────────────────────────────────────────────────

  {
    id: 'task-fn-1',
    title: 'Competitive audit of top 5 banking apps',
    description: 'Analyzed Chime, Revolut, Cash App, Monzo, and current Finova app. Documented interaction patterns for onboarding, account overview, and transfers. Key insight: all top performers surface the primary balance above the fold with one-tap transfer access.',
    status: 'done',
    tags: ['research'],
    dueDate: daysFromNow(-22),
    assignees: [],
    order: 0,
    project: 'proj-finova',
    createdAt: daysFromNow(-28),
    phaseHistory: [
      { id: 'ph-fn1a', fromPhase: 'explore', toPhase: 'design', timestamp: daysFromNow(-25) },
      { id: 'ph-fn1b', fromPhase: 'design', toPhase: 'handoff', timestamp: daysFromNow(-22) },
    ],
  },
  {
    id: 'task-fn-2',
    title: 'Onboarding flow wireframes',
    description: 'Six-screen onboarding for new customers. Identity verification, funding source, PIN setup, and personalization. Progressive disclosure pattern keeps each step focused.',
    status: 'done',
    tags: ['wireframes'],
    dueDate: daysFromNow(-12),
    assignees: [],
    order: 1,
    project: 'proj-finova',
    createdAt: daysFromNow(-20),
    phaseHistory: [
      { id: 'ph-fn2a', fromPhase: 'explore', toPhase: 'design', timestamp: daysFromNow(-18) },
      { id: 'ph-fn2b', fromPhase: 'design', toPhase: 'iterate', timestamp: daysFromNow(-15) },
      { id: 'ph-fn2c', fromPhase: 'iterate', toPhase: 'review', timestamp: daysFromNow(-13), reviewer: 'Sarah Chen' },
      { id: 'ph-fn2d', fromPhase: 'review', toPhase: 'handoff', timestamp: daysFromNow(-12) },
    ],
  },
  {
    id: 'task-fn-3',
    title: 'Account dashboard hi-fi',
    description: 'High-fidelity designs for the main dashboard. Balance card, recent transactions list, quick actions bar, and spending insights widget. Dark and light modes.',
    status: 'feedback',
    tags: ['design'],
    dueDate: daysFromNow(1),
    assignees: [],
    order: 2,
    project: 'proj-finova',
    createdAt: daysFromNow(-10),
    phaseHistory: [
      { id: 'ph-fn3a', fromPhase: 'explore', toPhase: 'design', timestamp: daysFromNow(-8) },
      { id: 'ph-fn3b', fromPhase: 'design', toPhase: 'iterate', timestamp: daysFromNow(-5) },
      { id: 'ph-fn3c', fromPhase: 'iterate', toPhase: 'review', timestamp: daysFromNow(-1), reviewer: 'Marcus Webb', notes: 'Reviewing balance card hierarchy and transaction grouping' },
    ],
  },
  {
    id: 'task-fn-4',
    title: 'Money transfer experience',
    description: 'Send, request, and schedule payments. Contact picker, amount entry with currency conversion, confirmation screen with biometric auth.',
    status: 'in-progress',
    tags: ['design'],
    dueDate: daysFromNow(5),
    assignees: [],
    order: 3,
    project: 'proj-finova',
    createdAt: daysFromNow(-7),
    phaseHistory: [
      { id: 'ph-fn4a', fromPhase: 'explore', toPhase: 'design', timestamp: daysFromNow(-5) },
      { id: 'ph-fn4b', fromPhase: 'design', toPhase: 'iterate', timestamp: daysFromNow(-2) },
    ],
  },
  {
    id: 'task-fn-5',
    title: 'Push notification templates',
    description: 'Content and visual design for transaction alerts, security notifications, and marketing nudges. Needs to work across iOS and Android notification trays.',
    status: 'in-progress',
    tags: ['content'],
    dueDate: daysFromNow(10),
    assignees: [],
    order: 4,
    project: 'proj-finova',
    createdAt: daysFromNow(-3),
    phaseHistory: [
      { id: 'ph-fn5a', fromPhase: 'explore', toPhase: 'design', timestamp: daysFromNow(-1) },
    ],
  },
  {
    id: 'task-fn-6',
    title: 'Accessibility audit',
    description: 'WCAG 2.1 AA compliance review across all screens. Color contrast, touch targets, screen reader labels, and focus order.',
    status: 'todo',
    tags: ['accessibility'],
    dueDate: daysFromNow(12),
    assignees: [],
    order: 5,
    project: 'proj-finova',
    createdAt: daysFromNow(-1),
  },

  // ── Luma Health Portal ───────────────────────────────────────────────────────

  {
    id: 'task-lm-1',
    title: 'Patient interview synthesis',
    description: 'Interviewed 12 patients across three demographics (young adults, parents, seniors). Top pain points: finding available appointment slots, understanding lab results without medical jargon, and medication refill friction.',
    status: 'done',
    tags: ['research'],
    dueDate: daysFromNow(-14),
    assignees: [],
    order: 0,
    project: 'proj-luma',
    createdAt: daysFromNow(-21),
    phaseHistory: [
      { id: 'ph-lm1a', fromPhase: 'explore', toPhase: 'design', timestamp: daysFromNow(-18) },
      { id: 'ph-lm1b', fromPhase: 'design', toPhase: 'handoff', timestamp: daysFromNow(-14) },
    ],
  },
  {
    id: 'task-lm-2',
    title: 'Appointment scheduling flow',
    description: 'Provider search, availability calendar, visit type selection, insurance verification, and confirmation. Smart defaults based on patient history.',
    status: 'in-progress',
    tags: ['design'],
    dueDate: daysFromNow(4),
    assignees: [],
    order: 1,
    project: 'proj-luma',
    createdAt: daysFromNow(-12),
    phaseHistory: [
      { id: 'ph-lm2a', fromPhase: 'explore', toPhase: 'design', timestamp: daysFromNow(-10) },
      { id: 'ph-lm2b', fromPhase: 'design', toPhase: 'iterate', timestamp: daysFromNow(-4) },
    ],
    blockers: [
      { id: 'b-lm1', taskId: 'task-lm-2', type: 'team' as const, title: 'Insurance API documentation from engineering', createdAt: daysFromNow(-8), resolvedAt: daysFromNow(-3) },
      { id: 'b-lm2', taskId: 'task-lm-2', type: 'person' as const, title: 'Provider photo assets from marketing', owner: 'Sarah', createdAt: daysFromNow(-5) },
    ],
  },
  {
    id: 'task-lm-3',
    title: 'Lab results viewer',
    description: 'Plain-language lab result cards with trend graphs. Each result shows normal range context and a "What does this mean?" expandable section written at an 8th-grade reading level.',
    status: 'in-progress',
    tags: ['design'],
    dueDate: daysFromNow(14),
    assignees: [],
    order: 2,
    project: 'proj-luma',
    createdAt: daysFromNow(-6),
    phaseHistory: [
      { id: 'ph-lm3a', fromPhase: 'explore', toPhase: 'design', timestamp: daysFromNow(-2) },
    ],
  },
  {
    id: 'task-lm-4',
    title: 'Secure messaging UI',
    description: 'HIPAA-compliant messaging between patients and care teams. Thread view, attachment support, read receipts, and urgent flag.',
    status: 'todo',
    tags: ['design'],
    dueDate: daysFromNow(21),
    assignees: [],
    order: 3,
    project: 'proj-luma',
    createdAt: daysFromNow(-2),
  },

  // ── Waymark Design System ────────────────────────────────────────────────────

  {
    id: 'task-wm-1',
    title: 'Color and typography tokens',
    description: 'Semantic color palette (surface, border, text, accent) with light and dark themes. Type scale from 12px to 48px using Inter. Exported as CSS custom properties and Figma variables.',
    status: 'feedback',
    tags: ['tokens'],
    dueDate: daysFromNow(2),
    assignees: [],
    order: 0,
    project: 'proj-waymark',
    createdAt: daysFromNow(-12),
    phaseHistory: [
      { id: 'ph-wm1a', fromPhase: 'explore', toPhase: 'design', timestamp: daysFromNow(-10) },
      { id: 'ph-wm1b', fromPhase: 'design', toPhase: 'iterate', timestamp: daysFromNow(-6) },
      { id: 'ph-wm1c', fromPhase: 'iterate', toPhase: 'review', timestamp: daysFromNow(-2), reviewer: 'Engineering Lead', notes: 'Reviewing token naming conventions against existing codebase' },
    ],
  },
  {
    id: 'task-wm-2',
    title: 'Button and input components',
    description: 'Primary, secondary, ghost, and destructive button variants. Text input, select, checkbox, radio, and toggle components. All with hover, focus, disabled, and error states.',
    status: 'in-progress',
    tags: ['components'],
    dueDate: daysFromNow(8),
    assignees: [],
    order: 1,
    project: 'proj-waymark',
    createdAt: daysFromNow(-8),
    phaseHistory: [
      { id: 'ph-wm2a', fromPhase: 'explore', toPhase: 'design', timestamp: daysFromNow(-6) },
      { id: 'ph-wm2b', fromPhase: 'design', toPhase: 'iterate', timestamp: daysFromNow(-3) },
    ],
  },
  {
    id: 'task-wm-3',
    title: 'Spacing and layout scale',
    description: 'Base-4 spacing scale (4, 8, 12, 16, 24, 32, 48, 64, 96). Grid system with 12-column and auto-layout options. Responsive breakpoints at 640, 768, 1024, 1280.',
    status: 'in-progress',
    tags: ['tokens'],
    dueDate: daysFromNow(15),
    assignees: [],
    order: 2,
    project: 'proj-waymark',
    createdAt: daysFromNow(-5),
    phaseHistory: [
      { id: 'ph-wm3a', fromPhase: 'explore', toPhase: 'design', timestamp: daysFromNow(-2) },
    ],
  },
  {
    id: 'task-wm-4',
    title: 'Documentation site structure',
    description: 'Information architecture for the design system docs. Getting started, foundations, components, patterns, and resources sections.',
    status: 'todo',
    tags: ['documentation'],
    dueDate: daysFromNow(25),
    assignees: [],
    order: 3,
    project: 'proj-waymark',
    createdAt: daysFromNow(-1),
  },

  // ── Unassigned ───────────────────────────────────────────────────────────────

  {
    id: 'task-unassigned',
    title: 'Portfolio case study photography',
    description: 'Schedule a shoot for the Finova case study. Need hero image, process shots, and final UI mockups on device.',
    status: 'todo',
    tags: [],
    dueDate: '',
    assignees: [],
    order: 0,
    createdAt: daysFromNow(-1),
  },
]

export const DEMO_DESIGN_NOTES: Artifact[] = [
  {
    id: 'note-fn-research',
    title: 'Banking app competitive audit',
    text: 'Analyzed Chime, Revolut, Cash App, Monzo, and current Finova app.\n\nKey findings:\n- All top performers show primary balance above the fold\n- One-tap transfer access is table stakes\n- Chime and Revolut have the strongest onboarding (under 3 minutes to funded account)\n- Monzo excels at transaction categorization with real-time merchant logos\n- Current Finova app buries transfers two levels deep and requires 6 taps for a basic send',
    type: 'research',
    projectId: 'proj-finova',
    timestamp: daysFromNow(-25),
    updatedAt: daysFromNow(-22),
  },
  {
    id: 'note-fn-decision',
    title: 'Dashboard layout: single card vs. tabbed',
    text: 'Decided to go with a single scrollable card layout over a tabbed interface.\n\nRationale: user testing showed 73% of participants expected to see transactions immediately below their balance. Tabs created a false sense of separation between the balance and activity. The single-card approach scored higher on task completion for "check last 3 transactions" (4.2s vs 6.8s average).',
    type: 'decision',
    projectId: 'proj-finova',
    timestamp: daysFromNow(-6),
    updatedAt: daysFromNow(-6),
  },
  {
    id: 'note-fn-feedback',
    title: 'Feedback: Account dashboard hi-fi',
    text: 'Reviewer: Marcus Webb (Product)\n\nPositive:\n- Balance card hierarchy is clear and scannable\n- Spending insights widget adds real value without clutter\n\nTo address:\n- Transaction grouping by date needs stronger visual separation\n- "Quick actions" bar feels crowded with 5 actions. Suggest limiting to 3 and putting the rest in an overflow menu\n- Dark mode contrast on secondary text needs another pass (currently 3.8:1, needs 4.5:1)',
    type: 'feedback',
    projectId: 'proj-finova',
    taskId: 'task-fn-3',
    timestamp: daysFromNow(-1),
    updatedAt: hoursAgo(4),
  },
  {
    id: 'note-lm-research',
    title: 'Patient interview themes',
    text: '12 participants across 3 demographics (ages 22-34, 35-50, 65+)\n\nTop pain points:\n1. Finding available appointment slots: "I end up calling the office because the online system shows nothing for weeks"\n2. Lab results: "I get a notification but then I can\'t understand what the numbers mean"\n3. Medication refills: "I have to call every time. Why can\'t I just tap a button?"\n4. Messaging: "I never know if my doctor actually saw my message"\n\nBright spots:\n- Patients love having appointment history in one place\n- Push reminders for upcoming visits rated very highly (4.7/5)',
    type: 'research',
    projectId: 'proj-luma',
    timestamp: daysFromNow(-18),
    updatedAt: daysFromNow(-14),
  },
  {
    id: 'note-lm-freeform',
    title: 'Scheduling flow sketch notes',
    text: 'Rough flow:\n1. "Book appointment" → pick visit type (in-person, video, phone)\n2. Smart suggest: show last provider + next available slot as default\n3. Calendar view with provider availability (color-coded by wait time)\n4. Insurance auto-verified in background while user selects time\n5. Confirmation with add-to-calendar and prep instructions\n\nEdge case: what happens when insurance verification fails mid-flow? Need to handle gracefully without losing the selected slot.',
    type: 'freeform',
    projectId: 'proj-luma',
    timestamp: daysFromNow(-8),
    updatedAt: daysFromNow(-5),
  },
  {
    id: 'note-wm-feedback',
    title: 'Feedback: Color and typography tokens',
    text: 'Reviewer: Priya Patel (Engineering Lead)\n\nApproved with notes:\n- Token naming is solid. Matches the existing CSS variable pattern so migration will be smooth\n- Requesting one change: rename "accent" to "brand" at the top level. Engineering already uses "accent" for a different semantic meaning in the legacy codebase\n- Dark theme surface colors need one more mid-tone step between surface-2 and surface-3 for card nesting\n- Type scale approved as-is. Engineering will consume via CSS custom properties',
    type: 'feedback',
    projectId: 'proj-waymark',
    taskId: 'task-wm-1',
    timestamp: daysFromNow(-2),
    updatedAt: hoursAgo(8),
  },
  {
    id: 'note-wm-decision',
    title: 'Spacing scale: base-4 vs. base-8',
    text: 'Going with base-4 (4, 8, 12, 16, 24, 32, 48, 64, 96).\n\nBase-8 felt too restrictive for dense UI patterns like form layouts and table cells. The 12px step is critical for comfortable padding inside input fields and small cards. Base-4 gives us that granularity while still maintaining rhythm at larger sizes.',
    type: 'decision',
    projectId: 'proj-waymark',
    timestamp: daysFromNow(-4),
    updatedAt: daysFromNow(-4),
  },
]

function timeEntry(
  id: string,
  label: string,
  daysAgo: number,
  startHour: number,
  durationMin: number,
): TimeEntry {
  const start = new Date(today)
  start.setDate(start.getDate() - daysAgo)
  start.setHours(startHour, 0, 0, 0)
  const end = new Date(start.getTime() + durationMin * 60 * 1000)
  return {
    id,
    label,
    duration: durationMin * 60,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    createdAt: end.toISOString(),
  }
}

export const DEMO_TIME_ENTRIES: TimeEntry[] = [
  timeEntry('te-1', 'Account dashboard hi-fi',        0, 9,  105),
  timeEntry('te-2', 'Money transfer experience',       0, 14, 60),
  timeEntry('te-3', 'Appointment scheduling flow',     1, 10, 90),
  timeEntry('te-4', 'Button and input components',     1, 14, 75),
  timeEntry('te-5', 'Onboarding flow wireframes',      2, 9,  120),
  timeEntry('te-6', 'Color and typography tokens',     3, 10, 90),
  timeEntry('te-7', 'Patient interview synthesis',     4, 13, 60),
  timeEntry('te-8', 'Competitive audit',               5, 9,  80),
]
