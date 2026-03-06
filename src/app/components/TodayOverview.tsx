'use client';

import { useMemo } from 'react';
import { Button } from '@/app/components/ui/button';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { CheckCircle2, Plus, AlertCircle } from 'lucide-react';
import { format, isToday, isBefore, startOfDay } from 'date-fns';
import { AnimatePresence } from 'motion/react';
import type { Task, Project, Resource, StatusConfig } from '@/app/types';
import { TaskRow } from '@/app/components/TaskRow';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface TodayOverviewProps {
  tasks: Task[];
  projects: Project[];
  resources: Resource[];
  statuses: StatusConfig[];
  onTaskCreate: (task: Partial<Task>) => void;
  onTaskUpdate: (id: string, updates: Partial<Task>) => void;
  onTaskDelete: (id: string) => void;
  onTaskClick: (task: Task) => void;
  userName: string;
}

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

export function TodayOverview({
  tasks,
  projects,
  resources,
  statuses,
  onTaskCreate,
  onTaskUpdate,
  onTaskDelete,
  onTaskClick,
  userName,
}: TodayOverviewProps) {
  const today = startOfDay(new Date());
  const firstName = userName.split(' ')[0];
  const sensors = useSensors(useSensor(PointerSensor));

  const doneStatuses = useMemo(
    () => new Set(statuses.filter((s) => s.isDone).map((s) => s.id)),
    [statuses],
  );

  const overdueOnly = useMemo(() => tasks.filter(
    (t) =>
      t.dueDate &&
      isBefore(new Date(t.dueDate), today) &&
      !isToday(new Date(t.dueDate)) &&
      !doneStatuses.has(t.status),
  ), [tasks, today, doneStatuses]);

  const dueTodayOnly = useMemo(() => tasks.filter(
    (t) =>
      t.dueDate &&
      isToday(new Date(t.dueDate)) &&
      !doneStatuses.has(t.status),
  ), [tasks, doneStatuses]);


  const renderTaskRow = (task: Task) => (
    <TaskRow
      key={task.id}
      task={task}
      projects={projects}
      statuses={statuses}
      isSelected={false}
      anySelected={false}
      onSelect={() => {}}
      onUpdate={onTaskUpdate}
      onDelete={onTaskDelete}
      onClick={onTaskClick}
    />
  );

  const isEmpty = overdueOnly.length === 0 && dueTodayOnly.length === 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header bar */}
      <div className="flex shrink-0 items-center border-b border-border/40 px-4 py-3">
        <div className="flex-1">
          <h1 className="text-sm font-semibold">
            Good {getTimeOfDay()}, {firstName}
          </h1>
          <p className="text-xs text-muted-foreground">
            {format(new Date(), 'EEEE, MMMM d')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {overdueOnly.length > 0 && (
            <span className="rounded-md bg-red-500/10 px-2 py-1 text-xs font-medium text-red-500">
              {overdueOnly.length} overdue
            </span>
          )}
          <Button
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => onTaskCreate({ title: 'New Task', dueDate: new Date().toISOString() })}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Column header */}
      {!isEmpty && (
        <div className="grid shrink-0 grid-cols-[40px_1fr_140px_120px] border-b bg-muted/30 py-1.5 text-xs font-medium text-muted-foreground">
          <div />
          <div className="px-2">Task</div>
          <div className="px-2">Project</div>
          <div className="px-2">Due</div>
        </div>
      )}

      {/* Task list */}
      <ScrollArea className="flex-1">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 text-emerald-500/60" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">All caught up</p>
              <p className="mt-1 text-xs text-muted-foreground">Nothing due today.</p>
            </div>
          </div>
        ) : (
          <DndContext sensors={sensors}>
            {overdueOnly.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 border-b bg-muted/20 px-4 py-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-xs font-semibold text-red-500">
                    Overdue · {overdueOnly.length}
                  </span>
                </div>
                <SortableContext items={overdueOnly.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <AnimatePresence initial={false}>
                    {overdueOnly.map((task) => renderTaskRow(task))}
                  </AnimatePresence>
                </SortableContext>
              </>
            )}

            {dueTodayOnly.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 border-b bg-muted/20 px-4 py-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Today · {dueTodayOnly.length}
                  </span>
                </div>
                <SortableContext items={dueTodayOnly.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <AnimatePresence initial={false}>
                    {dueTodayOnly.map((task) => renderTaskRow(task))}
                  </AnimatePresence>
                </SortableContext>
              </>
            )}

            {/* Inline add */}
            <button
              onClick={() => onTaskCreate({ title: 'New Task', dueDate: new Date().toISOString() })}
              className="flex w-full items-center gap-2 border-b border-border/30 px-4 py-2.5 text-xs text-muted-foreground/50 transition-colors hover:bg-accent/30 hover:text-muted-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Add task for today
            </button>
          </DndContext>
        )}
      </ScrollArea>
    </div>
  );
}
