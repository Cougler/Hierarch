'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Play, Pause, RotateCcw, Timer, Clock, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Task, TimeEntry } from '@/app/types';

const STORAGE_KEY = 'hierarch-timer-state';

const PRESETS = [
  { label: '15m', seconds: 15 * 60 },
  { label: '25m', seconds: 25 * 60 },
  { label: '45m', seconds: 45 * 60 },
  { label: '60m', seconds: 60 * 60 },
];

interface TimerState {
  mode: 'timer' | 'stopwatch';
  label: string;
  running: boolean;
  elapsed: number;
  target: number;
  startedAt: string | null;
}

const DEFAULT_STATE: TimerState = {
  mode: 'timer',
  label: '',
  running: false,
  elapsed: 0,
  target: 25 * 60,
  startedAt: null,
};

function loadState(): TimerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as TimerState;
    if (parsed.running && parsed.startedAt) {
      const drift = Math.floor(
        (Date.now() - new Date(parsed.startedAt).getTime()) / 1000,
      );
      parsed.elapsed += drift;
      parsed.startedAt = new Date().toISOString();
    }
    return parsed;
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(state: TimerState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

interface FocusTimerViewProps {
  task?: Task | null;
  onSaveEntry: (entry: Partial<TimeEntry>) => void;
  onTaskUpdate?: (id: string, updates: Partial<Task>) => void;
  onClose?: () => void;
}

export function FocusTimerView({ task, onSaveEntry, onTaskUpdate, onClose }: FocusTimerViewProps) {
  const [state, setState] = useState<TimerState>(DEFAULT_STATE);
  const [sessionNotes, setSessionNotes] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialized = useRef(false);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!initialized.current) {
      const loaded = loadState();
      if (task) {
        loaded.label = task.title;
      }
      setState(loaded);
      initialized.current = true;
    }
  }, []);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const completeSession = useCallback(
    (duration: number, label: string) => {
      const now = new Date().toISOString();
      onSaveEntry({
        label: label || 'Focus session',
        duration,
        startTime: state.startedAt || now,
        endTime: now,
        createdAt: now,
      });

      // Apply notes to task description if there are notes and a task
      if (sessionNotes.trim() && task && onTaskUpdate) {
        const timestamp = new Date().toLocaleString('en-US', {
          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
        });
        const noteBlock = `\n\n--- Focus session (${timestamp}) ---\n${sessionNotes.trim()}`;
        const updatedDescription = (task.description || '') + noteBlock;
        onTaskUpdate(task.id, { description: updatedDescription });
      }

      toast.success(`Session completed: ${formatTime(duration)}`);
    },
    [onSaveEntry, onTaskUpdate, task, sessionNotes, state.startedAt],
  );

  useEffect(() => {
    if (state.running) {
      intervalRef.current = setInterval(() => {
        setState((prev) => {
          const next = { ...prev, elapsed: prev.elapsed + 1 };

          if (prev.mode === 'timer' && next.elapsed >= prev.target) {
            next.running = false;
            next.startedAt = null;
            completeSession(prev.target, prev.label);
          }

          return next;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.running, completeSession]);

  const displayTime =
    state.mode === 'timer'
      ? Math.max(0, state.target - state.elapsed)
      : state.elapsed;

  const progress =
    state.mode === 'timer' && state.target > 0
      ? Math.min(1, state.elapsed / state.target)
      : 0;

  const toggleRunning = () => {
    setState((prev) => ({
      ...prev,
      running: !prev.running,
      startedAt: !prev.running ? new Date().toISOString() : prev.startedAt,
    }));
  };

  const reset = () => {
    if (state.running && state.elapsed > 0) {
      completeSession(state.elapsed, state.label);
    }
    setState((prev) => ({
      ...prev,
      running: false,
      elapsed: 0,
      startedAt: null,
    }));
    setSessionNotes('');
  };

  const setPreset = (seconds: number) => {
    setState((prev) => ({
      ...prev,
      target: seconds,
      elapsed: 0,
      running: false,
      startedAt: null,
    }));
  };

  // Ring SVG values
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center border-b border-border/40 px-6 py-4 shrink-0">
        <div className="flex-1">
          <h1 className="text-sm font-semibold">Focus Timer</h1>
          {task && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">
              {task.title}
            </p>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col lg:flex-row items-start justify-center gap-8 px-6 py-10 max-w-4xl mx-auto">

          {/* ─── Left: Timer ─── */}
          <div className="flex flex-col items-center gap-6 flex-1">

            {/* Timer ring */}
            <div className="relative flex items-center justify-center">
              <svg
                width="280"
                height="280"
                viewBox="0 0 280 280"
                className="-rotate-90"
              >
                {/* Background ring */}
                <circle
                  cx="140"
                  cy="140"
                  r={radius}
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth="4"
                  opacity="0.3"
                />
                {/* Progress ring */}
                {state.mode === 'timer' && (
                  <circle
                    cx="140"
                    cy="140"
                    r={radius}
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-[stroke-dashoffset] duration-1000 ease-linear"
                  />
                )}
              </svg>

              {/* Time display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-5xl font-light tabular-nums tracking-tight text-foreground">
                  {formatTime(displayTime)}
                </span>
                <span className="text-xs text-muted-foreground/50 mt-1 uppercase tracking-wider">
                  {state.mode === 'timer' ? 'remaining' : 'elapsed'}
                </span>
              </div>
            </div>

            {/* Big play/pause button */}
            <button
              onClick={toggleRunning}
              className="flex h-16 w-16 items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95"
              style={{
                backgroundColor: state.running ? 'var(--muted)' : 'var(--primary)',
                color: state.running ? 'var(--foreground)' : 'var(--primary-foreground)',
              }}
            >
              {state.running ? (
                <Pause className="h-7 w-7" />
              ) : (
                <Play className="h-7 w-7 ml-0.5" />
              )}
            </button>

            {/* Mode toggle + presets */}
            <div className="flex flex-col items-center gap-3 w-full max-w-xs">
              {/* Timer / Stopwatch toggle */}
              <div className="flex rounded-lg border border-border/40 bg-muted/30 p-0.5">
                <button
                  onClick={() => {
                    if (state.running) return;
                    setState(prev => ({ ...prev, mode: 'timer', elapsed: 0, startedAt: null }));
                  }}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    state.mode === 'timer'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Timer className="h-3 w-3 inline mr-1" />
                  Timer
                </button>
                <button
                  onClick={() => {
                    if (state.running) return;
                    setState(prev => ({ ...prev, mode: 'stopwatch', elapsed: 0, startedAt: null }));
                  }}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    state.mode === 'stopwatch'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Clock className="h-3 w-3 inline mr-1" />
                  Stopwatch
                </button>
              </div>

              {/* Presets (timer mode only) */}
              {state.mode === 'timer' && (
                <div className="flex gap-1.5">
                  {PRESETS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => setPreset(p.seconds)}
                      disabled={state.running}
                      className={`rounded-md px-3 py-1 text-xs font-medium transition-colors border ${
                        state.target === p.seconds
                          ? 'border-primary/50 bg-primary/10 text-primary'
                          : 'border-border/40 text-muted-foreground hover:text-foreground hover:border-border disabled:opacity-40'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Reset */}
              {state.elapsed > 0 && (
                <button
                  onClick={reset}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset & save
                </button>
              )}
            </div>
          </div>

          {/* ─── Right: Session notepad ─── */}
          <div className="flex flex-col gap-3 flex-1 w-full lg:max-w-sm lg:pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                Session Notes
              </h2>
              {task && (
                <span className="text-[10px] text-muted-foreground/40">
                  Applied to task on save
                </span>
              )}
            </div>

            <textarea
              ref={notesRef}
              value={sessionNotes}
              onChange={e => setSessionNotes(e.target.value)}
              placeholder="Capture thoughts while you work. These notes will be appended to the task when the session ends."
              className="w-full flex-1 min-h-[280px] rounded-lg border border-border/40 bg-card/30 px-4 py-3 text-sm text-foreground outline-none resize-none placeholder:text-muted-foreground/30 focus:border-border/60 transition-colors"
            />

            {/* Session label */}
            <Input
              value={state.label}
              onChange={(e) =>
                setState((prev) => ({ ...prev, label: e.target.value }))
              }
              placeholder="Session label (optional)"
              className="h-8 text-xs"
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
