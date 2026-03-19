'use client';

import { useMemo, useState, useEffect } from 'react';
import { cn } from '@/app/lib/utils';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { ChevronRight, ChevronDown, Folder, FileText, Plus } from 'lucide-react';
import { format, isToday, isBefore, startOfDay, subDays, formatDistanceToNow } from 'date-fns';
import type { Task, StatusConfig, Project } from '@/app/types';
import { PROJECT_PHASES } from '@/app/types';
import type { Artifact } from '@/app/components/NoteDrawer';
import { getIconComponent } from '@/app/components/IconPicker';
import { ARTIFACT_TYPE_ICONS, ARTIFACT_TYPE_COLORS } from '@/app/components/ArtifactsView';

const PHASE_COLORS: Record<string, { color: string; bg: string }> = {
  research: { color: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-500/10' },
  explore: { color: 'text-violet-700 dark:text-violet-400', bg: 'bg-violet-500/10' },
  design: { color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-500/10' },
  iterate: { color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-500/10' },
  review: { color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-500/10' },
  handoff: { color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
};

interface ProjectDrawerContentProps {
  project: Project;
  tasks: Task[];
  statuses: StatusConfig[];
  artifacts: Artifact[];
  onTaskClick: (task: Task) => void;
  onArtifactClick: (artifact: Artifact) => void;
  onArtifactCreate: (projectId: string, type?: string) => void;
  onProjectUpdate?: (id: string, updates: Partial<Project>) => void;
  onViewChange: (view: string) => void;
  onClose: () => void;
}

export function ProjectDrawerContent({
  project,
  tasks,
  statuses,
  artifacts,
  onTaskClick,
  onArtifactClick,
  onArtifactCreate,
  onProjectUpdate,
  onViewChange,
  onClose,
}: ProjectDrawerContentProps) {
  const [description, setDescription] = useState(project.description ?? '');
  const [phaseOpen, setPhaseOpen] = useState(false);

  useEffect(() => {
    setDescription(project.description ?? '');
  }, [project.id, project.description]);

  const doneStatuses = useMemo(
    () => new Set(statuses.filter(s => s.isDone).map(s => s.id)),
    [statuses],
  );

  const statusMap = new Map(statuses.map(s => [s.id, s]));

  const projTasks = useMemo(
    () => tasks.filter(t => t.project === project.id || t.project === project.name),
    [tasks, project],
  );
  const projActiveTasks = useMemo(
    () => projTasks.filter(t => !doneStatuses.has(t.status)),
    [projTasks, doneStatuses],
  );
  const projDoneTasks = useMemo(
    () => projTasks.filter(t => doneStatuses.has(t.status)),
    [projTasks, doneStatuses],
  );
  const projArtifacts = useMemo(
    () => artifacts.filter(n => n.projectId === project.id),
    [artifacts, project],
  );

  const projAttention = useMemo(() => {
    const items: { task: Task; reason: string; urgency: 'feedback' | 'overdue' | 'stale' }[] = [];
    const today = startOfDay(new Date());
    const staleThreshold = subDays(new Date(), 7);

    for (const task of projActiveTasks) {
      const phase = statusMap.get(task.status);
      if (phase?.isFeedback) {
        items.push({ task, reason: 'Awaiting feedback', urgency: 'feedback' });
        continue;
      }
      if (task.dueDate) {
        const due = new Date(task.dueDate);
        if (isBefore(due, today) && !isToday(due)) {
          items.push({ task, reason: `Overdue since ${format(due, 'MMM d')}`, urgency: 'overdue' });
          continue;
        }
      }
      if (task.phaseHistory?.length) {
        const lastTransition = task.phaseHistory[task.phaseHistory.length - 1]!;
        if (new Date(lastTransition.timestamp) < staleThreshold) {
          const phaseTitle = statuses.find(s => s.id === task.status)?.title ?? task.status;
          items.push({ task, reason: `In ${phaseTitle} for ${formatDistanceToNow(new Date(lastTransition.timestamp))}`, urgency: 'stale' });
        }
      }
    }

    const order = { overdue: 0, feedback: 1, stale: 2 };
    return items.sort((a, b) => order[a.urgency] - order[b.urgency]);
  }, [projActiveTasks, statuses]);

  const currentPhase = PROJECT_PHASES.find(p => p.id === project.metadata?.phase);
  const IconComp = project.metadata?.icon ? getIconComponent(project.metadata.icon) : Folder;

  const handlePhaseChange = (phaseId: string) => {
    onProjectUpdate?.(project.id, { metadata: { ...project.metadata, phase: phaseId } });
    if (phaseId === 'review') {
      onArtifactCreate(project.id, 'feedback');
    }
  };

  const handleDescriptionBlur = () => {
    if (description !== (project.description ?? '')) {
      onProjectUpdate?.(project.id, { description });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-5 pb-5 pt-3 space-y-5">
          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-1">
              <IconComp className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              <input
                defaultValue={project.name}
                key={project.id}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== project.name) onProjectUpdate?.(project.id, { name: v });
                  else e.target.value = project.name;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur();
                }}
                className="flex-1 min-w-0 bg-transparent text-lg font-semibold text-foreground outline-none placeholder:text-muted-foreground/40 truncate"
                placeholder="Project name"
              />
            </div>
          </div>

          {/* Phase picker */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/40">Phase</span>
            <Popover open={phaseOpen} onOpenChange={setPhaseOpen}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-surface hover:bg-surface-hover transition-colors">
                  <span className={cn('h-2 w-2 rounded-full shrink-0', currentPhase?.color ?? 'bg-muted-foreground')} />
                  {currentPhase?.title ?? 'Set phase'}
                  <ChevronDown className="h-2.5 w-2.5 opacity-40" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[240px] p-1.5" sideOffset={4}>
                <div className="grid grid-cols-2 gap-0.5">
                  {PROJECT_PHASES.map(p => {
                    const isActive = project.metadata?.phase === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => { handlePhaseChange(p.id); setPhaseOpen(false); }}
                        className={cn(
                          'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs transition-colors',
                          isActive
                            ? 'bg-accent/50 text-foreground font-medium'
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

          {/* Description (inline editable) */}
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            onBlur={handleDescriptionBlur}
            placeholder="Add a description..."
            rows={2}
            className="w-full bg-transparent text-xs text-muted-foreground leading-relaxed outline-none resize-none placeholder:text-muted-foreground/30"
          />

          {/* Compact stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span><strong className="text-foreground font-medium">{projActiveTasks.length}</strong> active</span>
            <span><strong className="text-emerald-600 dark:text-emerald-400 font-medium">{projDoneTasks.length}</strong> done</span>
            <span><strong className="text-foreground font-medium">{projArtifacts.length}</strong> artifacts</span>
          </div>

          {/* Needs attention */}
          {projAttention.length > 0 && (
            <div>
              <h3 className="text-[11px] font-medium text-muted-foreground/70 mb-2">Needs Attention</h3>
              <div className="space-y-1">
                {projAttention.map(item => (
                  <button
                    key={item.task.id}
                    onClick={() => onTaskClick(item.task)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors hover:bg-surface"
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: item.urgency === 'overdue'
                          ? '#f87171'
                          : item.urgency === 'feedback'
                            ? '#fb923c'
                            : '#64748b',
                      }}
                    />
                    <span className="text-xs text-foreground/80 truncate">{item.task.title}</span>
                    <span className="text-[10px] text-muted-foreground/50 shrink-0 ml-auto">{item.reason}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active tasks */}
          {projActiveTasks.length > 0 && (
            <div>
              <h3 className="text-[11px] font-medium text-muted-foreground/70 mb-2">
                Active Tasks
              </h3>
              <div className="space-y-0.5">
                {projActiveTasks.map(task => {
                  const sc = statuses.find(s => s.id === task.status);
                  return (
                    <button
                      key={task.id}
                      onClick={() => onTaskClick(task)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors hover:bg-surface"
                    >
                      <span className={cn('h-2 w-2 rounded-full shrink-0', sc?.color ?? 'bg-slate-500')} />
                      <span className="text-xs text-foreground truncate">{task.title}</span>
                      {task.dueDate && (
                        <span className="text-[10px] text-muted-foreground/50 shrink-0 ml-auto">
                          {format(new Date(task.dueDate), 'MMM d')}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Artifacts */}
          <div className="space-y-2">
            <h3 className="text-[11px] font-medium text-muted-foreground/70">
              Artifacts
            </h3>
            <div className="overflow-hidden rounded-xl border border-border bg-muted/20">
              {projArtifacts.length > 0 ? (
                projArtifacts.map((note, i) => {
                  const ArtifactIcon = ARTIFACT_TYPE_ICONS[note.type] || FileText;
                  const artifactColor = ARTIFACT_TYPE_COLORS[note.type] || 'text-muted-foreground';
                  return (
                    <button
                      key={note.id}
                      onClick={() => onArtifactClick(note)}
                      className={cn(
                        'flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-surface',
                        i > 0 && 'border-t border-border/50',
                      )}
                    >
                      <ArtifactIcon className={cn('h-3.5 w-3.5 shrink-0', artifactColor)} />
                      <span className="flex-1 text-xs text-foreground/80 truncate">
                        {note.title || 'Untitled artifact'}
                      </span>
                      <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                    </button>
                  );
                })
              ) : null}
              <div className={cn(projArtifacts.length > 0 && 'border-t border-border/50')}>
                <button
                  onClick={() => onArtifactCreate(project.id)}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground/40 transition-colors hover:text-muted-foreground"
                >
                  <Plus className="h-3 w-3" />
                  Add artifact
                </button>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Pinned footer */}
      <div className="shrink-0 border-t border-border px-5 py-3">
        <button
          onClick={() => { onClose(); onViewChange(`project:${project.id}`); }}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          Open full project view
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
