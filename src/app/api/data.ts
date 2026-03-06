import { supabase } from '../supabase-client';
import type {
  Task,
  WaitingForItem,
  Resource,
  ResourceType,
  Project,
  ProjectMetadata,
} from '../types';

const isValidUUID = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

function parseTaskDescription(raw: string | null): { content: string; waitingFor: WaitingForItem[] } {
  if (!raw) return { content: '', waitingFor: [] };
  try {
    const parsed = JSON.parse(raw) as { content?: string; waitingFor?: WaitingForItem[] };
    return {
      content: parsed.content ?? '',
      waitingFor: Array.isArray(parsed.waitingFor) ? parsed.waitingFor : [],
    };
  } catch {
    return { content: raw, waitingFor: [] };
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
  metadata?: ProjectMetadata
): Promise<Project | null> {
  try {
    const ownerId = await getOwnerId();
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name,
        metadata: metadata ?? {},
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
  updates: Partial<Pick<Project, 'name' | 'description' | 'metadata'>>
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
  const { content, waitingFor } = parseTaskDescription(row.description as string | null);
  return {
    id: row.id as string,
    title: (row.title as string) ?? '',
    description: content,
    status: (row.status as string) ?? 'backlog',
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    dueDate: (row.due_at as string) ?? '',
    assignees: Array.isArray(row.assignees) ? (row.assignees as string[]) : [],
    order: typeof row.position === 'number' ? row.position : 0,
    project: row.project_id as string | undefined,
    waitingFor: waitingFor.length > 0 ? waitingFor : undefined,
    blocker: row.blocker as string | undefined,
    decisionNeeded: row.decision_needed as boolean | undefined,
    decisionDetails: row.decision_details as string | undefined,
    dependency: row.dependency as string | undefined,
    artifact: row.artifact as string | undefined,
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
    return (data ?? []).map(mapDbTaskToTask);
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
      waitingFor: task.waitingFor ?? [],
    });
    const insert: Record<string, unknown> = {
      title: task.title,
      description: descriptionJson,
      status: task.status ?? 'backlog',
      tags: task.tags ?? [],
      due_at: task.dueDate || null,
      assignees: task.assignees ?? [],
      position: task.order ?? 0,
      project_id: projectId ?? task.project ?? null,
      blocker: task.blocker ?? null,
      decision_needed: task.decisionNeeded ?? false,
      decision_details: task.decisionDetails ?? null,
      dependency: task.dependency ?? null,
      artifact: task.artifact ?? null,
      owner_id: ownerId,
    };
    const { data, error } = await supabase.from('tasks').insert(insert).select().single();
    if (error) {
      console.error('createTask error:', error);
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
    const { content, waitingFor } = parseTaskDescription(current.description as string | null);
    const mergedContent = updates.description !== undefined ? updates.description : content;
    const mergedWaitingFor = updates.waitingFor ?? waitingFor;
    const descriptionJson = JSON.stringify({
      content: mergedContent,
      waitingFor: mergedWaitingFor,
    });
    const dbUpdates: Record<string, unknown> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
    if (updates.dueDate !== undefined) dbUpdates.due_at = updates.dueDate;
    if (updates.assignees !== undefined) dbUpdates.assignees = updates.assignees;
    if (updates.order !== undefined) dbUpdates.position = updates.order;
    if (updates.project !== undefined) dbUpdates.project_id = updates.project;
    if (updates.blocker !== undefined) dbUpdates.blocker = updates.blocker;
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
