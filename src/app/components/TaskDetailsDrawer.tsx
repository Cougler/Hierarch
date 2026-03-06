'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/app/lib/utils';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { Separator } from '@/app/components/ui/separator';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from '@/app/components/ui/drawer';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/app/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/app/components/ui/dialog';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import {
  Calendar, Clock, Plus, Trash2, X,
} from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format, parseISO, isToday, isPast } from 'date-fns';
import { useIsMobile } from '@/app/hooks/use-mobile';
import type { Task, StatusConfig, Project, Resource, WaitingForItem } from '@/app/types';
import { ResourceItem } from '@/app/components/ResourceItem';
import { ChecklistSection } from '@/app/components/ChecklistSection';

interface TaskDetailsDrawerProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  statuses: StatusConfig[];
  resources: Resource[];
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onResourceCreate: (resource: Partial<Resource>) => void;
}

export function TaskDetailsDrawer({
  task,
  open,
  onOpenChange,
  projects,
  statuses,
  resources,
  onUpdate,
  onDelete,
  onResourceCreate,
}: TaskDetailsDrawerProps) {
  const isMobile = useIsMobile();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const taskResources = resources.filter(r => r.taskId === task?.id);

  const update = useCallback(
    (updates: Partial<Task>) => {
      if (task) onUpdate(task.id, updates);
    },
    [task, onUpdate],
  );

  useEffect(() => {
    if (!open) {
      setConfirmDelete(false);
    }
  }, [open]);

  const toggleWaitingItem = useCallback(
    (itemId: string) => {
      if (!task) return;
      update({
        waitingFor: (task.waitingFor ?? []).map(w =>
          w.id === itemId ? { ...w, completed: !w.completed } : w,
        ),
      });
    },
    [task, update],
  );

  const deleteWaitingItem = useCallback(
    (itemId: string) => {
      if (!task) return;
      update({
        waitingFor: (task.waitingFor ?? []).filter(w => w.id !== itemId),
      });
    },
    [task, update],
  );

  const handleDelete = useCallback(() => {
    if (!task) return;
    onDelete(task.id);
    onOpenChange(false);
  }, [task, onDelete, onOpenChange]);

  const parsed = task?.dueDate ? parseISO(task.dueDate) : undefined;
  const overdue = parsed && isPast(parsed) && !isToday(parsed);
  const today = parsed && isToday(parsed);

  const content = task ? (
    <ScrollArea className="h-full">
      <div className="space-y-5 p-1">
        {/* Title */}
        <Input
          ref={titleRef}
          defaultValue={task.title}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v && v !== task.title) update({ title: v });
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          className="border-0 bg-transparent px-0 text-base font-semibold shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/40"
        />

        {/* Status & Project row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground/70">Status</Label>
            <Select value={task.status} onValueChange={(v) => update({ status: v })}>
              <SelectTrigger className="h-8 border-0 bg-muted/40 shadow-none hover:bg-muted/70 transition-colors">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statuses.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-2">
                      <div className={cn('h-2 w-2 rounded-full', s.color)} />
                      {s.title}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground/70">Project</Label>
            <Select
              value={task.project ?? '__none__'}
              onValueChange={(v) => update({ project: v === '__none__' ? undefined : v })}
            >
              <SelectTrigger className="h-8 border-0 bg-muted/40 shadow-none hover:bg-muted/70 transition-colors">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      {p.metadata?.icon && <span>{p.metadata.icon}</span>}
                      {p.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Due Date */}
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground/70">Due Date</Label>
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  'h-8 w-full justify-start bg-muted/40 px-3 text-left text-sm font-normal hover:bg-muted/70',
                  !task.dueDate && 'text-muted-foreground/50',
                  overdue && 'text-red-500 hover:text-red-500',
                  today && 'text-amber-500 hover:text-amber-500',
                )}
              >
                <Calendar className="mr-2 h-3.5 w-3.5" />
                {parsed ? format(parsed, 'MMMM d, yyyy') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <DayPicker
                mode="single"
                selected={parsed}
                onSelect={(day) => {
                  if (day) update({ dueDate: format(day, 'yyyy-MM-dd') });
                  setDateOpen(false);
                }}
              />
              {task.dueDate && (
                <div className="border-t px-3 pb-3 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-full text-xs text-muted-foreground"
                    onClick={() => { update({ dueDate: '' }); setDateOpen(false); }}
                  >
                    <X className="mr-1 h-3 w-3" /> Clear date
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground/70">Description</Label>
          <Textarea
            defaultValue={task.description}
            onBlur={(e) => {
              if (e.target.value !== task.description) update({ description: e.target.value });
            }}
            placeholder="Add a description…"
            className="min-h-[90px] resize-none border-0 bg-muted/40 shadow-none focus-visible:ring-0 focus-visible:bg-muted/60 transition-colors placeholder:text-muted-foreground/40"
          />
        </div>

        <Separator className="opacity-40" />

        {/* Waiting For */}
        <div className="space-y-3">
          <Label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-sky-500">
            <Clock className="h-3 w-3" />
            Waiting For
          </Label>
          <ChecklistSection
            items={task.waitingFor ?? []}
            onToggle={toggleWaitingItem}
            onDelete={deleteWaitingItem}
            onAdd={(title) => {
              const item: WaitingForItem = {
                id: `wf-${Date.now()}`,
                title,
                completed: false,
              };
              update({ waitingFor: [...(task.waitingFor ?? []), item] });
            }}
            placeholder="Add item… press Enter"
            showCount
          />
        </div>

        <Separator className="opacity-40" />

        {/* Resources */}
        <div className="space-y-3">
          <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Resources
          </Label>

          {taskResources.length === 0 && (
            <p className="text-xs text-muted-foreground/50">No resources linked yet.</p>
          )}

          {taskResources.map(r => (
            <ResourceItem
              key={r.id}
              resource={r}
              variant="inline"
            />
          ))}

          <button
            className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            onClick={() =>
              onResourceCreate({
                type: 'Project Note',
                title: 'New Resource',
                taskId: task.id,
                createdAt: new Date().toISOString(),
              })
            }
          >
            <Plus className="h-3.5 w-3.5" />
            Add resource
          </button>
        </div>

        <Separator className="opacity-40" />

        {/* Delete */}
        <button
          className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-destructive/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete task
        </button>
      </div>
    </ScrollArea>
  ) : null;

  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader>
              <DrawerTitle>{task?.title ?? 'Task Details'}</DrawerTitle>
              <DrawerDescription>Edit task details below.</DrawerDescription>
            </DrawerHeader>
            <div className="overflow-auto px-4 pb-6">{content}</div>
          </DrawerContent>
        </Drawer>

        <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Task</DialogTitle>
              <DialogDescription>
                This will permanently delete &ldquo;{task?.title}&rdquo;. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="task-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35, mass: 0.8 }}
            className="fixed inset-y-0 right-0 z-50 w-[440px] shadow-2xl flex flex-col" style={{ backgroundColor: '#262624' }}
          >
            <span className="sr-only">{task?.title ?? 'Task Details'}</span>
            {/* Close strip */}
            <motion.button
              onClick={() => onOpenChange(false)}
              className="absolute left-0 top-0 z-10 flex h-full w-[60px] -translate-x-full flex-col items-center justify-center gap-3 cursor-pointer opacity-0 transition-opacity duration-200 hover:opacity-100 focus:outline-none"
            >
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-card/25 py-4">
                <span className="text-xs text-muted-foreground tracking-widest [writing-mode:vertical-rl] rotate-180">close</span>
                <X className="h-4 w-4 text-muted-foreground" />
              </div>
            </motion.button>
            <div className="h-full overflow-auto p-2">{content}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              This will permanently delete &ldquo;{task?.title}&rdquo;. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
