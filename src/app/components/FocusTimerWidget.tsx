'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import { Play, Pause, RotateCcw, Timer, Clock } from 'lucide-react';
import { toast } from 'sonner';
import type { TimeEntry } from '@/app/types';

const STORAGE_KEY = 'flowki-timer-state';

const PRESETS = [
  { label: '5m', seconds: 5 * 60 },
  { label: '15m', seconds: 15 * 60 },
  { label: '25m', seconds: 25 * 60 },
  { label: '45m', seconds: 45 * 60 },
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
  if (typeof window === 'undefined') return DEFAULT_STATE;
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
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* quota exceeded */ }
}

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

interface FocusTimerWidgetProps {
  onSaveEntry: (entry: Partial<TimeEntry>) => void;
}

export function FocusTimerWidget({ onSaveEntry }: FocusTimerWidgetProps) {
  const [state, setState] = useState<TimerState>(DEFAULT_STATE);
  const [customMinutes, setCustomMinutes] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      setState(loadState());
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
      toast.success(`Session completed: ${formatTime(duration)}`);
    },
    [onSaveEntry, state.startedAt],
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

  const applyCustom = () => {
    const mins = parseInt(customMinutes, 10);
    if (mins > 0) {
      setPreset(mins * 60);
      setCustomMinutes('');
    }
  };

  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-4">
      {/* Section header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Timer className="h-3.5 w-3.5" />
          Focus + Tracker
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground"
          onClick={() => setExpanded(!expanded)}
        >
          <Play className="h-3 w-3" />
        </Button>
      </div>

      {/* Compact session row */}
      <div
        className="flex items-center gap-3 rounded-lg bg-card p-3 cursor-pointer transition-colors hover:bg-accent/50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Timer className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {state.label || 'Focus Session'}
          </p>
        </div>
        <span className="font-mono text-sm font-semibold tabular-nums">
          {formatTime(displayTime)}
        </span>
        <Button
          variant={state.running ? 'secondary' : 'default'}
          size="icon"
          className="h-7 w-7 shrink-0 rounded-full"
          onClick={(e) => {
            e.stopPropagation();
            toggleRunning();
          }}
        >
          {state.running ? (
            <Pause className="h-3 w-3" />
          ) : (
            <Play className="h-3 w-3" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
      </div>

      {/* Expanded controls */}
      {expanded && (
        <div className="mt-3 space-y-3 rounded-lg border border-border p-3">
          <Tabs
            value={state.mode}
            onValueChange={(v) => {
              if (state.running) return;
              setState((prev) => ({
                ...prev,
                mode: v as 'timer' | 'stopwatch',
                elapsed: 0,
                startedAt: null,
              }));
            }}
          >
            <TabsList className="w-full">
              <TabsTrigger value="timer" className="flex-1 gap-1.5 text-xs">
                <Timer className="h-3 w-3" />
                Timer
              </TabsTrigger>
              <TabsTrigger value="stopwatch" className="flex-1 gap-1.5 text-xs">
                <Clock className="h-3 w-3" />
                Stopwatch
              </TabsTrigger>
            </TabsList>

            <TabsContent value="timer" className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <Button
                    key={p.label}
                    variant={state.target === p.seconds ? 'default' : 'outline'}
                    size="sm"
                    className="h-6 text-[10px]"
                    onClick={() => setPreset(p.seconds)}
                    disabled={state.running}
                  >
                    {p.label}
                  </Button>
                ))}
                <div className="flex gap-1">
                  <Input
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    placeholder="min"
                    className="h-6 w-12 text-[10px]"
                    type="number"
                    min={1}
                    disabled={state.running}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') applyCustom();
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px]"
                    onClick={applyCustom}
                    disabled={state.running}
                  >
                    Set
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="stopwatch">
              <p className="text-xs text-muted-foreground">
                Count up from zero. Hit stop to save.
              </p>
            </TabsContent>
          </Tabs>

          <Input
            value={state.label}
            onChange={(e) =>
              setState((prev) => ({ ...prev, label: e.target.value }))
            }
            placeholder="Session label (optional)"
            className="h-7 text-xs"
          />

          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={reset}
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
