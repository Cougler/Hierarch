import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar as CalendarIcon, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/app/lib/utils';
import { Calendar } from '@/app/components/ui/calendar';
import { Textarea } from '@/app/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { ChecklistSection } from '@/app/components/ChecklistSection';
import type { Project, BlockerItem } from '@/app/types';
import { PROJECT_PHASES } from '@/app/types';

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

  // Sync state from project when drawer opens
  useEffect(() => {
    if (open) {
      setPhase(project.metadata?.phase ?? '');
      setDescription(project.description ?? '');
      setStartDate(project.metadata?.start_date ?? '');
      setEndDate(project.metadata?.end_date ?? '');
      setBlockers(project.metadata?.blockers ?? []);
      setStartOpen(false);
      setEndOpen(false);
    }
  }, [open, project]);

  const save = (patch: Partial<Project>) => {
    onProjectUpdate(project.id, patch);
  };

  const handleDescriptionBlur = () => {
    if (description !== (project.description ?? '')) {
      save({ description });
    }
  };

  const handleStartDate = (day: Date | undefined) => {
    const val = day ? format(day, 'yyyy-MM-dd') : '';
    setStartDate(val);
    setStartOpen(false);
    save({ metadata: { ...project.metadata, start_date: val || undefined } });
  };

  const handleEndDate = (day: Date | undefined) => {
    const val = day ? format(day, 'yyyy-MM-dd') : '';
    setEndDate(val);
    setEndOpen(false);
    save({ metadata: { ...project.metadata, end_date: val || undefined } });
  };

  const updateBlockers = (updated: BlockerItem[]) => {
    setBlockers(updated);
    save({ metadata: { ...project.metadata, blockers: updated } });
  };

  const parsedStart = startDate ? new Date(startDate + 'T12:00:00') : undefined;
  const parsedEnd = endDate ? new Date(endDate + 'T12:00:00') : undefined;
  const activeBlockers = blockers.filter(b => !b.completed).length;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Close button */}
          <motion.button
            key="proj-details-close"
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

          {/* Panel */}
          <motion.div
            key="proj-details-drawer"
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.7 }}
            style={{ transformOrigin: 'top right' }}
            className="fixed top-8 right-8 bottom-8 z-50 w-[420px] rounded-2xl bg-drawer shadow-2xl border border-border flex flex-col overflow-hidden"
          >
            <div className="flex flex-col gap-5 p-5 overflow-auto flex-1">
              <h3 className="text-sm font-semibold text-foreground">Project details</h3>

              {/* Phase */}
              <div>
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  Phase
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PROJECT_PHASES.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setPhase(p.id);
                        save({ metadata: { ...project.metadata, phase: p.id } });
                      }}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors border',
                        phase === p.id
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground/60 hover:text-foreground hover:border-border',
                      )}
                    >
                      <span className={cn('h-1.5 w-1.5 rounded-full', p.color)} />
                      {p.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  Description
                </label>
                <Textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  onBlur={handleDescriptionBlur}
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
                          onSelect={handleStartDate}
                        />
                        {startDate && (
                          <div className="border-t border-border px-3 py-2">
                            <button
                              onClick={() => handleStartDate(undefined)}
                              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              Clear date
                            </button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>

                  <span className="mt-5 text-muted-foreground/40 text-sm">→</span>

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
                          onSelect={handleEndDate}
                        />
                        {endDate && (
                          <div className="border-t border-border px-3 py-2">
                            <button
                              onClick={() => handleEndDate(undefined)}
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

              {/* Blockers */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  <AlertTriangle className="h-3 w-3" />
                  Blockers
                  {activeBlockers > 0 && (
                    <span className="ml-1 rounded-full bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                      {activeBlockers}
                    </span>
                  )}
                </label>
                <ChecklistSection
                  items={blockers}
                  onToggle={id =>
                    updateBlockers(blockers.map(b => b.id === id ? { ...b, completed: !b.completed } : b))
                  }
                  onDelete={id => updateBlockers(blockers.filter(b => b.id !== id))}
                  onAdd={title =>
                    updateBlockers([...blockers, { id: crypto.randomUUID(), title, completed: false }])
                  }
                  placeholder="Add blocker… press Enter"
                  emptyMessage="No blockers — looking good!"
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
