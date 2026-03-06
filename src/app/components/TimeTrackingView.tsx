'use client';

import { useMemo } from 'react';
import { cn } from '@/app/lib/utils';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Separator } from '@/app/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Clock, Trash2, Timer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isToday, isYesterday } from 'date-fns';
import type { TimeEntry } from '@/app/types';

interface TimeTrackingViewProps {
  entries: TimeEntry[];
  onDeleteEntry: (id: string) => void;
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

function formatHMS(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, MMMM d, yyyy');
}

type GroupedEntries = { label: string; date: string; entries: TimeEntry[] }[];

function groupByDay(entries: TimeEntry[]): GroupedEntries {
  const sorted = [...entries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const groups: Map<string, TimeEntry[]> = new Map();
  for (const entry of sorted) {
    const key = format(new Date(entry.createdAt), 'yyyy-MM-dd');
    const existing = groups.get(key);
    if (existing) {
      existing.push(entry);
    } else {
      groups.set(key, [entry]);
    }
  }

  return Array.from(groups.entries()).map(([date, items]) => ({
    label: getDayLabel(items[0].createdAt),
    date,
    entries: items,
  }));
}

export function TimeTrackingView({ entries, onDeleteEntry }: TimeTrackingViewProps) {
  const grouped = useMemo(() => groupByDay(entries), [entries]);

  const totalSeconds = useMemo(
    () => entries.reduce((sum, e) => sum + e.duration, 0),
    [entries],
  );

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Time Tracking</h1>
            <p className="text-sm text-muted-foreground">
              History of your recorded focus sessions
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2">
            <Clock className="h-4 w-4 text-primary" />
            <div className="text-right">
              <p className="text-lg font-bold tabular-nums text-primary">
                {formatHMS(totalSeconds)}
              </p>
              <p className="text-[10px] text-muted-foreground">Total tracked</p>
            </div>
          </div>
        </div>

        {entries.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Timer className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-medium">No time entries yet</p>
                <p className="text-sm text-muted-foreground">
                  Use the Focus Timer to start tracking.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <AnimatePresence initial={false}>
              {grouped.map((group) => {
                const dayTotal = group.entries.reduce((s, e) => s + e.duration, 0);
                return (
                  <motion.div
                    key={group.date}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <h2 className="text-sm font-semibold">{group.label}</h2>
                      <Separator className="flex-1" />
                      <Badge variant="secondary" className="text-[10px] tabular-nums">
                        {formatDuration(dayTotal)}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <AnimatePresence initial={false}>
                        {group.entries.map((entry) => (
                          <motion.div
                            key={entry.id}
                            layout
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.97, height: 0 }}
                            transition={{ duration: 0.12 }}
                          >
                            <Card>
                              <CardContent className="flex items-center gap-4 p-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                  <Clock className="h-5 w-5 text-primary" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium">
                                    {entry.label || 'Focus session'}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>
                                      {format(new Date(entry.startTime), 'h:mm a')}
                                      {' – '}
                                      {format(new Date(entry.endTime), 'h:mm a')}
                                    </span>
                                  </div>
                                </div>
                                <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">
                                  {formatHMS(entry.duration)}
                                </span>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete time entry?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently remove this time entry. This action
                                        cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        onClick={() => onDeleteEntry(entry.id)}
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
