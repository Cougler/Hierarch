'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/app/components/ui/dialog';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import {
  ArrowLeft, Calendar as CalendarIcon, Check, ChevronDown, ChevronRight, Clock, FileText, FolderKanban, Plus, Search, Trash2, X,
} from 'lucide-react';
import { Calendar } from '@/app/components/ui/calendar';
import { format, parseISO, isToday, isPast } from 'date-fns';
import { useIsMobile } from '@/app/hooks/use-mobile';
import type { Task, StatusConfig, Project, Blocker, BlockerType } from '@/app/types';
import { User, Users, Globe, Link2, Lock, RotateCcw } from 'lucide-react';
import type { Artifact } from '@/app/components/NoteDrawer';
import { getIconComponent } from '@/app/components/IconPicker';
import { PhaseJourney } from '@/app/components/PhaseJourney';

import { ARTIFACT_TYPE_ICONS, ARTIFACT_TYPE_COLORS } from '@/app/components/ArtifactsView';

// ─── Phase color helpers ─────────────────────────────────────────────────────

const PHASE_COLORS: Record<string, { color: string; bg: string }> = {
  explore: { color: 'text-violet-700 dark:text-violet-400', bg: 'bg-violet-500/10' },
  design: { color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-500/10' },
  iterate: { color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-500/10' },
  review: { color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-500/10' },
  handoff: { color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
};

const getPhaseStyle = (id: string) => PHASE_COLORS[id] ?? { color: 'text-muted-foreground', bg: 'bg-muted/20' };

// ─── Searchable picker popover ──────────────────────────────────────────────

function PickerPopover({
  open,
  onOpenChange,
  trigger,
  items,
  selectedId,
  onSelect,
  placeholder,
  emptyLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  items: { id: string; label: string; secondary?: string }[];
  selectedId?: string;
  onSelect: (id: string) => void;
  placeholder: string;
  emptyLabel: string;
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(i => i.label.toLowerCase().includes(q) || i.secondary?.toLowerCase().includes(q));
  }, [items, query]);

  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-[220px] p-0" sideOffset={4}>
        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/50" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={placeholder}
              autoFocus
              className="w-full bg-transparent pl-7 pr-2 py-1.5 text-xs outline-none placeholder:text-muted-foreground/40"
            />
          </div>
        </div>
        <div className="border-t border-border/30 max-h-[200px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-xs text-muted-foreground/40 text-center">{emptyLabel}</div>
          ) : (
            filtered.map(item => (
              <button
                key={item.id}
                onClick={() => { onSelect(item.id); onOpenChange(false); }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-accent/50',
                  selectedId === item.id ? 'text-foreground font-medium' : 'text-muted-foreground',
                )}
              >
                <span className="truncate">{item.label}</span>
                {item.secondary && (
                  <span className="ml-auto text-[10px] text-muted-foreground/40 truncate max-w-[80px]">{item.secondary}</span>
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Props ──────────────────────────────────────────────────────────────────

const BLOCKER_TYPE_META: Record<BlockerType, { icon: typeof User; label: string }> = {
  person: { icon: User, label: 'Person' },
  team: { icon: Users, label: 'Team' },
  external: { icon: Globe, label: 'External' },
  task: { icon: Link2, label: 'Task' },
};

function blockerAge(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return '1d';
  return `${days}d`;
}

interface TaskDetailsDrawerProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  statuses: StatusConfig[];
  artifacts: Artifact[];
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onArtifactClick: (artifact: Artifact) => void;
  onCreateBlocker?: (taskId: string, blocker: { type: BlockerType; title: string; owner?: string }) => void;
  onResolveBlocker?: (taskId: string, blockerId: string, unresolve?: boolean) => void;
  onDeleteBlocker?: (taskId: string, blockerId: string) => void;
  onArtifactCreate?: (taskId: string) => void;
  onBack?: () => void;
  embedded?: boolean;
}

export function TaskDetailsDrawer({
  task,
  open,
  onOpenChange,
  projects,
  statuses,
  artifacts,
  onUpdate,
  onDelete,
  onArtifactClick,
  onCreateBlocker,
  onResolveBlocker,
  onDeleteBlocker,
  onArtifactCreate,
  onBack,
  embedded,
}: TaskDetailsDrawerProps) {
  const isMobile = useIsMobile();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [phaseOpen, setPhaseOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [blockerInputVisible, setBlockerInputVisible] = useState(false);
  const [newBlockerTitle, setNewBlockerTitle] = useState('');
  const [newBlockerType, setNewBlockerType] = useState<BlockerType>('person');
  const [newBlockerOwner, setNewBlockerOwner] = useState('');
  const [showResolved, setShowResolved] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const update = useCallback(
    (updates: Partial<Task>) => {
      if (task) onUpdate(task.id, updates);
    },
    [task, onUpdate],
  );

  useEffect(() => {
    if (!open) {
      setConfirmDelete(false);
      setBlockerInputVisible(false);
      setNewBlockerTitle('');
      setNewBlockerOwner('');
      setShowResolved(false);
    }
  }, [open]);

  const activeBlockers = useMemo(() => (task?.blockers ?? []).filter(b => !b.resolvedAt), [task?.blockers]);
  const resolvedBlockers = useMemo(() => (task?.blockers ?? []).filter(b => b.resolvedAt), [task?.blockers]);

  const handleAddBlocker = useCallback(() => {
    if (!task || !newBlockerTitle.trim() || !onCreateBlocker) return;
    onCreateBlocker(task.id, {
      type: newBlockerType,
      title: newBlockerTitle.trim(),
      owner: newBlockerOwner.trim() || undefined,
    });
    setNewBlockerTitle('');
    setNewBlockerOwner('');
    setNewBlockerType('person');
    setBlockerInputVisible(false);
  }, [task, newBlockerTitle, newBlockerType, newBlockerOwner, onCreateBlocker]);

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
  const taskArtifacts = task ? artifacts.filter(n => n.taskId === task.id) : [];

  const currentStatus = task ? statuses.find(s => {
    const norm = (v: string) => v.toLowerCase().replace(/[\s-]+/g, '');
    return norm(task.status ?? '') === norm(s.id);
  }) : undefined;

  const phaseStyle = currentStatus ? getPhaseStyle(currentStatus.id) : { color: 'text-muted-foreground', bg: 'bg-muted/20' };

  const projectItems = useMemo(() => {
    return projects
      .filter(p => p.metadata?.type !== 'section')
      .map(p => ({ id: p.id, label: p.name }));
  }, [projects]);

  const content = task ? (
    <div key={task.id} className="flex flex-col h-full">
      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-5 px-5 pb-5 pt-3">
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
            className="border-0 bg-transparent px-0 text-lg font-semibold shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/40"
          />

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
                  <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', currentStatus?.color ?? 'bg-muted-foreground')} />
                  {currentStatus?.title ?? 'No phase'}
                  <ChevronDown className="h-2.5 w-2.5 opacity-60" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[240px] p-1.5" sideOffset={4}>
                <div className="grid grid-cols-2 gap-0.5">
                  {statuses.map(s => {
                    const norm = (v: string) => v.toLowerCase().replace(/[\s-]+/g, '');
                    const isActive = norm(task.status ?? '') === norm(s.id);
                    const style = getPhaseStyle(s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => { update({ status: s.id }); setPhaseOpen(false); }}
                        className={cn(
                          'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs transition-colors',
                          isActive
                            ? cn(style.bg, style.color, 'font-medium')
                            : 'text-muted-foreground hover:bg-surface hover:text-foreground',
                        )}
                      >
                        <span className={cn('h-2 w-2 rounded-full shrink-0', s.color)} />
                        {s.title}
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Project + Due Date row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Project */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/40">Project</span>
              <div className="flex items-center gap-1">
                <PickerPopover
                  open={projectOpen}
                  onOpenChange={setProjectOpen}
                  trigger={
                    <button className={cn(
                      'flex flex-1 min-w-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors',
                      taskProject
                        ? 'bg-surface text-foreground hover:bg-surface-hover'
                        : 'border border-dashed border-border/40 text-muted-foreground/40 hover:text-muted-foreground hover:border-border/60',
                    )}>
                      <FolderKanban className="h-3 w-3 shrink-0" />
                      <span className="truncate">{taskProject?.name ?? 'None'}</span>
                      <ChevronDown className="h-2.5 w-2.5 ml-auto shrink-0 opacity-40" />
                    </button>
                  }
                  items={projectItems}
                  selectedId={taskProject?.id}
                  onSelect={id => update({ project: id })}
                  placeholder="Search projects…"
                  emptyLabel="No projects"
                />
                {taskProject && (
                  <button
                    onClick={() => update({ project: undefined })}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/30 hover:text-muted-foreground hover:bg-surface transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/40">Due Date</span>
            <div className="flex items-center gap-1">
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors',
                      task.dueDate
                        ? 'bg-surface text-foreground hover:bg-surface-hover'
                        : 'border border-dashed border-border/40 text-muted-foreground/40 hover:text-muted-foreground hover:border-border/60',
                      overdue && 'text-red-400',
                      today && 'text-amber-400',
                    )}
                  >
                    <CalendarIcon className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {parsed
                        ? timeValue
                          ? `${format(parsed, 'MMM d')} at ${format(parsed, 'h:mm a')}`
                          : format(parsed, 'MMM d, yyyy')
                        : 'None'}
                    </span>
                    <ChevronDown className="h-2.5 w-2.5 shrink-0 opacity-40" />
                  </button>
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
                    }}
                  />
                  {/* Time input */}
                  <div className="border-t border-border/30 px-3 py-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                      <input
                        type="time"
                        value={timeValue}
                        onChange={(e) => {
                          if (!parsed) return;
                          const datePart = format(parsed, 'yyyy-MM-dd');
                          update({ dueDate: e.target.value ? `${datePart}T${e.target.value}` : datePart });
                        }}
                        disabled={!task.dueDate}
                        className="flex-1 h-7 rounded-md border border-border/40 bg-surface px-2.5 text-xs text-foreground outline-none [color-scheme:auto] focus:border-primary/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      />
                      {timeValue && (
                        <button
                          onClick={() => {
                            if (!parsed) return;
                            update({ dueDate: format(parsed, 'yyyy-MM-dd') });
                          }}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/40 hover:text-muted-foreground hover:bg-surface transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Clear date */}
                  {task.dueDate && (
                    <div className="border-t border-border/30 px-3 pb-3 pt-1">
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
              {task.dueDate && (
                <button
                  onClick={() => update({ dueDate: '' })}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/30 hover:text-muted-foreground hover:bg-surface transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
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

          {/* Blockers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Label className="text-[11px] text-muted-foreground/70">Blockers</Label>
                {activeBlockers.length > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive/15 px-1 text-[9px] font-medium text-destructive">
                    {activeBlockers.length}
                  </span>
                )}
              </div>
              {resolvedBlockers.length > 0 && (
                <button
                  onClick={() => setShowResolved(!showResolved)}
                  className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                >
                  {showResolved ? 'Hide' : 'Show'} resolved ({resolvedBlockers.length})
                </button>
              )}
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-muted/20">
              <AnimatePresence initial={false}>
                {activeBlockers.map((blocker, i) => {
                  const TypeIcon = BLOCKER_TYPE_META[blocker.type].icon;
                  return (
                    <motion.div
                      key={blocker.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                      transition={{ duration: 0.12 }}
                    >
                      <div className={cn(
                        'group flex items-center gap-2.5 px-3 py-2.5',
                        i > 0 && 'border-t border-border/50',
                      )}>
                        <TypeIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-foreground/80 leading-relaxed">{blocker.title}</span>
                          {blocker.owner && (
                            <span className="ml-1.5 text-[10px] text-muted-foreground/50">from {blocker.owner}</span>
                          )}
                        </div>
                        <span className="shrink-0 text-[10px] text-muted-foreground/30">{blockerAge(blocker.createdAt)}</span>
                        <button
                          onClick={() => onResolveBlocker?.(task.id, blocker.id)}
                          className="shrink-0 text-muted-foreground/30 transition-all hover:text-emerald-500"
                          title="Resolve"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => onDeleteBlocker?.(task.id, blocker.id)}
                          className="shrink-0 text-transparent transition-all group-hover:text-muted-foreground/30 hover:!text-destructive"
                          title="Delete"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Resolved blockers (collapsible) */}
              <AnimatePresence>
                {showResolved && resolvedBlockers.map((blocker, i) => {
                  const TypeIcon = BLOCKER_TYPE_META[blocker.type].icon;
                  return (
                    <motion.div
                      key={blocker.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className={cn(
                        'group flex items-center gap-2.5 px-3 py-2',
                        (i > 0 || activeBlockers.length > 0) && 'border-t border-border/50',
                      )}>
                        <TypeIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/20" />
                        <span className="flex-1 text-xs text-muted-foreground/40 line-through truncate">{blocker.title}</span>
                        <button
                          onClick={() => onResolveBlocker?.(task.id, blocker.id, true)}
                          className="shrink-0 text-transparent transition-all group-hover:text-muted-foreground/30 hover:!text-foreground"
                          title="Unresolve"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Add blocker */}
              {blockerInputVisible ? (
                <div className={cn(
                  'px-3 py-2.5 space-y-2',
                  (activeBlockers.length > 0 || (showResolved && resolvedBlockers.length > 0)) && 'border-t border-border/50',
                )}>
                  <div className="flex items-center gap-1">
                    {(Object.keys(BLOCKER_TYPE_META) as BlockerType[]).map(t => {
                      const Meta = BLOCKER_TYPE_META[t];
                      return (
                        <button
                          key={t}
                          onClick={() => setNewBlockerType(t)}
                          className={cn(
                            'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors border',
                            newBlockerType === t
                              ? 'border-primary/40 bg-primary/10 text-primary'
                              : 'border-border text-muted-foreground/50 hover:text-foreground',
                          )}
                        >
                          <Meta.icon className="h-2.5 w-2.5" />
                          {Meta.label}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    autoFocus
                    value={newBlockerTitle}
                    onChange={e => setNewBlockerTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddBlocker();
                      if (e.key === 'Escape') { setBlockerInputVisible(false); setNewBlockerTitle(''); setNewBlockerOwner(''); }
                    }}
                    placeholder="What's blocking this task?"
                    className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/30"
                  />
                  <input
                    value={newBlockerOwner}
                    onChange={e => setNewBlockerOwner(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddBlocker();
                      if (e.key === 'Escape') { setBlockerInputVisible(false); setNewBlockerTitle(''); setNewBlockerOwner(''); }
                    }}
                    placeholder="From whom? (optional)"
                    className="w-full bg-transparent text-[10px] text-foreground/60 outline-none placeholder:text-muted-foreground/20"
                  />
                </div>
              ) : (
                <div className={cn(
                  (activeBlockers.length > 0 || (showResolved && resolvedBlockers.length > 0)) && 'border-t border-border/50',
                )}>
                  <button
                    onClick={() => setBlockerInputVisible(true)}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground/40 transition-colors hover:text-muted-foreground"
                  >
                    <Plus className="h-3 w-3" />
                    Add blocker
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Artifacts */}
          <div className="space-y-2">
            <Label className="text-[11px] text-muted-foreground/70">Artifacts</Label>
            <div className="overflow-hidden rounded-xl border border-border bg-muted/20">
              {taskArtifacts.length > 0 ? (
                taskArtifacts.map((artifact, i) => {
                  const ArtifactIcon = ARTIFACT_TYPE_ICONS[artifact.type] || FileText;
                  const artifactColor = ARTIFACT_TYPE_COLORS[artifact.type] || 'text-muted-foreground';
                  return (
                    <button
                      key={artifact.id}
                      onClick={() => onArtifactClick(artifact)}
                      className={cn(
                        'flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-surface',
                        i > 0 && 'border-t border-border/50',
                      )}
                    >
                      <ArtifactIcon className={cn('h-3.5 w-3.5 shrink-0', artifactColor)} />
                      <span className="flex-1 text-xs text-foreground/80 truncate">
                        {artifact.title || 'Untitled artifact'}
                      </span>
                      <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                    </button>
                  );
                })
              ) : null}
              {onArtifactCreate && (
                <div className={cn(taskArtifacts.length > 0 && 'border-t border-border/50')}>
                  <button
                    onClick={() => onArtifactCreate(task.id)}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground/40 transition-colors hover:text-muted-foreground"
                  >
                    <Plus className="h-3 w-3" />
                    Add artifact
                  </button>
                </div>
              )}
              {taskArtifacts.length === 0 && !onArtifactCreate && (
                <div className="px-3 py-4 text-xs text-muted-foreground/30 text-center">
                  No artifacts linked
                </div>
              )}
            </div>
          </div>

          {/* Recent Progress */}
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground/70">History</Label>
            <PhaseJourney
              phaseHistory={task.phaseHistory}
              statuses={statuses}
              currentPhase={task.status}
              maxItems={4}
              taskId={task.id}
              artifacts={artifacts}
              onArtifactClick={onArtifactClick}
            />
          </div>
        </div>
      </ScrollArea>

      {/* Footer — pinned */}
      <div className="shrink-0 flex items-center justify-between border-t border-border px-5 py-3">
        <span className="text-[11px] text-muted-foreground/40">
          {task.createdAt ? format(new Date(task.createdAt), 'MMM d, yyyy') : ''}
        </span>
        <button
          onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground/30 hover:text-destructive transition-colors"
        >
          <Trash2 className="h-3 w-3" />
          Delete
        </button>
      </div>
    </div>
  ) : null;

  // Embedded mode: return just the content + delete dialog (no shell)
  if (embedded) {
    return (
      <>
        {content}
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
              className="fixed top-8 right-[460px] z-50 flex h-[60px] w-8 items-center justify-center rounded-full bg-drawer text-muted-foreground shadow-lg border border-border hover:text-foreground transition-colors"
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
              style={{ transformOrigin: 'top right' }}
              className="fixed top-8 right-8 bottom-8 z-50 w-[420px] rounded-2xl bg-drawer shadow-2xl border border-border overflow-hidden flex flex-col"
            >
              <div className="flex-1 min-h-0 overflow-y-auto">{content}</div>
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
