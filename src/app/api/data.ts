import { supabase } from '../supabase-client';
import type {
  Task,
  Blocker,
  BlockerType,
  WaitingForItem,
  PhaseTransition,
  Resource,
  ResourceType,
  Project,
  ProjectMetadata,
} from '../types';
import { LEGACY_STATUS_MAP } from '../types';

const isValidUUID = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

function parseTaskDescription(raw: string | null): { content: string; phaseHistory: PhaseTransition[]; legacyWaitingFor: WaitingForItem[] } {
  if (!raw) return { content: '', phaseHistory: [], legacyWaitingFor: [] };
  try {
    const parsed = JSON.parse(raw) as { content?: string; waitingFor?: WaitingForItem[]; phaseHistory?: PhaseTransition[] };
    return {
      content: parsed.content ?? '',
      phaseHistory: Array.isArray(parsed.phaseHistory) ? parsed.phaseHistory : [],
      legacyWaitingFor: Array.isArray(parsed.waitingFor) ? parsed.waitingFor : [],
    };
  } catch {
    return { content: raw, phaseHistory: [], legacyWaitingFor: [] };
  }
}

function parseResourceContent(raw: string | null): {
  content: string;
  pinned: boolean;
  order: number;
  metadata: Record<string, unknown>;
} {
  if (!raw) return { content: '', pinned: false, order: 0, metadata: {} };
  try {
    const parsed = JSON.parse(raw) as {
      content?: string;
      pinned?: boolean;
      order?: number;
      metadata?: Record<string, unknown>;
    };
    return {
      content: parsed.content ?? '',
      pinned: parsed.pinned ?? false,
      order: parsed.order ?? 0,
      metadata: parsed.metadata ?? {},
    };
  } catch {
    return { content: raw, pinned: false, order: 0, metadata: {} };
  }
}

async function getOwnerId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

export async function getProjects(): Promise<Project[] | null> {
  try {
    const ownerId = await getOwnerId();
    let query = supabase.from('projects').select('*').order('created_at', { ascending: true });
    if (ownerId) {
      query = query.eq('owner_id', ownerId);
    }
    const { data, error } = await query;
    if (error) {
      console.error('getProjects error:', error);
      return null;
    }
    return (data ?? []) as Project[];
  } catch (err) {
    console.error('getProjects error:', err);
    return null;
  }
}

export async function createProject(
  name: string,
  metadata?: ProjectMetadata,
  startDate?: string,
  endDate?: string,
  description?: string
): Promise<Project | null> {
  try {
    const ownerId = await getOwnerId();
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name,
        description: description ?? null,
        metadata: metadata ?? {},
        start_date: startDate ?? null,
        end_date: endDate ?? null,
        owner_id: ownerId,
      })
      .select()
      .single();
    if (error) {
      console.error('createProject error:', error);
      return null;
    }
    return data as Project;
  } catch (err) {
    console.error('createProject error:', err);
    return null;
  }
}

export async function updateProject(
  id: string,
  updates: Partial<Pick<Project, 'name' | 'description' | 'metadata' | 'start_date' | 'end_date'>>
): Promise<Project | null> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('updateProject error:', error);
      return null;
    }
    return data as Project;
  } catch (err) {
    console.error('updateProject error:', err);
    return null;
  }
}

export async function deleteProject(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      console.error('deleteProject error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('deleteProject error:', err);
    return false;
  }
}

function mapDbTaskToTask(row: Record<string, unknown>): Task {
  const { content, phaseHistory } = parseTaskDescription(row.description as string | null);
  return {
    id: row.id as string,
    title: (row.title as string) ?? '',
    description: content,
    status: LEGACY_STATUS_MAP[((row.status as string) ?? 'explore').toLowerCase()] ?? ((row.status as string) ?? 'explore').toLowerCase(),
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    dueDate: (row.due_at as string) ?? '',
    assignees: Array.isArray(row.assignees) ? (row.assignees as string[]) : [],
    order: typeof row.position === 'number' ? row.position : 0,
    project: row.project_id as string | undefined,
    phaseHistory: phaseHistory.length > 0 ? phaseHistory : undefined,
    decisionNeeded: row.decision_needed as boolean | undefined,
    decisionDetails: row.decision_details as string | undefined,
    dependency: row.dependency as string | undefined,
    artifact: row.artifact as string | undefined,
    createdAt: (row.created_at as string) ?? undefined,
  };
}

function mapDbBlockerToBlocker(row: Record<string, unknown>): Blocker {
  return {
    id: row.id as string,
    taskId: row.task_id as string,
    type: (row.type as BlockerType) ?? 'person',
    title: (row.title as string) ?? '',
    owner: row.owner as string | undefined,
    linkedTaskId: row.linked_task_id as string | undefined,
    createdAt: (row.created_at as string) ?? '',
    resolvedAt: row.resolved_at as string | undefined,
  };
}

export async function getTasks(projectId?: string | null): Promise<Task[] | null> {
  try {
    let query = supabase.from('tasks').select('*').order('position', { ascending: true });
    if (projectId === null) {
      query = query.is('project_id', null);
    } else if (projectId !== undefined) {
      query = query.eq('project_id', projectId);
    }
    const { data, error } = await query;
    if (error) {
      console.error('getTasks error:', error);
      return null;
    }
    try {
      return (data ?? []).map(mapDbTaskToTask);
    } catch (mapErr) {
      console.error('getTasks mapping error:', mapErr);
      return null;
    }
  } catch (err) {
    console.error('getTasks error:', err);
    return null;
  }
}

export async function createTask(
  task: Omit<Task, 'id'> & { id?: string },
  projectId?: string
): Promise<Task | null> {
  try {
    const ownerId = await getOwnerId();
    const descriptionJson = JSON.stringify({
      content: task.description ?? '',
      phaseHistory: task.phaseHistory ?? [],
    });
    const insert: Record<string, unknown> = {
      title: task.title,
      description: descriptionJson,
      status: task.status ?? 'explore',
      tags: task.tags ?? [],
      due_at: task.dueDate || null,
      assignees: task.assignees ?? [],
      position: task.order ?? 0,
      project_id: projectId ?? task.project ?? null,
      decision_needed: task.decisionNeeded ?? false,
      decision_details: task.decisionDetails ?? null,
      dependency: task.dependency ?? null,
      artifact: task.artifact ?? null,
      owner_id: ownerId,
    };
    const { data, error } = await supabase.from('tasks').insert(insert).select().single();
    if (error) {
      console.error('createTask error:', error, 'insert payload:', insert);
      return null;
    }
    return mapDbTaskToTask(data as Record<string, unknown>);
  } catch (err) {
    console.error('createTask error:', err);
    return null;
  }
}

export async function updateTask(
  id: string,
  updates: Partial<Omit<Task, 'id'>>
): Promise<Task | null> {
  try {
    if (!isValidUUID(id)) {
      console.error('updateTask: invalid UUID', id);
      return null;
    }
    const { data: current, error: fetchError } = await supabase
      .from('tasks')
      .select('description')
      .eq('id', id)
      .single();
    if (fetchError || !current) {
      console.error('updateTask fetch error:', fetchError);
      return null;
    }
    const { content, phaseHistory } = parseTaskDescription(current.description as string | null);
    const mergedContent = updates.description !== undefined ? updates.description : content;
    const mergedPhaseHistory = updates.phaseHistory ?? phaseHistory;
    const descriptionJson = JSON.stringify({
      content: mergedContent,
      phaseHistory: mergedPhaseHistory,
    });
    const dbUpdates: Record<string, unknown> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
    if (updates.dueDate !== undefined) dbUpdates.due_at = updates.dueDate;
    if (updates.assignees !== undefined) dbUpdates.assignees = updates.assignees;
    if (updates.order !== undefined) dbUpdates.position = updates.order;
    if (updates.project !== undefined) dbUpdates.project_id = updates.project;
    if (updates.decisionNeeded !== undefined) dbUpdates.decision_needed = updates.decisionNeeded;
    if (updates.decisionDetails !== undefined) dbUpdates.decision_details = updates.decisionDetails;
    if (updates.dependency !== undefined) dbUpdates.dependency = updates.dependency;
    if (updates.artifact !== undefined) dbUpdates.artifact = updates.artifact;
    dbUpdates.description = descriptionJson;

    const { data, error } = await supabase
      .from('tasks')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('updateTask error:', error);
      return null;
    }
    return mapDbTaskToTask(data as Record<string, unknown>);
  } catch (err) {
    console.error('updateTask error:', err);
    return null;
  }
}

export async function deleteTask(id: string): Promise<boolean> {
  try {
    if (!isValidUUID(id)) {
      console.error('deleteTask: invalid UUID', id);
      return false;
    }
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      console.error('deleteTask error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('deleteTask error:', err);
    return false;
  }
}

function mapDbResourceToResource(row: Record<string, unknown>): Resource {
  const parsed = parseResourceContent(row.content as string | null);
  return {
    id: row.id as string,
    type: (row.type as ResourceType) ?? 'Project Note',
    title: (row.title as string) ?? '',
    content: parsed.content || undefined,
    url: row.url as string | undefined,
    projectId: row.project_id as string | undefined,
    taskId: row.task_id as string | undefined,
    createdAt: (row.created_at as string) ?? '',
    pinned: parsed.pinned ?? (row.pinned as boolean | undefined),
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : undefined,
    metadata: Object.keys(parsed.metadata).length > 0 ? parsed.metadata : undefined,
    order: parsed.order ?? (row.order as number | undefined),
  };
}

export async function getResources(): Promise<Resource[] | null> {
  try {
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('getResources error:', error);
      return null;
    }
    return (data ?? []).map(mapDbResourceToResource);
  } catch (err) {
    console.error('getResources error:', err);
    return null;
  }
}

export async function createResource(
  resource: Omit<Resource, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
  projectId?: string
): Promise<Resource | null> {
  try {
    const ownerId = await getOwnerId();
    const contentJson = JSON.stringify({
      content: resource.content ?? '',
      pinned: resource.pinned ?? false,
      order: resource.order ?? 0,
      metadata: resource.metadata ?? {},
    });
    const now = new Date().toISOString();
    const insert: Record<string, unknown> = {
      type: resource.type,
      title: resource.title,
      content: contentJson,
      url: resource.url ?? null,
      project_id: projectId ?? resource.projectId ?? null,
      task_id: resource.taskId ?? null,
      created_at: resource.createdAt ?? now,
      pinned: resource.pinned ?? false,
      tags: resource.tags ?? [],
      metadata: resource.metadata ?? {},
      order: resource.order ?? 0,
      owner_id: ownerId,
    };
    const { data, error } = await supabase.from('resources').insert(insert).select().single();
    if (error) {
      console.error('createResource error:', error);
      return null;
    }
    return mapDbResourceToResource(data as Record<string, unknown>);
  } catch (err) {
    console.error('createResource error:', err);
    return null;
  }
}

export async function updateResource(
  id: string,
  updates: Partial<Omit<Resource, 'id' | 'createdAt'>>
): Promise<Resource | null> {
  try {
    const { data: current, error: fetchError } = await supabase
      .from('resources')
      .select('content')
      .eq('id', id)
      .single();
    if (fetchError || !current) {
      console.error('updateResource fetch error:', fetchError);
      return null;
    }
    const parsed = parseResourceContent(current.content as string | null);
    const mergedContent = updates.content !== undefined ? updates.content : parsed.content;
    const mergedPinned = updates.pinned !== undefined ? updates.pinned : parsed.pinned;
    const mergedOrder = updates.order !== undefined ? updates.order : parsed.order;
    const mergedMetadata = updates.metadata !== undefined ? updates.metadata : parsed.metadata;
    const contentJson = JSON.stringify({
      content: mergedContent,
      pinned: mergedPinned,
      order: mergedOrder,
      metadata: mergedMetadata,
    });
    const dbUpdates: Record<string, unknown> = {
      content: contentJson,
    };
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.url !== undefined) dbUpdates.url = updates.url;
    if (updates.projectId !== undefined) dbUpdates.project_id = updates.projectId;
    if (updates.taskId !== undefined) dbUpdates.task_id = updates.taskId;
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags;

    const { data, error } = await supabase
      .from('resources')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('updateResource error:', error);
      return null;
    }
    return mapDbResourceToResource(data as Record<string, unknown>);
  } catch (err) {
    console.error('updateResource error:', err);
    return null;
  }
}

export async function deleteResource(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('resources').delete().eq('id', id);
    if (error) {
      console.error('deleteResource error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('deleteResource error:', err);
    return false;
  }
}

// ─── Blockers ───────────────────────────────────────────────────────

export async function getBlockersForUser(): Promise<Blocker[]> {
  try {
    const { data, error } = await supabase
      .from('task_blockers')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      console.error('getBlockersForUser error:', error);
      return [];
    }
    return (data ?? []).map(mapDbBlockerToBlocker);
  } catch (err) {
    console.error('getBlockersForUser error:', err);
    return [];
  }
}

export async function createBlocker(
  taskId: string,
  blocker: { type: BlockerType; title: string; owner?: string; linkedTaskId?: string }
): Promise<Blocker | null> {
  try {
    const ownerId = await getOwnerId();
    if (!ownerId) return null;
    const { data, error } = await supabase
      .from('task_blockers')
      .insert({
        task_id: taskId,
        user_id: ownerId,
        type: blocker.type,
        title: blocker.title,
        owner: blocker.owner ?? null,
        linked_task_id: blocker.linkedTaskId ?? null,
      })
      .select()
      .single();
    if (error) {
      console.error('createBlocker error:', error);
      return null;
    }
    return mapDbBlockerToBlocker(data as Record<string, unknown>);
  } catch (err) {
    console.error('createBlocker error:', err);
    return null;
  }
}

export async function resolveBlocker(id: string): Promise<Blocker | null> {
  try {
    const { data, error } = await supabase
      .from('task_blockers')
      .update({ resolved_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('resolveBlocker error:', error);
      return null;
    }
    return mapDbBlockerToBlocker(data as Record<string, unknown>);
  } catch (err) {
    console.error('resolveBlocker error:', err);
    return null;
  }
}

export async function unresolveBlocker(id: string): Promise<Blocker | null> {
  try {
    const { data, error } = await supabase
      .from('task_blockers')
      .update({ resolved_at: null })
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('unresolveBlocker error:', error);
      return null;
    }
    return mapDbBlockerToBlocker(data as Record<string, unknown>);
  } catch (err) {
    console.error('unresolveBlocker error:', err);
    return null;
  }
}

export async function deleteBlocker(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('task_blockers').delete().eq('id', id);
    if (error) {
      console.error('deleteBlocker error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('deleteBlocker error:', err);
    return false;
  }
}

/** Migrate legacy waitingFor items from description JSON to task_blockers table */
export async function migrateWaitingForToBlockers(): Promise<void> {
  if (localStorage.getItem('hierarch-blockers-migrated')) return;
  try {
    const ownerId = await getOwnerId();
    if (!ownerId) return;

    const { data: tasks, error } = await supabase.from('tasks').select('id, description');
    if (error || !tasks) return;

    for (const row of tasks) {
      const { legacyWaitingFor } = parseTaskDescription(row.description as string | null);
      if (legacyWaitingFor.length === 0) continue;

      // Check if blockers already exist for this task (idempotent)
      const { data: existing } = await supabase
        .from('task_blockers')
        .select('id')
        .eq('task_id', row.id)
        .limit(1);
      if (existing && existing.length > 0) continue;

      // Create blockers from waiting-for items
      const blockerInserts = legacyWaitingFor.map(wf => ({
        task_id: row.id,
        user_id: ownerId,
        type: 'person' as const,
        title: wf.title,
        resolved_at: wf.completed ? new Date().toISOString() : null,
      }));
      await supabase.from('task_blockers').insert(blockerInserts);

      // Rewrite description without waitingFor
      const parsed = JSON.parse(row.description as string);
      delete parsed.waitingFor;
      await supabase.from('tasks').update({ description: JSON.stringify(parsed) }).eq('id', row.id);
    }

    localStorage.setItem('hierarch-blockers-migrated', '1');
  } catch (err) {
    console.error('migrateWaitingForToBlockers error:', err);
  }
}
