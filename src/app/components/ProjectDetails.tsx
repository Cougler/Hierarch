'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/app/lib/utils';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { Calendar } from '@/app/components/ui/calendar';
import { motion } from 'motion/react';
import {
  CalendarRange, Settings2, Plus, Trash2, Calendar as CalendarIcon, ChevronDown,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { Task, Project, StatusConfig } from '@/app/types';
import { PROJECT_PHASES } from '@/app/types';
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
  onProjectDelete?: (id: string) => void;
  onViewChange?: (view: string) => void;
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
  onProjectDelete,
  onViewChange,
}: ProjectDetailsProps) {
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const hasDetails = project.description || project.metadata?.phase || project.metadata?.start_date || project.metadata?.end_date;
  const [setupComplete, setSetupComplete] = useState(false);
  const isNewProject = !setupComplete && tasks.length === 0 && !hasDetails && project.name === 'Untitled Project';

  // Auto-focus project name for new projects
  useEffect(() => {
    if (isNewProject) {
      setTimeout(() => {
        nameRef.current?.focus();
        nameRef.current?.select();
      }, 100);
    }
  }, [project.id]);

  const ProjectIcon = getIconComponent(project.metadata?.icon);

  const handleIconChange = useCallback(
    (icon: string, color: string) => {
      onProjectUpdate(project.id, { metadata: { ...project.metadata, icon, color } });
    },
    [project, onProjectUpdate],
  );

  if (isNewProject) {
    return <NewProjectForm project={project} onProjectUpdate={onProjectUpdate} onProjectDelete={onProjectDelete} onViewChange={onViewChange} nameRef={nameRef} handleIconChange={handleIconChange} onSetupComplete={() => setSetupComplete(true)} />;
  }

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
              {onProjectDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground/40 hover:text-destructive"
                  onClick={() => onProjectDelete(project.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
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

// ─── Inline New Project Form ────────────────────────────────────────────────

const PHASE_COLORS: Record<string, { color: string; bg: string }> = {
  research: { color: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-500/10' },
  explore: { color: 'text-violet-700 dark:text-violet-400', bg: 'bg-violet-500/10' },
  design: { color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-500/10' },
  iterate: { color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-500/10' },
  review: { color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-500/10' },
  handoff: { color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
};

function NewProjectForm({
  project,
  onProjectUpdate,
  onProjectDelete,
  onViewChange,
  nameRef,
  handleIconChange,
  onSetupComplete,
}: {
  project: Project;
  onProjectUpdate: (id: string, updates: Partial<Project>) => void;
  onProjectDelete?: (id: string) => void;
  onViewChange?: (view: string) => void;
  nameRef: React.RefObject<HTMLInputElement> | React.RefObject<HTMLInputElement | null>;
  handleIconChange: (icon: string, color: string) => void;
  onSetupComplete: () => void;
}) {
  const [description, setDescription] = useState(project.description ?? '');
  const [phase, setPhase] = useState(project.metadata?.phase ?? '');
  const [phaseOpen, setPhaseOpen] = useState(false);
  const [startDate, setStartDate] = useState(project.metadata?.start_date ?? '');
  const [endDate, setEndDate] = useState(project.metadata?.end_date ?? '');
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const handleCreate = useCallback(() => {
    const currentName = (nameRef as React.RefObject<HTMLInputElement>).current?.value?.trim();
    const updates: Partial<Project> = {};
    if (currentName && currentName !== project.name) updates.name = currentName;
    if (description) updates.description = description;
    const meta: Record<string, any> = { ...project.metadata };
    if (phase) meta.phase = phase;
    if (startDate) meta.start_date = startDate;
    if (endDate) meta.end_date = endDate;
    updates.metadata = meta;
    onProjectUpdate(project.id, updates);
    onSetupComplete();
    onViewChange?.(`project:${project.id}`);
  }, [project, description, phase, startDate, endDate, nameRef, onProjectUpdate, onSetupComplete, onViewChange]);

  const currentPhase = PROJECT_PHASES.find(p => p.id === phase);
  const phaseStyle = currentPhase
    ? (PHASE_COLORS[currentPhase.id] ?? { color: 'text-muted-foreground', bg: 'bg-muted/20' })
    : { color: 'text-muted-foreground', bg: 'bg-muted/20' };
  const parsedStart = startDate ? new Date(startDate + 'T12:00:00') : undefined;
  const parsedEnd = endDate ? new Date(endDate + 'T12:00:00') : undefined;

  return (
    <div className="flex h-full flex-col overflow-auto">
      <div className="flex-1 flex flex-col items-center pt-16 px-6">
        <div className="w-full max-w-[480px] space-y-6">
          {/* Icon + Name */}
          <div className="flex items-center gap-3">
            <IconPicker
              value={project.metadata?.icon}
              color={project.metadata?.color}
              onChange={handleIconChange}
            />
            <input
              ref={nameRef as React.RefObject<HTMLInputElement>}
              defaultValue={project.name}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
              className="w-full bg-transparent text-2xl font-semibold text-foreground outline-none placeholder:text-muted-foreground/30"
              placeholder="Project name"
            />
          </div>

          {/* Phase */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/40">Phase</span>
            <Popover open={phaseOpen} onOpenChange={setPhaseOpen}>
              <PopoverTrigger asChild>
                <button className={cn(
                  'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                  phaseStyle.bg, phaseStyle.color,
                  'hover:brightness-110',
                )}>
                  <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', currentPhase?.color ?? 'bg-muted-foreground')} />
                  {currentPhase?.title ?? 'Set phase'}
                  <ChevronDown className="h-2.5 w-2.5 opacity-60" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[240px] p-1.5" sideOffset={4}>
                <div className="grid grid-cols-2 gap-0.5">
                  {PROJECT_PHASES.map(p => {
                    const isActive = phase === p.id;
                    const colors = PHASE_COLORS[p.id];
                    return (
                      <button
                        key={p.id}
                        onClick={() => { setPhase(p.id); setPhaseOpen(false); }}
                        className={cn(
                          'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs transition-colors',
                          isActive
                            ? cn(colors?.bg, colors?.color, 'font-medium')
                            : 'text-muted-foreground hover:bg-surface hover:text-foreground',
                        )}
                      >
                        <span className={cn('h-2 w-2 rounded-full shrink-0', p.color)} />
                        {p.title}
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Description */}
          <div>
            <label className="mb-2 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground/40">
              Description
            </label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What is this project about?"
              className="min-h-[100px] resize-none bg-surface border-border text-sm placeholder:text-muted-foreground/30 focus-visible:ring-ring/30"
            />
          </div>

          {/* Timeline */}
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/40">
              <CalendarIcon className="h-3 w-3" />
              Timeline
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="mb-1 text-xs text-muted-foreground/60">Start</p>
                <Popover open={startOpen} onOpenChange={setStartOpen}>
                  <PopoverTrigger asChild>
                    <button className={cn(
                      'flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                      'border-border bg-surface hover:bg-surface',
                      startDate ? 'text-foreground' : 'text-muted-foreground/30',
                    )}>
                      {parsedStart ? format(parsedStart, 'MMM d, yyyy') : 'Start date'}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={parsedStart}
                      onSelect={(day) => {
                        setStartDate(day ? format(day, 'yyyy-MM-dd') : '');
                        setStartOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <span className="mt-5 text-muted-foreground/40 text-sm">&rarr;</span>
              <div className="flex-1">
                <p className="mb-1 text-xs text-muted-foreground/60">End</p>
                <Popover open={endOpen} onOpenChange={setEndOpen}>
                  <PopoverTrigger asChild>
                    <button className={cn(
                      'flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                      'border-border bg-surface hover:bg-surface',
                      endDate ? 'text-foreground' : 'text-muted-foreground/30',
                    )}>
                      {parsedEnd ? format(parsedEnd, 'MMM d, yyyy') : 'End date'}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={parsedEnd}
                      onSelect={(day) => {
                        setEndDate(day ? format(day, 'yyyy-MM-dd') : '');
                        setEndOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              onClick={handleCreate}
            >
              <Plus className="h-3.5 w-3.5" />
              Create Project
            </Button>
            {onProjectDelete && (
              <button
                onClick={() => onProjectDelete(project.id)}
                className="text-xs text-muted-foreground/40 hover:text-destructive transition-colors"
              >
                Delete project
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
