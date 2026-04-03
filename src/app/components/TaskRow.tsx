'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/app/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task, StatusConfig, Project } from '@/app/types';
import { TaskContextMenu } from '@/app/components/TaskContextMenu';
import {
  SelectCell,
  TitleCell,
  ProjectCell,
  DueDateCell,
} from '@/app/components/TaskCells';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Trash2, Timer, MessageSquarePlus, Lock } from 'lucide-react';

const TIMER_STORAGE_KEY = 'hierarch-timer-state';

function getTimerDisplay(): { taskLabel: string; elapsed: number; running: boolean } | null {
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw);
    if (!state.running) return null;
    let elapsed = state.elapsed || 0;
    if (state.startedAt) {
      const drift = Math.floor((Date.now() - new Date(state.startedAt).getTime()) / 1000);
      elapsed += drift;
    }
    const remaining = state.mode === 'timer' ? Math.max(0, (state.target || 0) - elapsed) : elapsed;
    return { taskLabel: state.label || '', elapsed: remaining, running: true };
  } catch {
    return null;
  }
}

function formatMiniTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface TaskRowProps {
  task: Task;
  projects: Project[];
  statuses: StatusConfig[];
  isSelected: boolean;
  anySelected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onClick: (task: Task) => void;
  onStartFocus?: (task: Task) => void;
  onCreateNote?: (task: Task) => void;
  focusTaskId?: string | null;
  columnTemplate?: string;
  hideProject?: boolean;
}

export function TaskRow({
  task,
  projects,
  statuses,
  isSelected,
  anySelected,
  onSelect,
  onUpdate,
  onDelete,
  onClick,
  onStartFocus,
  onCreateNote,
  focusTaskId,
  columnTemplate = '40px 1fr 200px 120px 64px',
  hideProject,
}: TaskRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const statusConfig = statuses.find(s => s.id === task.status);
  const isDone = statusConfig?.isDone ?? false;
  const isFocusActive = focusTaskId === task.id;

  // Live timer tick for the mini display
  const [timerDisplay, setTimerDisplay] = useState<string | null>(null);

  useEffect(() => {
    if (!isFocusActive) {
      setTimerDisplay(null);
      return;
    }
    const update = () => {
      const info = getTimerDisplay();
      if (info) {
        setTimerDisplay(formatMiniTime(info.elapsed));
      } else {
        setTimerDisplay(null);
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [isFocusActive]);

  const handleDuplicate = useCallback(() => {
    onUpdate('__duplicate__', {
      ...task,
      id: '',
      title: `${task.title} (copy)`,
    });
  }, [task, onUpdate]);

  return (
    <TaskContextMenu
      onDuplicate={handleDuplicate}
      onDelete={() => onDelete(task.id)}
      onSelect={() => onSelect(task.id)}
    >
      <div
        ref={setNodeRef}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
          gridTemplateColumns: columnTemplate,
        }}
        {...attributes}
        {...listeners}
        onClick={() => onClick(task)}
        className={cn(
          'group grid cursor-pointer items-center',
          'border-b border-border/50 transition-colors',
          'hover:bg-accent/50',
          isSelected && 'bg-accent/30',
          isDragging && 'opacity-50 bg-accent',
          isDone && 'opacity-60'
        )}
      >
        {/* Select */}
        <div onClick={(e) => e.stopPropagation()}>
          <SelectCell checked={isSelected} anySelected={anySelected} onChange={() => onSelect(task.id)} />
        </div>

        {/* Title */}
        <div className="min-w-0 px-2 py-1 flex items-center gap-2">
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="shrink-0 h-4 w-4 flex items-center justify-center focus:outline-none hover:scale-110 transition-transform"
                  aria-label="Change phase"
                >
                  <span className={cn('block h-2 w-2 rounded-full', statusConfig?.color ?? 'bg-slate-500')} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                {statuses.map((s) => (
                  <DropdownMenuItem
                    key={s.id}
                    onClick={() => onUpdate(task.id, { status: s.id })}
                    className="flex items-center gap-2"
                  >
                    <span className={cn('h-2 w-2 rounded-full shrink-0', s.color)} />
                    {s.title}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {(task.blockers ?? []).some(b => !b.resolvedAt) && (
            <Lock className="h-3 w-3 shrink-0 text-destructive/50" />
          )}
          <TitleCell
            title={task.title}
            onChange={(title) => onUpdate(task.id, { title })}
          />
        </div>

        {/* Project */}
        {!hideProject && (
          <div className="min-w-0 overflow-hidden px-2 py-1" onClick={(e) => e.stopPropagation()}>
            <ProjectCell
              project={task.project}
              projects={projects}
              onChange={(id) => onUpdate(task.id, { project: id })}
            />
          </div>
        )}

        {/* Due date */}
        <div className="px-1 py-1" onClick={(e) => e.stopPropagation()}>
          <DueDateCell
            date={task.dueDate}
            onChange={(dueDate) => onUpdate(task.id, { dueDate })}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          {/* Focus timer: mini display when running, icon when not */}
          {isFocusActive && timerDisplay ? (
            <button
              onClick={() => onStartFocus?.(task)}
              className="flex items-center gap-1 h-6 px-1.5 rounded text-primary transition-all"
              title="Return to Focus Timer"
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              <span className="font-mono text-[10px] font-semibold tabular-nums">
                {timerDisplay}
              </span>
            </button>
          ) : onStartFocus ? (
            <button
              onClick={() => onStartFocus(task)}
              className="flex h-6 w-6 items-center justify-center rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:bg-accent hover:text-foreground transition-all focus:opacity-100"
              title="Start Focus Timer"
            >
              <Timer className="h-3.5 w-3.5" />
            </button>
          ) : null}

          {/* Create note */}
          {onCreateNote && (
            <button
              onClick={() => onCreateNote(task)}
              className="flex h-6 w-6 items-center justify-center rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:bg-accent hover:text-foreground transition-all focus:opacity-100"
              title="Add design note"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Delete */}
          <button
            onClick={() => onDelete(task.id)}
            className="flex h-6 w-6 items-center justify-center rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all focus:opacity-100"
            title="Delete task"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </TaskContextMenu>
  );
}
