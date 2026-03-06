'use client';

import { useCallback } from 'react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Plus, Hourglass } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Task, WaitingForItem } from '@/app/types';
import { ChecklistSection } from '@/app/components/ChecklistSection';

interface WaitingForWidgetProps {
  tasks: Task[];
  onTaskUpdate: (id: string, updates: Partial<Task>) => void;
}

export function WaitingForWidget({ tasks, onTaskUpdate }: WaitingForWidgetProps) {
  const tasksWithWaiting = tasks.filter(
    (t) => t.waitingFor && t.waitingFor.some((w) => !w.completed),
  );

  const toggleItem = useCallback(
    (taskId: string, itemId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task?.waitingFor) return;
      onTaskUpdate(taskId, {
        waitingFor: task.waitingFor.map((w) =>
          w.id === itemId ? { ...w, completed: !w.completed } : w,
        ),
      });
    },
    [tasks, onTaskUpdate],
  );

  const deleteItem = useCallback(
    (taskId: string, itemId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task?.waitingFor) return;
      onTaskUpdate(taskId, {
        waitingFor: task.waitingFor.filter((w) => w.id !== itemId),
      });
    },
    [tasks, onTaskUpdate],
  );

  const addItem = useCallback(
    (taskId: string, title: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      const newItem: WaitingForItem = {
        id: crypto.randomUUID(),
        title,
        completed: false,
      };
      onTaskUpdate(taskId, {
        waitingFor: [...(task.waitingFor || []), newItem],
      });
    },
    [tasks, onTaskUpdate],
  );

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Hourglass className="h-3.5 w-3.5" />
          Waiting For
          {tasksWithWaiting.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {tasksWithWaiting.length}
            </Badge>
          )}
        </h3>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {tasksWithWaiting.length === 0 ? (
        <div className="flex items-center justify-center rounded-lg bg-card p-4">
          <p className="text-sm text-muted-foreground">No blockers 🎉</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {tasksWithWaiting.map((task) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-2 rounded-lg bg-card p-3"
              >
                <h4 className="truncate text-sm font-medium">{task.title}</h4>
                <ChecklistSection
                  items={task.waitingFor ?? []}
                  onToggle={(itemId) => toggleItem(task.id, itemId)}
                  onDelete={(itemId) => deleteItem(task.id, itemId)}
                  onAdd={(title) => addItem(task.id, title)}
                  placeholder="Add dependency… press Enter"
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
