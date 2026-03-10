import type { Task, Project, Resource, TimeEntry } from './types'
import type { DesignNote } from './components/NoteDrawer'

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

// ─── Demo User ─────────────────────────────────────────────────────────────────

export const DEMO_USER = {
  id: 'demo-user-001',
  email: 'demo@hierarch.app',
  user_metadata: {
    name: 'Demo User',
    full_name: 'Demo User',
    avatar_url: '',
    has_seen_avatar: true,
    has_seen_onboarding: true,
  },
  app_metadata: {},
  aud: 'authenticated',
  created_at: daysFromNow(-60),
}

// ─── Projects ──────────────────────────────────────────────────────────────────

export const DEMO_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: 'Noma Checkout Redesign',
    description: 'End-to-end redesign of the checkout flow for Noma, a DTC skincare brand.',
    metadata: {
      icon: 'ShoppingCart',
      color: '#8b5cf6',
      order: 0,
      start_date: isoDate(-21),
      end_date: isoDate(14),
    },
    created_at: daysFromNow(-21),
  },
  {
    id: 'proj-2',
    name: 'Wavelength Design System',
    description: 'Component library and design tokens for Wavelength, a podcast analytics platform.',
    metadata: {
      icon: 'Layers',
      color: '#3b82f6',
      order: 1,
      start_date: isoDate(-45),
      end_date: isoDate(10),
    },
    created_at: daysFromNow(-45),
  },
  {
    id: 'proj-3',
    name: 'Basecamp Mobile App',
    description: 'Native mobile app design for a coworking space booking platform.',
    metadata: {
      icon: 'Smartphone',
      color: '#10b981',
      order: 2,
      start_date: isoDate(-14),
      end_date: isoDate(28),
    },
    created_at: daysFromNow(-14),
  },
  {
    id: 'proj-4',
    name: 'Sonder Brand Identity',
    description: 'Visual identity system for Sonder, a boutique architecture studio.',
    metadata: {
      icon: 'Palette',
      color: '#f59e0b',
      order: 3,
      start_date: isoDate(-7),
      end_date: isoDate(35),
    },
    created_at: daysFromNow(-7),
  },
]

// ─── Tasks ─────────────────────────────────────────────────────────────────────

export const DEMO_TASKS: Task[] = [

  // ── Noma Checkout Redesign ───────────────────────────────────────────────────
  {
    id: 'task-1',
    title: 'Audit existing checkout funnel',
    description: 'Map every step of the current flow. Identify drop-off points from Hotjar data.',
    status: 'handoff',
    tags: ['research'],
    dueDate: daysFromNow(-18),
    assignees: [],
    order: 0,
    project: 'proj-1',
    createdAt: daysFromNow(-21),
    phaseHistory: [
      { id: 'ph-1a', fromPhase: 'explore', toPhase: 'define', timestamp: daysFromNow(-19) },
      { id: 'ph-1b', fromPhase: 'define', toPhase: 'refine', timestamp: daysFromNow(-18) },
      { id: 'ph-1c', fromPhase: 'refine', toPhase: 'handoff', timestamp: daysFromNow(-16) },
    ],
  },
  {
    id: 'task-2',
    title: 'Wireframe single-page checkout',
    description: 'Consolidate 4-step checkout into one scrollable page with inline validation.',
    status: 'handoff',
    tags: ['wireframes'],
    dueDate: daysFromNow(-12),
    assignees: [],
    order: 1,
    project: 'proj-1',
    createdAt: daysFromNow(-17),
    phaseHistory: [
      { id: 'ph-2a', fromPhase: 'explore', toPhase: 'define', timestamp: daysFromNow(-15) },
      { id: 'ph-2b', fromPhase: 'define', toPhase: 'feedback', timestamp: daysFromNow(-13), reviewer: 'Sarah (PM)' },
      { id: 'ph-2c', fromPhase: 'feedback', toPhase: 'refine', timestamp: daysFromNow(-12), notes: 'Approved with minor copy changes' },
      { id: 'ph-2d', fromPhase: 'refine', toPhase: 'handoff', timestamp: daysFromNow(-10) },
    ],
  },
  {
    id: 'task-3',
    title: 'Hi-fi checkout — desktop',
    description: 'Full visual design at 1440px with Noma brand system applied.',
    status: 'feedback',
    tags: ['design'],
    dueDate: daysFromNow(0),
    assignees: [],
    order: 2,
    project: 'proj-1',
    createdAt: daysFromNow(-10),
    phaseHistory: [
      { id: 'ph-3a', fromPhase: 'explore', toPhase: 'define', timestamp: daysFromNow(-8) },
      { id: 'ph-3b', fromPhase: 'define', toPhase: 'refine', timestamp: daysFromNow(-5) },
      { id: 'ph-3c', fromPhase: 'refine', toPhase: 'feedback', timestamp: daysFromNow(-1), reviewer: 'Design Lead' },
    ],
  },
  {
    id: 'task-4',
    title: 'Mobile checkout responsive layout',
    description: 'Adapt checkout for 375px and 768px. Touch-friendly inputs, bottom-anchored CTA.',
    status: 'refine',
    tags: ['design', 'responsive'],
    dueDate: daysFromNow(3),
    assignees: [],
    order: 3,
    project: 'proj-1',
    createdAt: daysFromNow(-5),
    phaseHistory: [
      { id: 'ph-4a', fromPhase: 'explore', toPhase: 'define', timestamp: daysFromNow(-3) },
      { id: 'ph-4b', fromPhase: 'define', toPhase: 'refine', timestamp: daysFromNow(-1) },
    ],
  },
  {
    id: 'task-5',
    title: 'Checkout success & error states',
    description: 'Design confirmation screen, payment failure, and address validation errors.',
    status: 'define',
    tags: ['design'],
    dueDate: daysFromNow(5),
    assignees: [],
    order: 4,
    project: 'proj-1',
    createdAt: daysFromNow(-3),
    phaseHistory: [
      { id: 'ph-5a', fromPhase: 'explore', toPhase: 'define', timestamp: daysFromNow(-1) },
    ],
  },
  {
    id: 'task-6',
    title: 'Dev handoff — interaction specs',
    description: 'Annotated Figma file with animation timing, focus order, and edge cases.',
    status: 'explore',
    tags: ['handoff'],
    dueDate: daysFromNow(10),
    assignees: [],
    order: 5,
    project: 'proj-1',
    createdAt: daysFromNow(-1),
  },

  // ── Wavelength Design System ─────────────────────────────────────────────────
  {
    id: 'task-7',
    title: 'Color token system',
    description: 'Semantic tokens mapped to primitives. Light + dark mode with WCAG AA contrast.',
    status: 'handoff',
    tags: ['tokens'],
    dueDate: daysFromNow(-30),
    assignees: [],
    order: 0,
    project: 'proj-2',
    createdAt: daysFromNow(-42),
    phaseHistory: [
      { id: 'ph-7a', fromPhase: 'explore', toPhase: 'define', timestamp: daysFromNow(-40) },
      { id: 'ph-7b', fromPhase: 'define', toPhase: 'refine', timestamp: daysFromNow(-35) },
      { id: 'ph-7c', fromPhase: 'refine', toPhase: 'handoff', timestamp: daysFromNow(-30) },
    ],
  },
  {
    id: 'task-8',
    title: 'Button component — all variants',
    description: 'Primary, secondary, ghost, destructive. All sizes, states, and loading spinners.',
    status: 'handoff',
    tags: ['components'],
    dueDate: daysFromNow(-20),
    assignees: [],
    order: 1,
    project: 'proj-2',
    createdAt: daysFromNow(-35),
    phaseHistory: [
      { id: 'ph-8a', fromPhase: 'explore', toPhase: 'refine', timestamp: daysFromNow(-28) },
      { id: 'ph-8b', fromPhase: 'refine', toPhase: 'feedback', timestamp: daysFromNow(-24), reviewer: 'Engineering' },
      { id: 'ph-8c', fromPhase: 'feedback', toPhase: 'refine', timestamp: daysFromNow(-22), notes: 'Need larger touch targets on mobile' },
      { id: 'ph-8d', fromPhase: 'refine', toPhase: 'handoff', timestamp: daysFromNow(-20) },
    ],
  },
  {
    id: 'task-9',
    title: 'Data table component',
    description: 'Sortable columns, pagination, row selection, and inline editing.',
    status: 'refine',
    tags: ['components'],
    dueDate: daysFromNow(2),
    assignees: [],
    order: 2,
    project: 'proj-2',
    createdAt: daysFromNow(-10),
    phaseHistory: [
      { id: 'ph-9a', fromPhase: 'explore', toPhase: 'define', timestamp: daysFromNow(-7) },
      { id: 'ph-9b', fromPhase: 'define', toPhase: 'refine', timestamp: daysFromNow(-2) },
    ],
  },
  {
    id: 'task-10',
    title: 'Chart component library',
    description: 'Line, bar, and donut charts for the analytics dashboard. Recharts + custom theming.',
    status: 'explore',
    tags: ['components'],
    dueDate: daysFromNow(8),
    assignees: [],
    order: 3,
    project: 'proj-2',
    createdAt: daysFromNow(-3),
  },
  {
    id: 'task-11',
    title: 'Documentation site — component pages',
    description: 'Usage guidelines, props table, and live examples for each component.',
    status: 'explore',
    tags: ['docs'],
    dueDate: daysFromNow(10),
    assignees: [],
    order: 4,
    project: 'proj-2',
    createdAt: daysFromNow(-2),
  },

  // ── Basecamp Mobile App ──────────────────────────────────────────────────────
  {
    id: 'task-12',
    title: 'Competitive analysis — coworking apps',
    description: 'Analyze WeWork, Deskpass, and Croissant. Map feature sets and booking flows.',
    status: 'handoff',
    tags: ['research'],
    dueDate: daysFromNow(-10),
    assignees: [],
    order: 0,
    project: 'proj-3',
    createdAt: daysFromNow(-14),
    phaseHistory: [
      { id: 'ph-12a', fromPhase: 'explore', toPhase: 'define', timestamp: daysFromNow(-12) },
      { id: 'ph-12b', fromPhase: 'define', toPhase: 'handoff', timestamp: daysFromNow(-10) },
    ],
  },
  {
    id: 'task-13',
    title: 'User flow — book a space',
    description: 'End-to-end flow from search to confirmation. Include filters, map view, and payment.',
    status: 'feedback',
    tags: ['ux'],
    dueDate: daysFromNow(1),
    assignees: [],
    order: 1,
    project: 'proj-3',
    createdAt: daysFromNow(-10),
    phaseHistory: [
      { id: 'ph-13a', fromPhase: 'explore', toPhase: 'define', timestamp: daysFromNow(-8) },
      { id: 'ph-13b', fromPhase: 'define', toPhase: 'refine', timestamp: daysFromNow(-4) },
      { id: 'ph-13c', fromPhase: 'refine', toPhase: 'feedback', timestamp: daysFromNow(-1), reviewer: 'Product Team' },
    ],
  },
  {
    id: 'task-14',
    title: 'Home screen — saved spaces & upcoming bookings',
    description: 'Dashboard with quick-book cards, upcoming reservations, and recently visited spaces.',
    status: 'define',
    tags: ['design'],
    dueDate: daysFromNow(7),
    assignees: [],
    order: 2,
    project: 'proj-3',
    createdAt: daysFromNow(-5),
    phaseHistory: [
      { id: 'ph-14a', fromPhase: 'explore', toPhase: 'define', timestamp: daysFromNow(-2) },
    ],
  },
  {
    id: 'task-15',
    title: 'Space detail page with photo gallery',
    description: 'Amenities list, pricing, availability calendar, and photo carousel.',
    status: 'explore',
    tags: ['design'],
    dueDate: daysFromNow(14),
    assignees: [],
    order: 3,
    project: 'proj-3',
    createdAt: daysFromNow(-2),
  },

  // ── Sonder Brand Identity ────────────────────────────────────────────────────
  {
    id: 'task-16',
    title: 'Moodboard & visual direction',
    description: 'Three directions: Minimal Geometric, Warm Organic, Bold Modern. Client picks one.',
    status: 'feedback',
    tags: ['branding'],
    dueDate: daysFromNow(0),
    assignees: [],
    order: 0,
    project: 'proj-4',
    createdAt: daysFromNow(-7),
    phaseHistory: [
      { id: 'ph-16a', fromPhase: 'explore', toPhase: 'define', timestamp: daysFromNow(-5) },
      { id: 'ph-16b', fromPhase: 'define', toPhase: 'refine', timestamp: daysFromNow(-3) },
      { id: 'ph-16c', fromPhase: 'refine', toPhase: 'feedback', timestamp: daysFromNow(-1), reviewer: 'Sonder Founders' },
    ],
  },
  {
    id: 'task-17',
    title: 'Logo exploration — 10 concepts',
    description: 'Wordmark, lettermark, and symbol variations. Present top 5 to client.',
    status: 'refine',
    tags: ['branding', 'logo'],
    dueDate: daysFromNow(5),
    assignees: [],
    order: 1,
    project: 'proj-4',
    createdAt: daysFromNow(-5),
    phaseHistory: [
      { id: 'ph-17a', fromPhase: 'explore', toPhase: 'refine', timestamp: daysFromNow(-2) },
    ],
  },
  {
    id: 'task-18',
    title: 'Typography & color palette',
    description: 'Primary + secondary typefaces, full color system with architecture-inspired neutrals.',
    status: 'explore',
    tags: ['branding'],
    dueDate: daysFromNow(12),
    assignees: [],
    order: 2,
    project: 'proj-4',
    createdAt: daysFromNow(-3),
  },

  // ── Inbox (no project) ────────────────────────────────────────────────────────
  {
    id: 'task-19',
    title: 'Review competitor onboarding flows',
    description: 'Screenshot and annotate onboarding from Linear, Notion, and Figma.',
    status: 'explore',
    tags: ['research'],
    dueDate: '',
    assignees: [],
    order: 0,
    createdAt: daysFromNow(-1),
  },
  {
    id: 'task-20',
    title: 'Update portfolio with Noma case study',
    description: '',
    status: 'explore',
    tags: ['personal'],
    dueDate: daysFromNow(14),
    assignees: [],
    order: 1,
    createdAt: daysFromNow(-2),
  },
]

// ─── Design Notes ─────────────────────────────────────────────────────────────

export const DEMO_DESIGN_NOTES: DesignNote[] = [
  {
    id: 'note-1',
    title: 'Checkout flow pain points',
    text: 'Users abandon at shipping step — too many fields. Consider address autocomplete and express checkout options.',
    type: 'research',
    projectId: 'proj-1',
    timestamp: daysFromNow(-15),
    updatedAt: daysFromNow(-15),
  },
  {
    id: 'note-2',
    title: 'Decision: Single-page checkout',
    text: 'Going with a single scrollable page instead of multi-step. Reduces perceived effort and lets users see total cost at all times.',
    type: 'decision',
    projectId: 'proj-1',
    timestamp: daysFromNow(-12),
    updatedAt: daysFromNow(-12),
  },
  {
    id: 'note-3',
    title: 'Feedback from Sarah on wireframes',
    text: 'Likes the simplified flow. Wants gift messaging option added before payment. Also asked about Apple Pay support.',
    type: 'feedback',
    projectId: 'proj-1',
    timestamp: daysFromNow(-11),
    updatedAt: hoursAgo(8),
  },
  {
    id: 'note-4',
    title: 'Token naming conventions',
    text: 'Using semantic names: --color-surface, --color-on-surface, --color-primary, --color-primary-hover. Primitives stay internal.',
    type: 'decision',
    projectId: 'proj-2',
    timestamp: daysFromNow(-38),
    updatedAt: daysFromNow(-38),
  },
  {
    id: 'note-5',
    title: 'Booking flow UX notes',
    text: 'Map view should be the primary discovery method. List is secondary. Users want to see availability before tapping into details.',
    type: 'freeform',
    projectId: 'proj-3',
    timestamp: daysFromNow(-6),
    updatedAt: daysFromNow(-4),
  },
  {
    id: 'note-6',
    title: 'Sonder moodboard direction feedback',
    text: 'Founders lean toward Minimal Geometric but want warmer tones. Combining elements from directions 1 and 2.',
    type: 'critique',
    projectId: 'proj-4',
    timestamp: hoursAgo(18),
    updatedAt: hoursAgo(18),
  },
]

// ─── Resources ─────────────────────────────────────────────────────────────────

export const DEMO_RESOURCES: Resource[] = [
  {
    id: 'res-1',
    type: 'Project Note',
    title: 'Noma Checkout — Project Brief',
    content: '## Goal\nReduce checkout abandonment by 25% through a simplified, single-page checkout experience.\n\n## Constraints\n- Must support Apple Pay and Google Pay\n- Ship by end of Q1\n- Maintain existing Stripe integration',
    projectId: 'proj-1',
    createdAt: daysFromNow(-21),
    pinned: true,
    order: 0,
  },
  {
    id: 'res-2',
    type: 'Link',
    title: 'Figma — Noma Checkout Redesign',
    url: 'https://figma.com',
    projectId: 'proj-1',
    createdAt: daysFromNow(-20),
    pinned: true,
    order: 1,
  },
  {
    id: 'res-3',
    type: 'Research',
    title: 'Wavelength — Token Architecture',
    content: '## Semantic Tokens\n- `--color-surface` → `--gray-50` (light) / `--gray-900` (dark)\n- `--color-primary` → `--violet-500`\n- `--color-on-primary` → `--white`\n\n## Scale\n4px base unit. Spacing: 4, 8, 12, 16, 24, 32, 48, 64.',
    projectId: 'proj-2',
    createdAt: daysFromNow(-40),
    pinned: true,
    order: 0,
  },
  {
    id: 'res-4',
    type: 'Meeting Note',
    title: 'Basecamp — Kickoff Call',
    content: '**Attendees:** Jamie (founder), Alex (eng lead), me\n\n**Key decisions:**\n- React Native with Expo\n- MapKit for iOS, Google Maps for Android\n- MVP: search, book, pay\n\n**Next steps:**\n- [x] Competitive analysis\n- [ ] User flow diagrams\n- [ ] Design system token setup',
    projectId: 'proj-3',
    createdAt: daysFromNow(-14),
    pinned: false,
    order: 0,
  },
  {
    id: 'res-5',
    type: 'Project Note',
    title: 'Sonder — Brand Brief',
    content: '## About\nSonder is a boutique architecture studio specializing in residential renovations. Based in Portland.\n\n## Personality\nCalm, precise, warm. "Quiet confidence."\n\n## Deliverables\n- Logo (primary + icon)\n- Color palette\n- Typography system\n- Brand guidelines PDF',
    projectId: 'proj-4',
    createdAt: daysFromNow(-7),
    pinned: false,
    order: 0,
  },
  {
    id: 'res-6',
    type: 'Link',
    title: 'Coworking App Screenshots — Mobbin',
    url: 'https://mobbin.com',
    createdAt: daysFromNow(-12),
    pinned: false,
    order: 0,
  },
]

// ─── Time Entries ──────────────────────────────────────────────────────────────

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
  timeEntry('te-1', 'Noma — hi-fi checkout desktop',        0, 9,  120),
  timeEntry('te-2', 'Wavelength — data table component',     1, 10, 90),
  timeEntry('te-3', 'Basecamp — booking flow wireframes',    1, 14, 75),
  timeEntry('te-4', 'Sonder — logo sketches',                2, 9,  150),
  timeEntry('te-5', 'Noma — mobile responsive layout',       3, 10, 105),
  timeEntry('te-6', 'Wavelength — button component QA',      4, 15, 60),
  timeEntry('te-7', 'Basecamp — competitive analysis',       5, 11, 90),
  timeEntry('te-8', 'Sonder — moodboard assembly',           6, 9,  180),
]
