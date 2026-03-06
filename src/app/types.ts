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
  blocker?: string;
  decisionNeeded?: boolean;
  decisionDetails?: string;
  dependency?: string;
  artifact?: string;
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
  { id: 'backlog', title: 'Backlog', color: 'bg-slate-500', countColor: 'text-slate-400', order: 0, width: 280, visible: true },
  { id: 'in-progress', title: 'In Progress', color: 'bg-blue-500', countColor: 'text-blue-400', order: 1, width: 280, visible: true },
  { id: 'review', title: 'Review', color: 'bg-amber-500', countColor: 'text-amber-400', order: 2, width: 280, visible: true },
  { id: 'done', title: 'Done', color: 'bg-emerald-500', countColor: 'text-emerald-400', order: 3, width: 280, visible: true, isDone: true },
];

export type Attachment = Resource; // backward compat alias
