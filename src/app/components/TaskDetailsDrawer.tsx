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
  Calendar as CalendarIcon, Check, ChevronRight, Clock, ExternalLink, Folder, Plus, Trash2, X,
} from 'lucide-react';
import { Calendar } from '@/app/components/ui/calendar';
import { format, parseISO, isToday, isPast } from 'date-fns';
import { useIsMobile } from '@/app/hooks/use-mobile';
import type { Task, StatusConfig, Project, Resource, WaitingForItem } from '@/app/types';
import { RESOURCE_TYPE_ICONS, RESOURCE_TYPE_COLORS } from '@/app/components/ResourceItem';
import { getIconComponent } from '@/app/components/IconPicker';
import { PhaseJourney } from '@/app/components/PhaseJourney';

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
  const [waitingInputVisible, setWaitingInputVisible] = useState(false);
  const [newWaitingText, setNewWaitingText] = useState('');
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
      setWaitingInputVisible(false);
      setNewWaitingText('');
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
  const hasTime = !!(task?.dueDate && task.dueDate.includes('T'));
  const timeValue = hasTime && parsed ? format(parsed, 'HH:mm') : '';
  const overdue = parsed && isPast(parsed) && !isToday(parsed);
  const today = parsed && isToday(parsed);

  const taskProject = task ? projects.find(p => p.id === task.project || p.name === task.project) : undefined;

  const content = task ? (
    <ScrollArea key={task.id} className="h-full">
      <div className="space-y-5 p-1">
        {/* Project breadcrumb */}
        {taskProject && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
            {(() => {
              const IconComp = taskProject.metadata?.icon ? getIconComponent(taskProject.metadata.icon) : Folder;
              return <IconComp className="h-3 w-3 shrink-0" />;
            })()}
            <span className="truncate">{taskProject.name}</span>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <span className="text-muted-foreground/40 truncate">Task</span>
          </div>
        )}

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

        {/* Phase row */}
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground/70">Phase</Label>
          <div className="flex flex-wrap gap-1.5">
            {statuses.map(s => {
              const norm = (v: string) => v.toLowerCase().replace(/[\s-]+/g, '');
              const isSelected = norm(task.status ?? '') === norm(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => update({ status: s.id })}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors border',
                    isSelected
                      ? 'border-white/20 bg-white/[0.08] text-foreground'
                      : 'border-white/[0.06] bg-transparent text-muted-foreground hover:text-foreground hover:border-white/10',
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', s.color)} />
                  {s.title}
                </button>
              );
            })}
          </div>
        </div>

        {/* Project row */}
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
                    {p.metadata?.icon && (() => { const I = getIconComponent(p.metadata!.icon); return <I className="h-3.5 w-3.5 shrink-0" />; })()}
                    {p.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Due Date & Time */}
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground/70">Due Date</Label>
          <div className="flex gap-2">
            {/* Date picker */}
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    'h-8 flex-1 justify-start bg-muted/40 px-3 text-left text-sm font-normal hover:bg-muted/70',
                    !task.dueDate && 'text-muted-foreground/50',
                    overdue && 'text-red-500 hover:text-red-500',
                    today && 'text-amber-500 hover:text-amber-500',
                  )}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {parsed ? format(parsed, 'MMM d, yyyy') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={parsed}
                  onSelect={(day) => {
                    if (day) {
                      const datePart = format(day, 'yyyy-MM-dd');
                      update({ dueDate: timeValue ? `${datePart}T${timeValue}` : datePart });
                    }
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

            {/* Time picker */}
            {task.dueDate && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      'h-8 w-[120px] justify-start bg-muted/40 px-3 text-left text-sm font-normal hover:bg-muted/70',
                      !timeValue && 'text-muted-foreground/50',
                      overdue && 'text-red-500 hover:text-red-500',
                      today && 'text-amber-500 hover:text-amber-500',
                    )}
                  >
                    <Clock className="mr-2 h-3.5 w-3.5" />
                    {timeValue ? format(parsed!, 'h:mm a') : 'Time'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-3" align="start">
                  <div className="space-y-3">
                    <Label className="text-[11px] text-muted-foreground/70">Set time</Label>
                    <input
                      type="time"
                      value={timeValue}
                      onChange={(e) => {
                        if (!parsed) return;
                        const datePart = format(parsed, 'yyyy-MM-dd');
                        update({ dueDate: e.target.value ? `${datePart}T${e.target.value}` : datePart });
                      }}
                      className="w-full h-8 rounded-md border border-border bg-muted/40 px-3 text-sm text-foreground outline-none [color-scheme:dark] focus:border-primary/50 transition-colors"
                    />
                    {timeValue && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-full text-xs text-muted-foreground"
                        onClick={() => {
                          if (!parsed) return;
                          update({ dueDate: format(parsed, 'yyyy-MM-dd') });
                        }}
                      >
                        <X className="mr-1 h-3 w-3" /> Clear time
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
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

        {/* Waiting For */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] text-muted-foreground/70">Waiting For</Label>
            {(task.waitingFor ?? []).length > 0 && (
              <span className="text-[10px] text-muted-foreground/40">
                {(task.waitingFor ?? []).filter(w => w.completed).length}/{(task.waitingFor ?? []).length} done
              </span>
            )}
          </div>
          <div className="overflow-hidden rounded-xl border border-white/[0.05] bg-muted/20">
            <AnimatePresence initial={false}>
              {(task.waitingFor ?? []).map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  transition={{ duration: 0.12 }}
                >
                  <div className={cn(
                    'group flex items-center gap-2.5 px-3 py-2.5',
                    i > 0 && 'border-t border-white/[0.04]',
                  )}>
                    <button
                      onClick={() => toggleWaitingItem(item.id)}
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all',
                        item.completed
                          ? 'border-primary/50 bg-primary/20 text-primary'
                          : 'border-white/20 text-transparent hover:border-white/40',
                      )}
                    >
                      <Check className="h-2.5 w-2.5" />
                    </button>
                    <span className={cn(
                      'flex-1 text-xs leading-relaxed',
                      item.completed ? 'text-muted-foreground/40 line-through' : 'text-foreground/80',
                    )}>
                      {item.title}
                    </span>
                    <button
                      onClick={() => deleteWaitingItem(item.id)}
                      className="shrink-0 text-transparent transition-all group-hover:text-muted-foreground/40 hover:!text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {waitingInputVisible ? (
              <div className={cn(
                'flex items-center gap-2.5 px-3 py-2.5',
                (task.waitingFor ?? []).length > 0 && 'border-t border-white/[0.04]',
              )}>
                <div className="h-4 w-4 shrink-0 rounded-full border border-white/10" />
                <input
                  autoFocus
                  value={newWaitingText}
                  onChange={e => setNewWaitingText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const trimmed = newWaitingText.trim();
                      if (trimmed) {
                        update({
                          waitingFor: [...(task.waitingFor ?? []), {
                            id: `wf-${Date.now()}`,
                            title: trimmed,
                            completed: false,
                          }],
                        });
                        setNewWaitingText('');
                      }
                    }
                    if (e.key === 'Escape') {
                      setWaitingInputVisible(false);
                      setNewWaitingText('');
                    }
                  }}
                  onBlur={() => {
                    if (!newWaitingText.trim()) setWaitingInputVisible(false);
                  }}
                  placeholder="What are you waiting for?"
                  className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/30"
                />
              </div>
            ) : (
              <div className={cn((task.waitingFor ?? []).length > 0 && 'border-t border-white/[0.04]')}>
                <button
                  onClick={() => setWaitingInputVisible(true)}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground/40 transition-colors hover:text-muted-foreground"
                >
                  <Plus className="h-3 w-3" />
                  Add item
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Resources */}
        <div className="space-y-2">
          <Label className="text-[11px] text-muted-foreground/70">Resources</Label>
          <div className="overflow-hidden rounded-xl border border-white/[0.05] bg-muted/20">
            {taskResources.map((r, i) => {
              const Icon = RESOURCE_TYPE_ICONS[r.type];
              const colorClass = RESOURCE_TYPE_COLORS[r.type];
              return (
                <div
                  key={r.id}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2.5',
                    i > 0 && 'border-t border-white/[0.04]',
                  )}
                >
                  <Icon className={cn('h-3.5 w-3.5 shrink-0', colorClass)} />
                  <span className="flex-1 truncate text-xs text-foreground/80">{r.title}</span>
                  {r.type === 'Link' && r.url && (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-muted-foreground/40 transition-colors hover:text-foreground"
                      onClick={e => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              );
            })}
            <div className={cn(taskResources.length > 0 && 'border-t border-white/[0.04]')}>
              <button
                className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground/40 transition-colors hover:text-muted-foreground"
                onClick={() =>
                  onResourceCreate({
                    type: 'Project Note',
                    title: 'New Resource',
                    taskId: task.id,
                    createdAt: new Date().toISOString(),
                  })
                }
              >
                <Plus className="h-3 w-3" />
                Add resource
              </button>
            </div>
          </div>
        </div>

        {/* Recent Progress */}
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground/70">Recent Progress</Label>
          <PhaseJourney
            phaseHistory={task.phaseHistory}
            statuses={statuses}
            currentPhase={task.status}
            maxItems={4}
          />
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
          <DrawerContent className="max-h-[85vh] flex flex-col">
            <DrawerHeader>
              <DrawerTitle>{task?.title ?? 'Task Details'}</DrawerTitle>
              <DrawerDescription>Edit task details below.</DrawerDescription>
            </DrawerHeader>
            <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-6">{content}</div>
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
          <>
            {/* Floating close button — left of the drawer */}
            <motion.button
              key="task-drawer-close"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 0.85, x: 0 }}
              exit={{ opacity: 0, x: 40, transition: { type: 'spring', stiffness: 420, damping: 32, mass: 0.7 } }}
              whileHover={{ opacity: 1 }}
              transition={{ delay: 0.25, type: 'spring', stiffness: 320, damping: 28 }}
              onClick={() => onOpenChange(false)}
              style={{ backgroundColor: '#1c1c1a' }}
              className="fixed top-8 right-[460px] z-50 flex h-[60px] w-8 items-center justify-center rounded-full text-muted-foreground shadow-lg border border-white/[0.08] hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </motion.button>

            {/* Floating sheet */}
            <motion.div
              key="task-drawer"
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.7 }}
              style={{ backgroundColor: '#1c1c1a', transformOrigin: 'top right' }}
              className="fixed top-8 right-8 bottom-8 z-50 w-[420px] rounded-2xl shadow-2xl border border-white/[0.08] overflow-hidden flex flex-col"
            >
              <div className="flex-1 min-h-0 overflow-y-auto p-2">{content}</div>
            </motion.div>
          </>
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
