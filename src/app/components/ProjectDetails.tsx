'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { cn } from '@/app/lib/utils';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { AnimatePresence, motion } from 'motion/react';
import {
  Plus, AlertTriangle, FileText, CalendarRange, Paperclip,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Task, Project, StatusConfig, Resource, BlockerItem } from '@/app/types';
import { IconPicker, getIconComponent } from '@/app/components/IconPicker';
import { TaskBoard } from '@/app/components/TaskBoard';
import { ResourceItem } from '@/app/components/ResourceItem';
import { ChecklistSection } from '@/app/components/ChecklistSection';
import { DocumentResourceDrawer } from '@/app/components/DocumentResourceDrawer';
import { format, parseISO } from 'date-fns';

type TabId = 'tasks' | 'resources' | 'details';

interface ProjectDetailsProps {
  project: Project;
  tasks: Task[];
  projects: Project[];
  statuses: StatusConfig[];
  resources: Resource[];
  onProjectUpdate: (id: string, updates: Partial<Project>) => void;
  onTaskCreate: (task: Partial<Task>) => void;
  onTaskUpdate: (id: string, updates: Partial<Task>) => void;
  onTaskDelete: (id: string) => void;
  onTaskClick: (task: Task) => void;
  onStatusesChange: (statuses: StatusConfig[]) => void;
  onResourceCreate: (resource: Partial<Resource>) => void;
  onResourceUpdate: (id: string, updates: Partial<Resource>) => void;
  onResourceDelete: (id: string) => void;
}

function formatDate(iso?: string) {
  if (!iso) return null;
  try { return format(parseISO(iso), 'MMM d, yyyy'); } catch { return iso; }
}

export function ProjectDetails({
  project,
  tasks,
  projects,
  statuses,
  resources,
  onProjectUpdate,
  onTaskCreate,
  onTaskUpdate,
  onTaskDelete,
  onTaskClick,
  onStatusesChange,
  onResourceCreate,
  onResourceUpdate,
  onResourceDelete,
}: ProjectDetailsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('tasks');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | undefined>();
  const nameRef = useRef<HTMLInputElement>(null);

  const ProjectIcon = getIconComponent(project.metadata?.icon);

  const projectResources = useMemo(
    () => resources.filter((r) => r.projectId === project.id || r.projectId === project.name),
    [resources, project.id, project.name],
  );

  const blockers: BlockerItem[] = useMemo(
    () => project.metadata?.blockers || [],
    [project.metadata?.blockers],
  );

  const activeBlockers = blockers.filter((b) => !b.completed).length;

  const handleIconChange = useCallback(
    (icon: string, color: string) => {
      onProjectUpdate(project.id, { metadata: { ...project.metadata, icon, color } });
    },
    [project, onProjectUpdate],
  );

  const updateBlockers = useCallback(
    (updated: BlockerItem[]) => {
      onProjectUpdate(project.id, { metadata: { ...project.metadata, blockers: updated } });
    },
    [project, onProjectUpdate],
  );

  const handleResourceEdit = useCallback((resource: Resource) => {
    setEditingResource(resource);
    setDrawerOpen(true);
  }, []);

  const handleResourceSave = useCallback(
    (data: Partial<Resource>) => {
      if (data.id) {
        const { id, ...updates } = data;
        onResourceUpdate(id, updates);
        toast.success('Resource updated');
      } else {
        onResourceCreate({ ...data, projectId: project.id });
        toast.success('Resource created');
      }
    },
    [onResourceCreate, onResourceUpdate, project.id],
  );

  const TABS: { id: TabId; label: string; count?: number }[] = [
    { id: 'tasks', label: 'Tasks', count: tasks.length },
    { id: 'resources', label: 'Resources', count: projectResources.length || undefined },
    { id: 'details', label: 'Details' },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-border px-6 pt-6 pb-0">
        <div className="flex items-start gap-3 mb-4">
          <div className="mt-0.5">
            <IconPicker
              value={project.metadata?.icon}
              color={project.metadata?.color}
              onChange={handleIconChange}
            />
          </div>

          <div className="min-w-0 flex-1">
            {/* Editable project name */}
            <input
              ref={nameRef}
              defaultValue={project.name}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== project.name) onProjectUpdate(project.id, { name: v });
                else e.target.value = project.name;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur();
              }}
              className="w-full bg-transparent text-xl font-semibold text-foreground outline-none placeholder:text-muted-foreground/40 hover:text-foreground focus:text-foreground"
              placeholder="Project name"
            />

            {/* Editable description */}
            <textarea
              defaultValue={project.description || ''}
              onBlur={(e) => {
                const v = e.target.value;
                if (v !== (project.description || '')) onProjectUpdate(project.id, { description: v });
              }}
              rows={1}
              placeholder="Add a description…"
              className="mt-0.5 w-full resize-none bg-transparent text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/30 hover:text-foreground/70 focus:text-foreground leading-relaxed"
              onInput={(e) => {
                const el = e.target as HTMLTextAreaElement;
                el.style.height = 'auto';
                el.style.height = `${el.scrollHeight}px`;
              }}
            />

            {/* Timeline */}
            {(project.metadata?.start_date || project.metadata?.end_date) && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarRange className="h-3 w-3 shrink-0" />
                <span>
                  {formatDate(project.metadata.start_date) ?? '—'}
                  {' → '}
                  {formatDate(project.metadata.end_date) ?? '—'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div className="flex items-center gap-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex items-center gap-1.5 px-1 pb-3 pt-0.5 mr-5 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={cn(
                  'text-xs tabular-nums',
                  activeTab === tab.id ? 'text-muted-foreground' : 'text-muted-foreground/50',
                )}>
                  {tab.count}
                </span>
              )}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="project-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        {/* Tasks tab */}
        {activeTab === 'tasks' && (
          <TaskBoard
            tasks={tasks}
            projects={projects}
            statuses={statuses}
            onTaskCreate={onTaskCreate}
            onTaskUpdate={onTaskUpdate}
            onTaskDelete={onTaskDelete}
            onTaskClick={onTaskClick}
            onStatusesChange={onStatusesChange}
            projectFilter={project.name}
            defaultView="list"
          />
        )}

        {/* Resources tab */}
        {activeTab === 'resources' && (
          <ScrollArea className="h-full">
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {projectResources.length === 0
                    ? 'No resources yet'
                    : `${projectResources.length} resource${projectResources.length === 1 ? '' : 's'}`}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => { setEditingResource(undefined); setDrawerOpen(true); }}
                >
                  <Plus className="h-3 w-3" />
                  Add Resource
                </Button>
              </div>

              {projectResources.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                  <Paperclip className="h-8 w-8 opacity-30" />
                  <p className="text-sm">Attach notes, links, and docs to this project</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setEditingResource(undefined); setDrawerOpen(true); }}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add first resource
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {projectResources.map((resource) => (
                      <motion.div
                        key={resource.id}
                        layout
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.12 }}
                      >
                        <ResourceItem
                          resource={resource}
                          variant="card"
                          onEdit={handleResourceEdit}
                          onDelete={(id) => { onResourceDelete(id); toast.success('Deleted'); }}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Details tab */}
        {activeTab === 'details' && (
          <ScrollArea className="h-full">
            <div className="mx-auto max-w-xl space-y-8 p-6">

              {/* Description */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Description
                </label>
                <Textarea
                  defaultValue={project.description || ''}
                  onBlur={(e) => {
                    const v = e.target.value;
                    if (v !== (project.description || ''))
                      onProjectUpdate(project.id, { description: v });
                  }}
                  placeholder="What is this project about?"
                  className="min-h-[100px] resize-none text-sm"
                />
              </div>

              {/* Timeline */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <CalendarRange className="h-3.5 w-3.5" />
                  Timeline
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="mb-1 text-xs text-muted-foreground">Start</p>
                    <input
                      type="date"
                      value={project.metadata?.start_date || ''}
                      onChange={(e) =>
                        onProjectUpdate(project.id, {
                          metadata: { ...project.metadata, start_date: e.target.value || undefined },
                        })
                      }
                      className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <span className="mt-5 text-muted-foreground">→</span>
                  <div className="flex-1">
                    <p className="mb-1 text-xs text-muted-foreground">End</p>
                    <input
                      type="date"
                      value={project.metadata?.end_date || ''}
                      onChange={(e) =>
                        onProjectUpdate(project.id, {
                          metadata: { ...project.metadata, end_date: e.target.value || undefined },
                        })
                      }
                      className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>

              {/* Blockers */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Blockers
                  {activeBlockers > 0 && (
                    <span className="ml-1 rounded-full bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                      {activeBlockers}
                    </span>
                  )}
                </label>
                <ChecklistSection
                  items={blockers}
                  onToggle={(id) =>
                    updateBlockers(blockers.map((b) => b.id === id ? { ...b, completed: !b.completed } : b))
                  }
                  onDelete={(id) => updateBlockers(blockers.filter((b) => b.id !== id))}
                  onAdd={(title) =>
                    updateBlockers([...blockers, { id: crypto.randomUUID(), title, completed: false }])
                  }
                  placeholder="Add blocker… press Enter"
                  emptyMessage="No blockers — looking good!"
                />
              </div>
            </div>
          </ScrollArea>
        )}
      </div>

      <DocumentResourceDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        resource={editingResource}
        projects={projects}
        onSave={handleResourceSave}
      />
    </div>
  );
}
