'use client';

import { useMemo, useRef } from 'react';
import { cn } from '@/app/lib/utils';
import { getIconComponent } from '@/app/components/IconPicker';
import type { Project } from '@/app/types';
import { format, startOfWeek, addWeeks, differenceInDays, parseISO, startOfDay } from 'date-fns';

interface CapacityViewProps {
  projects: Project[];
  onProjectClick: (projectName: string) => void;
}

const WEEK_WIDTH = 80; // px per week column
const ROW_HEIGHT = 72; // px per project row
const LABEL_WIDTH = 180; // left label column

const COLOR_HEX_MAP: Record<string, string> = {
  'bg-slate-500': '#64748b',
  'bg-red-500': '#ef4444',
  'bg-orange-500': '#f97316',
  'bg-amber-500': '#f59e0b',
  'bg-emerald-500': '#10b981',
  'bg-blue-500': '#3b82f6',
  'bg-violet-500': '#8b5cf6',
  'bg-pink-500': '#ec4899',
};

const DEFAULT_COLOR = '#3b82f6';

function getColorHex(color?: string): string {
  return (color && COLOR_HEX_MAP[color]) || DEFAULT_COLOR;
}

export function CapacityView({ projects, onProjectClick }: CapacityViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Only real projects (not sections) with a start or end date
  const timedProjects = useMemo(
    () => projects.filter(
      (p) => p.metadata?.type !== 'section' && (p.metadata?.start_date || p.metadata?.end_date)
    ),
    [projects]
  );

  // Compute timeline bounds
  const { timelineStart, weeks } = useMemo(() => {
    if (timedProjects.length === 0) {
      const today = startOfWeek(new Date(), { weekStartsOn: 1 });
      return { timelineStart: today, weeks: 26 };
    }

    const dates: Date[] = [];
    timedProjects.forEach((p) => {
      if (p.metadata?.start_date) dates.push(parseISO(p.metadata.start_date));
      if (p.metadata?.end_date) dates.push(parseISO(p.metadata.end_date));
    });

    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

    // Start 2 weeks before earliest date, end 4 weeks after latest
    const start = startOfWeek(addWeeks(minDate, -2), { weekStartsOn: 1 });
    const end = addWeeks(maxDate, 4);
    const totalWeeks = Math.max(26, Math.ceil(differenceInDays(end, start) / 7) + 1);

    return { timelineStart: start, weeks: totalWeeks };
  }, [timedProjects]);

  // Generate week columns
  const weekColumns = useMemo(() => {
    return Array.from({ length: weeks }, (_, i) => addWeeks(timelineStart, i));
  }, [timelineStart, weeks]);

  // Group weeks by month for header
  const monthGroups = useMemo(() => {
    const groups: { label: string; startIndex: number; count: number }[] = [];
    let current = '';
    weekColumns.forEach((week, i) => {
      const month = format(week, 'MMM yyyy');
      if (month !== current) {
        groups.push({ label: format(week, 'MMM'), startIndex: i, count: 1 });
        current = month;
      } else {
        const last = groups[groups.length - 1];
        if (last) last.count++;
      }
    });
    return groups;
  }, [weekColumns]);

  // Today marker position
  const todayOffset = useMemo(() => {
    const diff = differenceInDays(startOfDay(new Date()), startOfDay(timelineStart));
    return (diff / 7) * WEEK_WIDTH;
  }, [timelineStart]);

  const getBarStyle = (project: Project) => {
    const startDate = project.metadata?.start_date ? parseISO(project.metadata.start_date) : null;
    const endDate = project.metadata?.end_date ? parseISO(project.metadata.end_date) : null;

    if (!startDate && !endDate) return null;

    const effectiveStart = startDate || endDate!;
    const effectiveEnd = endDate || startDate!;

    const startDiff = differenceInDays(startOfDay(effectiveStart), startOfDay(timelineStart));
    const durationDays = Math.max(1, differenceInDays(startOfDay(effectiveEnd), startOfDay(effectiveStart)));

    const left = (startDiff / 7) * WEEK_WIDTH;
    const width = Math.max(WEEK_WIDTH * 0.5, (durationDays / 7) * WEEK_WIDTH);
    const color = getColorHex(project.metadata?.color);
    const isOverdue = endDate && endDate < new Date();

    return { left, width, color, isOverdue };
  };

  const totalWidth = weeks * WEEK_WIDTH;

  if (timedProjects.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <svg className="h-12 w-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="1.5" />
          <line x1="3" y1="9" x2="21" y2="9" strokeWidth="1.5" />
          <line x1="8" y1="2" x2="8" y2="6" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="16" y1="2" x2="16" y2="6" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <p className="text-sm font-medium">No project timelines yet</p>
        <p className="text-xs text-center max-w-xs">
          Open a project and set a start and end date to see it here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Page header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
        <div>
          <h1 className="text-lg font-semibold">Capacity</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Project timelines</p>
        </div>
      </div>

      {/* Timeline grid */}
      <div className="flex flex-1 overflow-hidden">
        {/* Fixed left label column */}
        <div
          className="shrink-0 border-r border-border bg-card z-10"
          style={{ width: LABEL_WIDTH }}
        >
          {/* Header spacer (month row) */}
          <div className="border-b border-border" style={{ height: 32 }} />
          {/* Week row spacer */}
          <div className="border-b border-border" style={{ height: 28 }} />
          {/* Project rows */}
          {timedProjects.map((project) => {
            const Icon = getIconComponent(project.metadata?.icon);
            const colorHex = getColorHex(project.metadata?.color);
            return (
              <div
                key={project.id}
                className="flex items-center gap-2.5 px-4 cursor-pointer hover:bg-accent/40 transition-colors"
                style={{ height: ROW_HEIGHT }}
                onClick={() => onProjectClick(project.name)}
              >
                <Icon className="h-4 w-4 shrink-0" style={{ color: colorHex }} />
                <span className="text-sm font-medium truncate">{project.name}</span>
              </div>
            );
          })}
        </div>

        {/* Scrollable timeline */}
        <div className="flex-1 overflow-auto" ref={scrollRef}>
          <div style={{ width: totalWidth, minWidth: '100%', position: 'relative' }}>
            {/* Month header row */}
            <div className="flex border-b border-border sticky top-0 bg-card z-10" style={{ height: 32 }}>
              {monthGroups.map((group) => (
                <div
                  key={`${group.label}-${group.startIndex}`}
                  className="border-r border-border/50 px-3 flex items-center shrink-0"
                  style={{ width: group.count * WEEK_WIDTH }}
                >
                  <span className="text-xs font-semibold text-muted-foreground">{group.label}</span>
                </div>
              ))}
            </div>

            {/* Week number row */}
            <div className="flex border-b border-border sticky top-8 bg-card z-10" style={{ height: 28 }}>
              {weekColumns.map((week, i) => (
                <div
                  key={i}
                  className="border-r border-border/30 flex items-center justify-center shrink-0"
                  style={{ width: WEEK_WIDTH }}
                >
                  <span className="text-[10px] text-muted-foreground/50">{format(week, 'd')}</span>
                </div>
              ))}
            </div>

            {/* Project rows */}
            {timedProjects.map((project) => {
              const bar = getBarStyle(project);
              return (
                <div
                  key={project.id}
                  className="relative border-b border-border/30"
                  style={{ height: ROW_HEIGHT, width: totalWidth }}
                >
                  {/* Week grid lines */}
                  {weekColumns.map((_, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 border-r border-border/20"
                      style={{ left: (i + 1) * WEEK_WIDTH }}
                    />
                  ))}

                  {/* Today line */}
                  <div
                    className="absolute top-0 bottom-0 w-px bg-primary/50 z-10"
                    style={{ left: todayOffset }}
                  />

                  {/* Bar */}
                  {bar && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 rounded-full cursor-pointer transition-opacity hover:opacity-80"
                      style={{
                        left: bar.left,
                        width: bar.width,
                        height: 24,
                        backgroundColor: bar.color,
                        opacity: bar.isOverdue ? 0.45 : 0.85,
                        outline: bar.isOverdue ? `2px dashed ${bar.color}` : 'none',
                        outlineOffset: 2,
                      }}
                      onClick={() => onProjectClick(project.name)}
                      title={project.name}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
