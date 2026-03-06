'use client';

import { useCallback } from 'react';
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
}: TaskRowProps) {
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
        style={style}
        {...attributes}
        {...listeners}
        onClick={() => onClick(task)}
        className={cn(
          'group grid cursor-pointer grid-cols-[40px_1fr_140px_120px] items-center',
          'border-b border-border/50 transition-colors',
          'hover:bg-accent/50',
          isSelected && 'bg-accent/30',
          isDragging && 'opacity-50 bg-accent',
          isDone && 'opacity-60'
        )}
      >
        <div onClick={(e) => e.stopPropagation()}>
          <SelectCell checked={isSelected} anySelected={anySelected} onChange={() => onSelect(task.id)} />
        </div>

        <div className="min-w-0 px-2 py-2 flex items-center gap-2">
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="shrink-0 h-2.5 w-2.5 rounded-full focus:outline-none hover:scale-125 transition-transform" style={{ backgroundColor: undefined }} aria-label="Change status">
                  <span className={cn('block h-2.5 w-2.5 rounded-full', statusConfig?.color ?? 'bg-slate-500')} />
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
          <TitleCell
            title={task.title}
            onChange={(title) => onUpdate(task.id, { title })}
          />
        </div>

        <div className="px-2 py-2">
          <ProjectCell project={task.project} projects={projects} />
        </div>

        <div className="px-1 py-2" onClick={(e) => e.stopPropagation()}>
          <DueDateCell
            date={task.dueDate}
            onChange={(dueDate) => onUpdate(task.id, { dueDate })}
          />
        </div>
      </div>
    </TaskContextMenu>
  );
}
