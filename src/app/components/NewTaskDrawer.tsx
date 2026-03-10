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
import type { Project, StatusConfig, Task, WaitingForItem } from '@/app/types';

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
  const [waitingFor, setWaitingFor] = useState<WaitingForItem[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [addingWaiting, setAddingWaiting] = useState(false);
  const [newWaitingText, setNewWaitingText] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  // Reset form when drawer opens
  useEffect(() => {
    if (open) {
      setTitle('');
      setStatusId(statuses[0]?.id ?? '');
      setDueDate('');
      setDueTime('');
      setDescription('');
      setWaitingFor([]);
      setProjectId(defaultProjectId ?? null);
      setDateOpen(false);
      setAddingWaiting(false);
      setNewWaitingText('');
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
      waitingFor,
      project: projectId ?? undefined,
    });
    onOpenChange(false);
  };

  const addWaitingItem = () => {
    if (!newWaitingText.trim()) return;
    setWaitingFor(prev => [
      ...prev,
      { id: Math.random().toString(36).slice(2), title: newWaitingText.trim(), completed: false },
    ]);
    setNewWaitingText('');
    setAddingWaiting(false);
  };

  const removeWaitingItem = (id: string) => {
    setWaitingFor(prev => prev.filter(w => w.id !== id));
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
            className="fixed top-8 right-[560px] z-50 flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-muted-foreground shadow-lg border border-white/[0.08] hover:bg-white/[0.12] hover:text-foreground transition-colors"
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
            style={{ backgroundColor: '#1c1c1a', transformOrigin: 'top right' }}
            className="fixed top-8 right-8 bottom-8 z-50 w-[520px] rounded-2xl shadow-2xl border border-white/[0.08] flex overflow-hidden"
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
                className="bg-white/[0.04] border-white/[0.08] text-sm placeholder:text-muted-foreground/50 focus-visible:ring-white/20"
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
                          ? 'border-white/20 bg-white/[0.08] text-foreground'
                          : 'border-white/[0.06] bg-transparent text-muted-foreground hover:text-foreground hover:border-white/10',
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
                      'border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.06]',
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
                  <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2">
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
                className="min-h-[120px] resize-none bg-white/[0.04] border-white/[0.08] text-sm placeholder:text-muted-foreground/50 focus-visible:ring-white/20"
              />

              {/* Waiting for */}
              <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground/70">Waiting for</span>
                  <button
                    onClick={() => setAddingWaiting(true)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {waitingFor.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1">
                    {waitingFor.map(item => (
                      <div key={item.id} className="flex items-center justify-between gap-2 rounded px-1 py-0.5">
                        <span className="text-xs text-foreground">{item.title}</span>
                        <button onClick={() => removeWaitingItem(item.id)} className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {addingWaiting && (
                  <div className="mt-2">
                    <Input
                      autoFocus
                      placeholder="What are you waiting for?"
                      value={newWaitingText}
                      onChange={e => setNewWaitingText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') addWaitingItem();
                        if (e.key === 'Escape') { setAddingWaiting(false); setNewWaitingText(''); }
                      }}
                      onBlur={() => { if (!newWaitingText.trim()) setAddingWaiting(false); }}
                      className="h-7 text-xs bg-transparent border-white/[0.08] focus-visible:ring-white/20"
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
            <div className="w-px bg-white/[0.06]" />

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
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]',
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
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]',
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
