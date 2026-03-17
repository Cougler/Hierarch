import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, ChevronDown, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/app/lib/utils';
import { Calendar } from '@/app/components/ui/calendar';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { User, Users, Globe, Link2 } from 'lucide-react';
import type { Project, StatusConfig, Task, BlockerType } from '@/app/types';

const BLOCKER_TYPES: { type: BlockerType; icon: typeof User; label: string }[] = [
  { type: 'person', icon: User, label: 'Person' },
  { type: 'team', icon: Users, label: 'Team' },
  { type: 'external', icon: Globe, label: 'External' },
  { type: 'task', icon: Link2, label: 'Task' },
];

interface NewTaskDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  statuses: StatusConfig[];
  defaultProjectId?: string;
  onSave: (task: Partial<Task>) => void;
}

export function NewTaskDrawer({
  open,
  onOpenChange,
  projects,
  statuses,
  defaultProjectId,
  onSave,
}: NewTaskDrawerProps) {
  const [title, setTitle] = useState('');
  const [statusId, setStatusId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [description, setDescription] = useState('');
  const [pendingBlockers, setPendingBlockers] = useState<{ type: BlockerType; title: string; owner?: string }[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [addingBlocker, setAddingBlocker] = useState(false);
  const [newBlockerTitle, setNewBlockerTitle] = useState('');
  const [newBlockerType, setNewBlockerType] = useState<BlockerType>('person');
  const [newBlockerOwner, setNewBlockerOwner] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  // Reset form when drawer opens
  useEffect(() => {
    if (open) {
      setTitle('');
      setStatusId(statuses[0]?.id ?? '');
      setDueDate('');
      setDueTime('');
      setDescription('');
      setPendingBlockers([]);
      setProjectId(defaultProjectId ?? null);
      setDateOpen(false);
      setAddingBlocker(false);
      setNewBlockerTitle('');
      setNewBlockerOwner('');
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [open, statuses, defaultProjectId]);

  const handleCreate = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      status: statusId,
      dueDate: dueDate && dueTime ? `${dueDate}T${dueTime}` : dueDate,
      description,
      project: projectId ?? undefined,
      pendingBlockers: pendingBlockers.length > 0 ? pendingBlockers : undefined,
    } as Partial<Task> & { pendingBlockers?: typeof pendingBlockers });
    onOpenChange(false);
  };

  const addBlockerItem = () => {
    if (!newBlockerTitle.trim()) return;
    setPendingBlockers(prev => [
      ...prev,
      { type: newBlockerType, title: newBlockerTitle.trim(), owner: newBlockerOwner.trim() || undefined },
    ]);
    setNewBlockerTitle('');
    setNewBlockerOwner('');
    setNewBlockerType('person');
    setAddingBlocker(false);
  };

  const removeBlockerItem = (index: number) => {
    setPendingBlockers(prev => prev.filter((_, i) => i !== index));
  };

  const parsedDate = dueDate ? new Date(dueDate + 'T12:00:00') : undefined;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Close button */}
          <motion.button
            key="new-task-close"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => onOpenChange(false)}
            className="fixed top-8 right-[560px] z-50 flex h-8 w-8 items-center justify-center rounded-full bg-surface text-muted-foreground shadow-lg border border-border hover:bg-surface-hover hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </motion.button>

          {/* Panel */}
          <motion.div
            key="new-task-drawer"
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.7 }}
            style={{ transformOrigin: 'top right' }}
            className="fixed top-8 right-8 bottom-8 z-50 w-[520px] rounded-2xl bg-drawer shadow-2xl border border-border flex overflow-hidden"
          >
            {/* Left: Task form */}
            <div className="flex-1 flex flex-col gap-4 p-5 overflow-auto">
              <h3 className="text-sm font-semibold text-foreground">Task details</h3>

              {/* Name */}
              <Input
                ref={titleRef}
                placeholder="Name"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                className="bg-surface border-border text-sm placeholder:text-muted-foreground/50 focus-visible:ring-ring/30"
              />

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-muted-foreground/70">Status</label>
                <div className="flex flex-wrap gap-1.5">
                  {statuses.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setStatusId(s.id)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors border',
                        statusId === s.id
                          ? 'border-border bg-surface text-foreground'
                          : 'border-border bg-transparent text-muted-foreground hover:text-foreground hover:border-border',
                      )}
                    >
                      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', s.color)} />
                      {s.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Due Date */}
              <div className="flex flex-wrap items-center gap-2">
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <button className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors w-fit',
                      'border-border bg-surface hover:bg-surface',
                      dueDate ? 'text-foreground' : 'text-muted-foreground/50',
                    )}>
                      <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                      {parsedDate ? format(parsedDate, 'MMM d, yyyy') : 'Due Date'}
                      <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={parsedDate}
                      onSelect={day => {
                        if (day) setDueDate(format(day, 'yyyy-MM-dd'));
                        setDateOpen(false);
                      }}
                    />
                    {dueDate && (
                      <div className="border-t border-border px-3 py-2">
                        <button
                          onClick={() => { setDueDate(''); setDueTime(''); setDateOpen(false); }}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Clear date
                        </button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
                {dueDate && (
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                    <input
                      type="time"
                      value={dueTime}
                      onChange={e => setDueTime(e.target.value)}
                      className="bg-transparent text-sm text-foreground outline-none [color-scheme:dark]"
                    />
                    {dueTime && (
                      <button
                        onClick={() => setDueTime('')}
                        className="text-muted-foreground/40 transition-colors hover:text-muted-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Description */}
              <Textarea
                placeholder="Description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="min-h-[120px] resize-none bg-surface border-border text-sm placeholder:text-muted-foreground/50 focus-visible:ring-ring/30"
              />

              {/* Blockers */}
              <div className="rounded-lg border border-border bg-surface px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground/70">Blockers</span>
                  <button
                    onClick={() => setAddingBlocker(true)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {pendingBlockers.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1">
                    {pendingBlockers.map((item, i) => {
                      const TypeMeta = BLOCKER_TYPES.find(b => b.type === item.type);
                      const TypeIcon = TypeMeta?.icon ?? User;
                      return (
                        <div key={i} className="flex items-center gap-2 rounded px-1 py-0.5">
                          <TypeIcon className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                          <span className="flex-1 text-xs text-foreground truncate">
                            {item.title}
                            {item.owner && <span className="text-muted-foreground/50 ml-1">from {item.owner}</span>}
                          </span>
                          <button onClick={() => removeBlockerItem(i)} className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {addingBlocker && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center gap-1">
                      {BLOCKER_TYPES.map(bt => (
                        <button
                          key={bt.type}
                          onClick={() => setNewBlockerType(bt.type)}
                          className={cn(
                            'flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-medium transition-colors border',
                            newBlockerType === bt.type
                              ? 'border-primary/40 bg-primary/10 text-primary'
                              : 'border-border text-muted-foreground/50 hover:text-foreground',
                          )}
                        >
                          <bt.icon className="h-2 w-2" />
                          {bt.label}
                        </button>
                      ))}
                    </div>
                    <Input
                      autoFocus
                      placeholder="What's blocking this?"
                      value={newBlockerTitle}
                      onChange={e => setNewBlockerTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') addBlockerItem();
                        if (e.key === 'Escape') { setAddingBlocker(false); setNewBlockerTitle(''); setNewBlockerOwner(''); }
                      }}
                      className="h-7 text-xs bg-transparent border-border focus-visible:ring-ring/30"
                    />
                    <Input
                      placeholder="From whom? (optional)"
                      value={newBlockerOwner}
                      onChange={e => setNewBlockerOwner(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') addBlockerItem();
                        if (e.key === 'Escape') { setAddingBlocker(false); setNewBlockerTitle(''); setNewBlockerOwner(''); }
                      }}
                      onBlur={() => { if (!newBlockerTitle.trim()) { setAddingBlocker(false); setNewBlockerOwner(''); } }}
                      className="h-7 text-[10px] bg-transparent border-border focus-visible:ring-ring/30"
                    />
                  </div>
                )}
              </div>

              {/* Create button */}
              <Button
                onClick={handleCreate}
                disabled={!title.trim()}
                className="w-full bg-[#bf7535] hover:bg-[#bf7535]/90 text-white disabled:opacity-40"
              >
                Create Task
              </Button>
            </div>

            {/* Divider */}
            <div className="w-px bg-surface" />

            {/* Right: Project picker */}
            <div className="w-[180px] shrink-0 flex flex-col gap-1 p-3 overflow-auto">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2">
                Project
              </p>

              {/* No Project */}
              <button
                onClick={() => setProjectId(null)}
                className={cn(
                  'rounded-lg px-2 py-1.5 text-left text-sm transition-colors',
                  projectId === null
                    ? 'bg-[#bf7535]/20 text-[#e09050] font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface',
                )}
              >
                No Project
              </button>

              {projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => setProjectId(p.id)}
                  className={cn(
                    'rounded-lg px-2 py-1.5 text-left text-sm transition-colors',
                    projectId === p.id
                      ? 'bg-[#bf7535]/20 text-[#e09050] font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-surface',
                  )}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
