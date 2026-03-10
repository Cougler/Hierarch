export interface PhaseTransition {
  id: string;
  fromPhase: string;
  toPhase: string;
  timestamp: string;
  reviewer?: string;
  deadline?: string;
  notes?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  tags: string[];
  dueDate: string;
  assignees: string[];
  order: number;
  project?: string;
  waitingFor?: WaitingForItem[];
  phaseHistory?: PhaseTransition[];
  blocker?: string;
  decisionNeeded?: boolean;
  decisionDetails?: string;
  dependency?: string;
  artifact?: string;
  createdAt?: string;
}

export interface WaitingForItem {
  id: string;
  title: string;
  completed: boolean;
}

export type ResourceType = 'Project Note' | 'Meeting Note' | 'Research' | 'Link';

export interface Resource {
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
  metadata?: Record<string, unknown>;
  order?: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  metadata?: ProjectMetadata;
  start_date?: string; // ISO date string (YYYY-MM-DD)
  end_date?: string;   // ISO date string (YYYY-MM-DD)
  created_at: string;
  owner_id?: string;
}

export interface ProjectMetadata {
  icon?: string;
  color?: string;
  type?: string;
  order?: number;
  blockers?: BlockerItem[];
  start_date?: string; // ISO date string
  end_date?: string;   // ISO date string
  [key: string]: unknown;
}

export interface BlockerItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface StatusConfig {
  id: string;
  title: string;
  color: string;
  countColor: string;
  order: number;
  width: number;
  visible?: boolean;
  isDone?: boolean;
  isFeedback?: boolean;
}

export interface TimeEntry {
  id: string;
  label: string;
  duration: number;
  startTime: string;
  endTime: string;
  createdAt: string;
}

export const DEFAULT_STATUSES: StatusConfig[] = [
  { id: 'explore', title: 'Explore', color: 'bg-violet-500', countColor: 'text-violet-400', order: 0, width: 280, visible: true },
  { id: 'define', title: 'Define', color: 'bg-blue-500', countColor: 'text-blue-400', order: 1, width: 280, visible: true },
  { id: 'refine', title: 'Refine', color: 'bg-amber-500', countColor: 'text-amber-400', order: 2, width: 280, visible: true },
  { id: 'feedback', title: 'Feedback', color: 'bg-orange-500', countColor: 'text-orange-400', order: 3, width: 280, visible: true, isFeedback: true },
  { id: 'handoff', title: 'Handoff', color: 'bg-emerald-500', countColor: 'text-emerald-400', order: 4, width: 280, visible: true, isDone: true },
];

// Maps old engineering statuses to design phases for migration
export const LEGACY_STATUS_MAP: Record<string, string> = {
  'backlog': 'explore',
  'in-progress': 'refine',
  'review': 'feedback',
  'done': 'handoff',
};

export type Attachment = Resource; // backward compat alias
