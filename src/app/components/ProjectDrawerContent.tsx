'use client';

import { useMemo } from 'react';
import { cn } from '@/app/lib/utils';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Folder } from 'lucide-react';
import { format, isToday, isBefore, startOfDay, subDays, formatDistanceToNow } from 'date-fns';
import type { Task, StatusConfig, Project } from '@/app/types';
import type { Artifact } from '@/app/components/NoteDrawer';
import { getIconComponent } from '@/app/components/IconPicker';
import { ARTIFACT_TYPE_ICONS, ARTIFACT_TYPE_COLORS } from '@/app/components/ArtifactsView';

interface ProjectDrawerContentProps {
  project: Project;
  tasks: Task[];
  statuses: StatusConfig[];
  artifacts: Artifact[];
  onTaskClick: (task: Task) => void;
  onArtifactClick: (artifact: Artifact) => void;
  onArtifactCreate: (projectId: string) => void;
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
  onViewChange,
  onClose,
}: ProjectDrawerContentProps) {
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
  const projNotes = useMemo(
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
        items.push({ task, reason: 'Waiting for feedback', urgency: 'feedback' });
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

  const IconComp = project.metadata?.icon ? getIconComponent(project.metadata.icon) : Folder;

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-5 pb-5 pt-3 space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-1">
              <IconComp className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              <h2 className="text-lg font-semibold text-foreground truncate">{project.name}</h2>
            </div>
            {project.description && (
              <p className="text-xs text-muted-foreground leading-relaxed mt-2">{project.description}</p>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5">
              <p className="text-lg font-semibold">{projActiveTasks.length}</p>
              <p className="text-[10px] text-muted-foreground">Active</p>
            </div>
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5">
              <p className="text-lg font-semibold text-emerald-400">{projDoneTasks.length}</p>
              <p className="text-[10px] text-muted-foreground">Done</p>
            </div>
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5">
              <p className="text-lg font-semibold">{projNotes.length}</p>
              <p className="text-[10px] text-muted-foreground">Notes</p>
            </div>
          </div>

          {/* Needs attention */}
          {projAttention.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2">Needs Attention</h3>
              <div className="space-y-1">
                {projAttention.map(item => (
                  <button
                    key={item.task.id}
                    onClick={() => onTaskClick(item.task)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors hover:bg-white/[0.04]"
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
              <h3 className="text-xs font-medium text-muted-foreground mb-2">
                Active Tasks
                <span className="ml-1.5 text-muted-foreground/50 tabular-nums">{projActiveTasks.length}</span>
              </h3>
              <div className="space-y-0.5">
                {projActiveTasks.map(task => {
                  const sc = statuses.find(s => s.id === task.status);
                  return (
                    <button
                      key={task.id}
                      onClick={() => onTaskClick(task)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors hover:bg-white/[0.04]"
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

          {/* Design notes */}
          {projNotes.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-medium text-muted-foreground">Design Notes</h3>
                <button
                  onClick={() => { onClose(); onArtifactCreate(project.id); }}
                  className="text-[10px] text-primary hover:text-primary/80 transition-colors"
                >
                  + Add
                </button>
              </div>
              <div className="space-y-1">
                {projNotes.slice(0, 5).map(note => (
                  <button
                    key={note.id}
                    onClick={() => onArtifactClick(note)}
                    className="w-full px-3 py-2 rounded-lg text-left transition-colors hover:bg-white/[0.04]"
                  >
                    <p className="text-xs text-foreground/80 truncate">
                      {note.title || note.text || 'Untitled note'}
                    </p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                      {isToday(new Date(note.updatedAt || note.timestamp))
                        ? format(new Date(note.updatedAt || note.timestamp), 'h:mm a')
                        : format(new Date(note.updatedAt || note.timestamp), 'MMM d')}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer: open full view */}
          <button
            onClick={() => { onClose(); onViewChange(`project:${project.id}`); }}
            className="w-full text-center py-2.5 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            Open full project view →
          </button>
        </div>
      </ScrollArea>
    </div>
  );
}
