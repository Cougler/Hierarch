'use client';

import { useCallback } from 'react';
import { cn } from '@/app/lib/utils';
import { Badge } from '@/app/components/ui/badge';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Calendar } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format, isToday, isPast, parseISO } from 'date-fns';
import type { Task, StatusConfig, Project } from '@/app/types';
import { TaskContextMenu } from '@/app/components/TaskContextMenu';

interface TaskCardProps {
  task: Task;
  projects: Project[];
  statuses: StatusConfig[];
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onClick: (task: Task) => void;
}

export function TaskCard({ task, projects, statuses, onUpdate, onDelete, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const statusConfig = statuses.find(s => s.id === task.status);
  const isDone = statusConfig?.isDone ?? false;
  const doneStatus = statuses.find(s => s.isDone);
  const firstStatus = statuses[0];

  const project = task.project ? projects.find(p => p.id === task.project) : undefined;
  const projectColor = project?.metadata?.color;

  const parsed = task.dueDate ? parseISO(task.dueDate) : undefined;
  const overdue = parsed && isPast(parsed) && !isToday(parsed);
  const today = parsed && isToday(parsed);

  const handleToggle = useCallback(() => {
    if (isDone && firstStatus) {
      onUpdate(task.id, { status: firstStatus.id });
    } else if (doneStatus) {
      onUpdate(task.id, { status: doneStatus.id });
    }
  }, [isDone, doneStatus, firstStatus, task.id, onUpdate]);

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
    >
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={() => onClick(task)}
        className={cn(
          'group cursor-pointer rounded-lg border bg-card p-3 shadow-sm transition-all',
          'hover:shadow-md hover:border-border/80',
          isDragging && 'opacity-50 shadow-lg rotate-2',
          isDone && 'opacity-60'
        )}
      >
        <div className="flex items-start gap-2.5">
          <Checkbox
            checked={isDone}
            onCheckedChange={handleToggle}
            onClick={(e) => e.stopPropagation()}
            className="mt-0.5 shrink-0"
          />
          <div className="min-w-0 flex-1 space-y-2">
            <p className={cn(
              'text-sm font-medium leading-snug',
              isDone && 'line-through text-muted-foreground'
            )}>
              {task.title}
            </p>

            <div className="flex flex-wrap items-center gap-1.5">
              {project && (
                <Badge
                  variant="secondary"
                  className="max-w-[120px] truncate text-[10px] font-medium"
                  style={projectColor
                    ? { backgroundColor: `${projectColor}20`, color: projectColor, borderColor: `${projectColor}40` }
                    : undefined
                  }
                >
                  {project.metadata?.icon && <span className="mr-0.5">{project.metadata.icon}</span>}
                  {project.name}
                </Badge>
              )}

              {parsed && (
                <span className={cn(
                  'inline-flex items-center gap-1 text-[10px] font-medium',
                  overdue && 'text-red-500',
                  today && 'text-amber-500',
                  !overdue && !today && 'text-muted-foreground'
                )}>
                  <Calendar className="h-2.5 w-2.5" />
                  {format(parsed, 'MMM d')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </TaskContextMenu>
  );
}
