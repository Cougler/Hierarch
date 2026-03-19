'use client';

import { useMemo, useRef, useEffect } from 'react';
import { getIconComponent } from '@/app/components/IconPicker';
import type { Project, Task } from '@/app/types';
import { format, startOfWeek, addWeeks, subMonths, differenceInDays, parseISO, startOfDay } from 'date-fns';

interface CapacityViewProps {
  projects: Project[];
  tasks: Task[];
  onProjectClick: (projectName: string) => void;
}

const WEEK_WIDTH = 80;
const ROW_HEIGHT = 70;
const MONTH_H = 32;
const WEEK_H = 24;
const BAR_H = 20;

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

const DEFAULT_COLOR = '#64748b';

function getColorHex(color?: string): string {
  if (!color) return DEFAULT_COLOR;
  if (color.startsWith('#')) return color;
  return COLOR_HEX_MAP[color] || DEFAULT_COLOR;
}

export function CapacityView({ projects, tasks, onProjectClick }: CapacityViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const timedProjects = useMemo(
    () => projects.filter(
      (p) => p.metadata?.type !== 'section' && (p.metadata?.start_date || p.metadata?.end_date)
    ),
    [projects],
  );

  const { timelineStart, weeks } = useMemo(() => {
    if (timedProjects.length === 0) {
      const start = startOfWeek(subMonths(new Date(), 1), { weekStartsOn: 1 });
      return { timelineStart: start, weeks: 30 };
    }

    const dates: Date[] = [];
    timedProjects.forEach((p) => {
      if (p.metadata?.start_date) dates.push(parseISO(p.metadata.start_date));
      if (p.metadata?.end_date) dates.push(parseISO(p.metadata.end_date));
    });

    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
    const oneMonthAgo = startOfWeek(subMonths(new Date(), 1), { weekStartsOn: 1 });
    const projectStart = startOfWeek(addWeeks(minDate, -2), { weekStartsOn: 1 });
    const start = new Date(Math.min(oneMonthAgo.getTime(), projectStart.getTime()));
    const end = addWeeks(maxDate, 4);
    const totalWeeks = Math.max(26, Math.ceil(differenceInDays(end, start) / 7) + 1);

    return { timelineStart: start, weeks: totalWeeks };
  }, [timedProjects]);

  const weekColumns = useMemo(
    () => Array.from({ length: weeks }, (_, i) => addWeeks(timelineStart, i)),
    [timelineStart, weeks],
  );

  const monthGroups = useMemo(() => {
    const groups: { label: string; startIndex: number; count: number }[] = [];
    let current = '';
    weekColumns.forEach((week, i) => {
      const key = format(week, 'MMM yyyy');
      if (key !== current) {
        groups.push({ label: key, startIndex: i, count: 1 });
        current = key;
      } else {
        const last = groups[groups.length - 1];
        if (last) last.count++;
      }
    });
    return groups;
  }, [weekColumns]);

  const todayOffset = useMemo(() => {
    const diff = differenceInDays(startOfDay(new Date()), startOfDay(timelineStart));
    return (diff / 7) * WEEK_WIDTH;
  }, [timelineStart]);

  // Scroll to today on mount (with a bit of left padding so it's not flush)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = Math.max(0, todayOffset - 48);
    }
  }, [todayOffset]);

  const getBarInfo = (project: Project) => {
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
    const isOverdue = !!(endDate && endDate < new Date());

    return { left, width, color, isOverdue };
  };

  const totalWidth = weeks * WEEK_WIDTH;

  if (timedProjects.length === 0) {
    const demoMonths = ['Mar', 'Apr', 'May', 'Jun']
    const demoWeeks = [3, 10, 17, 24, 1, 8, 15, 22, 29, 6, 13, 20, 27, 3, 10, 17]
    const demoProjects = [
      { name: 'Mobile App Redesign', color: '#3b82f6', left: 0, width: 8 },
      { name: 'Design System', color: '#8b5cf6', left: 2, width: 6 },
      { name: 'Marketing Site', color: '#10b981', left: 5, width: 10 },
    ]
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex-1 relative overflow-hidden flex flex-col items-center pt-16">
          <h3 className="text-lg font-semibold text-foreground mb-2">No project timelines yet</h3>
          <p className="text-[13px] text-muted-foreground/70 leading-relaxed max-w-[340px] text-center mb-8">
            Open a project and set a start and end date to see your timelines here.
          </p>
          {/* Floating demo card */}
          <div className="rounded-2xl border border-border/40 bg-card/30 backdrop-blur-sm shadow-lg overflow-hidden w-[680px] pointer-events-none select-none">
            {/* Month headers */}
            <div className="flex border-b border-border/30" style={{ height: 28 }}>
              {demoMonths.map((m) => (
                <div key={m} className="border-r border-border/20 px-3 flex items-center flex-1">
                  <span className="text-[10px] font-semibold text-foreground/40 uppercase">{m}</span>
                </div>
              ))}
            </div>
            {/* Project rows */}
            {demoProjects.map((p) => (
              <div key={p.name} className="relative border-b border-border/10 last:border-b-0" style={{ height: 56 }}>
                <div
                  className="absolute"
                  style={{
                    left: `${(p.left / 16) * 100}%`,
                    width: `${(p.width / 16) * 100}%`,
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                >
                  <div className="flex items-center gap-1 px-1 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="text-[10px] font-medium truncate leading-none" style={{ color: p.color }}>{p.name}</span>
                  </div>
                  <div style={{ height: 18, borderRadius: 5, backgroundColor: `${p.color}18`, border: `1px solid ${p.color}50` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-6 py-4 shrink-0">
        <h1 className="text-sm font-semibold">Capacity</h1>
        <span className="text-xs text-muted-foreground">· {timedProjects.length} project{timedProjects.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-auto" ref={scrollRef}>
        <div style={{ width: Math.max(totalWidth, 600), minWidth: '100%', position: 'relative' }}>

          {/* Month row */}
          <div
            className="sticky top-0 z-20 flex border-b border-border/50 bg-background"
            style={{ height: MONTH_H }}
          >
            {monthGroups.map((group) => (
              <div
                key={`${group.label}-${group.startIndex}`}
                className="border-r border-border/30 px-3 flex items-center shrink-0"
                style={{ width: group.count * WEEK_WIDTH }}
              >
                <span className="text-[11px] font-semibold text-foreground/60 tracking-wide uppercase">
                  {group.label}
                </span>
              </div>
            ))}
          </div>

          {/* Week-day row */}
          <div
            className="sticky z-20 flex border-b border-border/30 bg-background"
            style={{ top: MONTH_H, height: WEEK_H }}
          >
            {weekColumns.map((week, i) => (
              <div
                key={i}
                className="border-r border-border/20 flex items-center justify-center shrink-0"
                style={{ width: WEEK_WIDTH }}
              >
                <span className="text-[10px] text-muted-foreground/35">{format(week, 'd')}</span>
              </div>
            ))}
          </div>

          {/* Project rows */}
          {timedProjects.map((project) => {
            const bar = getBarInfo(project);
            const Icon = getIconComponent(project.metadata?.icon);
            const projectTasks = tasks.filter(
              (t) => (t.project === project.id || t.project === project.name) && t.dueDate,
            );

            return (
              <div
                key={project.id}
                className="relative border-b border-border/20 hover:bg-accent/30 transition-colors"
                style={{ height: ROW_HEIGHT }}
              >
                {/* Week grid lines */}
                {weekColumns.map((_, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 border-r border-border/10"
                    style={{ left: (i + 1) * WEEK_WIDTH }}
                  />
                ))}

                {/* Today line */}
                <div
                  className="absolute top-0 bottom-0 w-px z-10"
                  style={{ left: todayOffset, backgroundColor: 'rgba(251,191,36,0.35)' }}
                />

                {/* Label + bar block, vertically centered as a unit */}
                {bar && (
                  <div
                    className="absolute cursor-pointer group/bar"
                    style={{
                      left: bar.left,
                      width: bar.width,
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                    onClick={() => onProjectClick(project.id)}
                  >
                    {/* Project label above the bar */}
                    <div className="flex items-center gap-1 px-0.5 mb-1 select-none pointer-events-none">
                      <Icon className="h-2.5 w-2.5 shrink-0 opacity-60" style={{ color: bar.color }} />
                      <span
                        className="text-[10px] font-semibold truncate leading-none"
                        style={{ color: `${bar.color}dd` }}
                      >
                        {project.name}
                      </span>
                    </div>

                    {/* Bar */}
                    <div
                      className="relative overflow-hidden"
                      style={{
                        height: BAR_H,
                        borderRadius: 6,
                        backgroundColor: `${bar.color}12`,
                        border: `1px solid ${bar.color}${bar.isOverdue ? '90' : '70'}`,
                        outline: bar.isOverdue ? `1.5px dashed ${bar.color}90` : 'none',
                        outlineOffset: 3,
                      }}
                    >
                      {/* Hover fill */}
                      <div
                        className="absolute inset-0 opacity-0 group-hover/bar:opacity-100 transition-opacity"
                        style={{ backgroundColor: `${bar.color}08` }}
                      />

                      {/* Task due-date dots */}
                      {projectTasks.map((task) => {
                        const taskDiff = differenceInDays(
                          startOfDay(parseISO(task.dueDate!)),
                          startOfDay(timelineStart),
                        );
                        const dotX = (taskDiff / 7) * WEEK_WIDTH - bar.left;
                        if (dotX < 4 || dotX > bar.width - 4) return null;
                        return (
                          <div
                            key={task.id}
                            title={task.title}
                            className="absolute w-1.5 h-1.5 rounded-full z-10"
                            style={{
                              left: dotX,
                              top: '50%',
                              transform: 'translate(-50%, -50%)',
                              backgroundColor: bar.color,
                              opacity: 0.55,
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Today line top label */}
          <div
            className="absolute pointer-events-none z-30"
            style={{ left: todayOffset, top: MONTH_H + WEEK_H - 1 }}
          >
            <div
              className="w-px absolute top-0"
              style={{
                height: timedProjects.length * ROW_HEIGHT,
                backgroundColor: 'rgba(251,191,36,0.2)',
              }}
            />
            <div
              className="absolute -translate-x-1/2 -top-[22px] px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wide"
              style={{
                backgroundColor: 'rgba(251,191,36,0.15)',
                color: 'rgba(251,191,36,0.8)',
                border: '1px solid rgba(251,191,36,0.25)',
              }}
            >
              TODAY
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
