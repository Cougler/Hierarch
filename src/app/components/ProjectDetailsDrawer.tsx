import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, ChevronDown, Check, Plus, X, RotateCcw } from 'lucide-react';
import { User, Users, Globe, Link2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/app/lib/utils';
import { Button } from '@/app/components/ui/button';
import { Calendar } from '@/app/components/ui/calendar';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/app/components/ui/dialog';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import type { Project, BlockerItem, BlockerType } from '@/app/types';
import { PROJECT_PHASES } from '@/app/types';

// ─── Phase color helpers ─────────────────────────────────────────────────────

const PHASE_COLORS: Record<string, { color: string; bg: string }> = {
  research: { color: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-500/10' },
  explore: { color: 'text-violet-700 dark:text-violet-400', bg: 'bg-violet-500/10' },
  design: { color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-500/10' },
  iterate: { color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-500/10' },
  review: { color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-500/10' },
  handoff: { color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
};

// ─── Blocker helpers ─────────────────────────────────────────────────────────

const BLOCKER_TYPE_META: Record<BlockerType, { icon: typeof User; label: string }> = {
  person: { icon: User, label: 'Person' },
  team: { icon: Users, label: 'Team' },
  external: { icon: Globe, label: 'External' },
  task: { icon: Link2, label: 'Task' },
};

function blockerAge(createdAt?: string): string {
  if (!createdAt) return '';
  const diff = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return '1d';
  return `${days}d`;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface ProjectDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  onProjectUpdate: (id: string, updates: Partial<Project>) => void;
}

export function ProjectDetailsDrawer({
  open,
  onOpenChange,
  project,
  onProjectUpdate,
}: ProjectDetailsDrawerProps) {
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [blockers, setBlockers] = useState<BlockerItem[]>([]);
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [phase, setPhase] = useState('');
  const [phaseOpen, setPhaseOpen] = useState(false);

  // Blocker input state
  const [blockerInputVisible, setBlockerInputVisible] = useState(false);
  const [newBlockerTitle, setNewBlockerTitle] = useState('');
  const [newBlockerType, setNewBlockerType] = useState<BlockerType>('person');
  const [newBlockerOwner, setNewBlockerOwner] = useState('');
  const [showResolved, setShowResolved] = useState(false);

  // Sync state from project when dialog opens
  useEffect(() => {
    if (open) {
      setPhase(project.metadata?.phase ?? '');
      setDescription(project.description ?? '');
      setStartDate(project.metadata?.start_date ?? '');
      setEndDate(project.metadata?.end_date ?? '');
      setBlockers(project.metadata?.blockers ?? []);
      setStartOpen(false);
      setEndOpen(false);
      setPhaseOpen(false);
      setBlockerInputVisible(false);
      setNewBlockerTitle('');
      setNewBlockerOwner('');
      setShowResolved(false);
    }
  }, [open, project]);

  const activeBlockers = useMemo(() => blockers.filter(b => !b.completed && !b.resolvedAt), [blockers]);
  const resolvedBlockers = useMemo(() => blockers.filter(b => b.completed || b.resolvedAt), [blockers]);

  const handleAddBlocker = useCallback(() => {
    if (!newBlockerTitle.trim()) return;
    setBlockers(prev => [...prev, {
      id: crypto.randomUUID(),
      title: newBlockerTitle.trim(),
      completed: false,
      type: newBlockerType,
      owner: newBlockerOwner.trim() || undefined,
      createdAt: new Date().toISOString(),
    }]);
    setNewBlockerTitle('');
    setNewBlockerOwner('');
    setNewBlockerType('person');
    setBlockerInputVisible(false);
  }, [newBlockerTitle, newBlockerType, newBlockerOwner]);

  const handleResolveBlocker = useCallback((id: string, unresolve = false) => {
    setBlockers(prev => prev.map(b => b.id === id
      ? { ...b, completed: !unresolve, resolvedAt: unresolve ? undefined : new Date().toISOString() }
      : b
    ));
  }, []);

  const handleDeleteBlocker = useCallback((id: string) => {
    setBlockers(prev => prev.filter(b => b.id !== id));
  }, []);

  const handleSave = () => {
    const updates: Partial<Project> = {};
    if (description !== (project.description ?? '')) {
      updates.description = description;
    }
    const metadataUpdates: Record<string, any> = { ...project.metadata };
    let metaChanged = false;

    if (phase !== (project.metadata?.phase ?? '')) {
      metadataUpdates.phase = phase || undefined;
      metaChanged = true;
    }
    if (startDate !== (project.metadata?.start_date ?? '')) {
      metadataUpdates.start_date = startDate || undefined;
      metaChanged = true;
    }
    if (endDate !== (project.metadata?.end_date ?? '')) {
      metadataUpdates.end_date = endDate || undefined;
      metaChanged = true;
    }
    if (JSON.stringify(blockers) !== JSON.stringify(project.metadata?.blockers ?? [])) {
      metadataUpdates.blockers = blockers;
      metaChanged = true;
    }

    if (metaChanged) updates.metadata = metadataUpdates;

    if (Object.keys(updates).length > 0) {
      onProjectUpdate(project.id, updates);
    }
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const currentPhase = PROJECT_PHASES.find(p => p.id === phase);
  const phaseStyle = currentPhase
    ? (PHASE_COLORS[currentPhase.id] ?? { color: 'text-muted-foreground', bg: 'bg-muted/20' })
    : { color: 'text-muted-foreground', bg: 'bg-muted/20' };

  const parsedStart = startDate ? new Date(startDate + 'T12:00:00') : undefined;
  const parsedEnd = endDate ? new Date(endDate + 'T12:00:00') : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle>Project Details</DialogTitle>
          <DialogDescription className="sr-only">Edit project phase, description, timeline, and blockers.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="flex flex-col gap-5 px-6 py-5">
            {/* Phase — Popover dropdown */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/40">Phase</span>
              <Popover open={phaseOpen} onOpenChange={setPhaseOpen}>
                <PopoverTrigger asChild>
                  <button className={cn(
                    'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                    phaseStyle.bg, phaseStyle.color,
                    'hover:brightness-110',
                  )}>
                    <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', currentPhase?.color ?? 'bg-muted-foreground')} />
                    {currentPhase?.title ?? 'Set phase'}
                    <ChevronDown className="h-2.5 w-2.5 opacity-60" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[240px] p-1.5" sideOffset={4}>
                  <div className="grid grid-cols-2 gap-0.5">
                    {PROJECT_PHASES.map(p => {
                      const isActive = phase === p.id;
                      const colors = PHASE_COLORS[p.id];
                      return (
                        <button
                          key={p.id}
                          onClick={() => { setPhase(p.id); setPhaseOpen(false); }}
                          className={cn(
                            'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs transition-colors',
                            isActive
                              ? cn(colors?.bg, colors?.color, 'font-medium')
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

            {/* Description */}
            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Description
              </label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What is this project about?"
                className="min-h-[100px] resize-none bg-surface border-border text-sm placeholder:text-muted-foreground/50 focus-visible:ring-ring/30"
              />
            </div>

            {/* Timeline */}
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                <CalendarIcon className="h-3 w-3" />
                Timeline
              </label>
              <div className="flex items-center gap-3">
                {/* Start date */}
                <div className="flex-1">
                  <p className="mb-1 text-xs text-muted-foreground/60">Start</p>
                  <Popover open={startOpen} onOpenChange={setStartOpen}>
                    <PopoverTrigger asChild>
                      <button className={cn(
                        'flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                        'border-border bg-surface hover:bg-surface',
                        startDate ? 'text-foreground' : 'text-muted-foreground/40',
                      )}>
                        {parsedStart ? format(parsedStart, 'MMM d, yyyy') : 'Start date'}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={parsedStart}
                        onSelect={(day) => {
                          setStartDate(day ? format(day, 'yyyy-MM-dd') : '');
                          setStartOpen(false);
                        }}
                      />
                      {startDate && (
                        <div className="border-t border-border px-3 py-2">
                          <button
                            onClick={() => { setStartDate(''); setStartOpen(false); }}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Clear date
                          </button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>

                <span className="mt-5 text-muted-foreground/40 text-sm">&rarr;</span>

                {/* End date */}
                <div className="flex-1">
                  <p className="mb-1 text-xs text-muted-foreground/60">End</p>
                  <Popover open={endOpen} onOpenChange={setEndOpen}>
                    <PopoverTrigger asChild>
                      <button className={cn(
                        'flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                        'border-border bg-surface hover:bg-surface',
                        endDate ? 'text-foreground' : 'text-muted-foreground/40',
                      )}>
                        {parsedEnd ? format(parsedEnd, 'MMM d, yyyy') : 'End date'}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={parsedEnd}
                        onSelect={(day) => {
                          setEndDate(day ? format(day, 'yyyy-MM-dd') : '');
                          setEndOpen(false);
                        }}
                      />
                      {endDate && (
                        <div className="border-t border-border px-3 py-2">
                          <button
                            onClick={() => { setEndDate(''); setEndOpen(false); }}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Clear date
                          </button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Blockers — typed system matching TaskDetailsDrawer */}
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
                    const TypeIcon = BLOCKER_TYPE_META[blocker.type ?? 'person'].icon;
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
                          {blocker.createdAt && (
                            <span className="shrink-0 text-[10px] text-muted-foreground/30">{blockerAge(blocker.createdAt)}</span>
                          )}
                          <button
                            onClick={() => handleResolveBlocker(blocker.id)}
                            className="shrink-0 text-muted-foreground/30 transition-all hover:text-emerald-500"
                            title="Resolve"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteBlocker(blocker.id)}
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
                    const TypeIcon = BLOCKER_TYPE_META[blocker.type ?? 'person'].icon;
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
                            onClick={() => handleResolveBlocker(blocker.id, true)}
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
                      placeholder="What's blocking this project?"
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
          </div>
        </ScrollArea>

        <DialogFooter className="shrink-0 px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
