'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { cn } from '@/app/lib/utils';
import { Button } from '@/app/components/ui/button';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { AnimatePresence, motion } from 'motion/react';
import {
  Plus, CalendarRange, Paperclip, Settings2,
  FileText, Link2, Users, Search as SearchIcon,
  MoreHorizontal, Pencil, Trash2, ExternalLink, Pin,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/app/components/ui/dropdown-menu';
import { Checkbox } from '@/app/components/ui/checkbox';
import type { Task, Project, StatusConfig, Resource, ResourceType } from '@/app/types';
import { IconPicker, getIconComponent } from '@/app/components/IconPicker';
import { TaskBoard } from '@/app/components/TaskBoard';
import { ResourceItem } from '@/app/components/ResourceItem';
import { DocumentResourceDrawer } from '@/app/components/DocumentResourceDrawer';
import { ProjectDetailsDrawer } from '@/app/components/ProjectDetailsDrawer';

const RES_TYPE_ICONS: Record<ResourceType, React.ElementType> = {
  'Project Note': FileText,
  Link: Link2,
  Research: SearchIcon,
  'Meeting Note': Users,
};

const RES_TYPE_COLORS: Record<ResourceType, string> = {
  'Project Note': 'text-blue-400',
  Link: 'text-emerald-400',
  Research: 'text-amber-400',
  'Meeting Note': 'text-violet-400',
};

type TabId = 'tasks' | 'resources';

interface ProjectDetailsProps {
  project: Project;
  tasks: Task[];
  projects: Project[];
  statuses: StatusConfig[];
  resources: Resource[];
  onProjectUpdate: (id: string, updates: Partial<Project>) => void;
  onTaskCreate: (task: Partial<Task>) => void;
  onNewTask?: () => void;
  onTaskUpdate: (id: string, updates: Partial<Task>) => void;
  onTaskDelete: (id: string) => void;
  onTaskClick: (task: Task) => void;
  onStatusesChange: (statuses: StatusConfig[]) => void;
  onResourceCreate: (resource: Partial<Resource>) => void;
  onResourceUpdate: (id: string, updates: Partial<Resource>) => void;
  onResourceDelete: (id: string) => void;
  onCreateNote?: (task: Task) => void;
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
  onNewTask,
  onTaskUpdate,
  onTaskDelete,
  onTaskClick,
  onStatusesChange,
  onResourceCreate,
  onResourceUpdate,
  onResourceDelete,
  onCreateNote,
}: ProjectDetailsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('tasks');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | undefined>();
  const nameRef = useRef<HTMLInputElement>(null);

  const ProjectIcon = getIconComponent(project.metadata?.icon);

  const projectResources = useMemo(
    () => resources.filter((r) => r.projectId === project.id || r.projectId === project.name),
    [resources, project.id, project.name],
  );

  const handleIconChange = useCallback(
    (icon: string, color: string) => {
      onProjectUpdate(project.id, { metadata: { ...project.metadata, icon, color } });
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

          </div>

          {/* Edit details button + date range stacked on the right */}
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => setDetailsDrawerOpen(true)}
            >
              <Settings2 className="h-3 w-3" />
              Edit details
            </Button>
            {(project.metadata?.start_date || project.metadata?.end_date) && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
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
            onNewTask={onNewTask}
            onTaskUpdate={onTaskUpdate}
            onTaskDelete={onTaskDelete}
            onTaskClick={onTaskClick}
            onStatusesChange={onStatusesChange}
            onCreateNote={onCreateNote}
            projectFilter={project.name}
            defaultView="list"
          />
        )}

        {/* Resources tab */}
        {activeTab === 'resources' && (
          <div className="flex flex-col h-full">
            {/* Resource header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-border/30">
              <p className="text-xs text-muted-foreground">
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
              <ScrollArea className="flex-1">
                <div className="min-w-[500px]">
                  {/* Column header */}
                  <div
                    style={{ gridTemplateColumns: '1fr 120px 120px 40px' }}
                    className="grid items-center border-b border-border/40 bg-muted/30 py-1.5 text-xs font-medium text-muted-foreground select-none"
                  >
                    <div className="px-6">Title</div>
                    <div className="px-2">Type</div>
                    <div className="px-2">Date</div>
                    <div />
                  </div>

                  {/* Rows */}
                  {projectResources.map((resource) => {
                    const TypeIcon = RES_TYPE_ICONS[resource.type] || FileText;
                    const typeColor = RES_TYPE_COLORS[resource.type] || 'text-muted-foreground';

                    return (
                      <div
                        key={resource.id}
                        style={{ gridTemplateColumns: '1fr 120px 120px 40px' }}
                        className="grid items-center border-b border-border/30 py-2 text-sm transition-colors hover:bg-accent/30"
                      >
                        {/* Title */}
                        <button
                          className="flex items-center gap-2 px-6 text-left min-w-0"
                          onClick={() => handleResourceEdit(resource)}
                        >
                          {resource.pinned && (
                            <Pin className="h-3 w-3 text-primary/50 shrink-0" />
                          )}
                          <span className="text-xs font-medium text-foreground truncate">
                            {resource.title || 'Untitled'}
                          </span>
                          {resource.url && (
                            <ExternalLink className="h-3 w-3 text-muted-foreground/30 shrink-0" />
                          )}
                        </button>

                        {/* Type */}
                        <div className="flex items-center gap-1.5 px-2">
                          <TypeIcon className={cn('h-3 w-3 shrink-0', typeColor)} />
                          <span className="text-[11px] text-muted-foreground truncate">
                            {resource.type}
                          </span>
                        </div>

                        {/* Date */}
                        <div className="px-2">
                          <span className="text-[11px] text-muted-foreground/50">
                            {format(new Date(resource.createdAt), 'MMM d, yyyy')}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 rounded text-muted-foreground/30 hover:text-muted-foreground transition-colors">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36">
                              <DropdownMenuItem onClick={() => handleResourceEdit(resource)}>
                                <Pencil className="mr-2 h-3.5 w-3.5" />
                                Edit
                              </DropdownMenuItem>
                              {resource.url && (
                                <DropdownMenuItem
                                  onClick={() => window.open(resource.url, '_blank')}
                                >
                                  <ExternalLink className="mr-2 h-3.5 w-3.5" />
                                  Open Link
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => { onResourceDelete(resource.id); toast.success('Deleted'); }}
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

      </div>

      <DocumentResourceDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        resource={editingResource}
        projects={projects}
        onSave={handleResourceSave}
      />

      <ProjectDetailsDrawer
        open={detailsDrawerOpen}
        onOpenChange={setDetailsDrawerOpen}
        project={project}
        onProjectUpdate={onProjectUpdate}
      />
    </div>
  );
}
