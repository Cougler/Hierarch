'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/app/lib/utils';
import { Button } from '@/app/components/ui/button';
import { motion } from 'motion/react';
import {
  CalendarRange, Settings2, Plus,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { Task, Project, StatusConfig } from '@/app/types';
import { IconPicker, getIconComponent } from '@/app/components/IconPicker';
import { TaskBoard } from '@/app/components/TaskBoard';
import { ProjectDetailsDrawer } from '@/app/components/ProjectDetailsDrawer';

interface ProjectDetailsProps {
  project: Project;
  tasks: Task[];
  projects: Project[];
  statuses: StatusConfig[];
  onProjectUpdate: (id: string, updates: Partial<Project>) => void;
  onTaskCreate: (task: Partial<Task>) => void;
  onNewTask?: () => void;
  onTaskUpdate: (id: string, updates: Partial<Task>) => void;
  onTaskDelete: (id: string) => void;
  onTaskClick: (task: Task) => void;
  onStatusesChange: (statuses: StatusConfig[]) => void;
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
  onProjectUpdate,
  onTaskCreate,
  onNewTask,
  onTaskUpdate,
  onTaskDelete,
  onTaskClick,
  onStatusesChange,
  onCreateNote,
}: ProjectDetailsProps) {
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const autoOpenedRef = useRef(false);

  // Auto-open details dialog for empty projects (no tasks, no description, no phase)
  useEffect(() => {
    if (autoOpenedRef.current) return;
    const hasDetails = project.description || project.metadata?.phase || project.metadata?.start_date || project.metadata?.end_date;
    if (tasks.length === 0 && !hasDetails) {
      autoOpenedRef.current = true;
      setDetailsDrawerOpen(true);
    }
  }, [project.id]);

  const ProjectIcon = getIconComponent(project.metadata?.icon);

  const handleIconChange = useCallback(
    (icon: string, color: string) => {
      onProjectUpdate(project.id, { metadata: { ...project.metadata, icon, color } });
    },
    [project, onProjectUpdate],
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-border px-6 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div>
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


          </div>

          {/* Edit details + add task buttons, date range stacked on the right */}
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={() => setDetailsDrawerOpen(true)}
              >
                <Settings2 className="h-3 w-3" />
                Details
              </Button>
            </div>
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
      </div>

      {/* ── Tasks ────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
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
      </div>

      <ProjectDetailsDrawer
        open={detailsDrawerOpen}
        onOpenChange={setDetailsDrawerOpen}
        project={project}
        onProjectUpdate={onProjectUpdate}
      />
    </div>
  );
}
