'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/app/lib/utils';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Calendar } from '@/app/components/ui/calendar';
import { format, isToday, isPast, parseISO } from 'date-fns';
import type { Project } from '@/app/types';
import { getIconComponent } from '@/app/components/IconPicker';

interface SelectCellProps {
  checked: boolean;
  anySelected: boolean;
  onChange: () => void;
}

export function SelectCell({ checked, anySelected, onChange }: SelectCellProps) {
  return (
    <div className="flex items-center justify-center px-2">
      <Checkbox
        checked={checked}
        onCheckedChange={onChange}
        className={cn(
          'transition-opacity',
          checked || anySelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
      />
    </div>
  );
}

interface TitleCellProps {
  title: string;
  onChange: (title: string) => void;
}

export function TitleCell({ title, onChange }: TitleCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(title); }, [title]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = useCallback(() => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== title) onChange(trimmed);
    else setDraft(title);
  }, [draft, title, onChange]);

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setDraft(title); setEditing(false); }
        }}
        className="h-7 border-none bg-transparent px-1 text-sm shadow-none focus-visible:ring-1"
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <span
      className="cursor-text truncate px-1 text-sm hover:text-foreground"
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
    >
      {title}
    </span>
  );
}

interface ProjectCellProps {
  project?: string;
  projects: Project[];
  onChange?: (projectId: string | undefined) => void;
}

export function ProjectCell({ project, projects, onChange }: ProjectCellProps) {
  const proj = projects.find(p => p.id === project) ?? projects.find(p => p.name === project);
  const color = proj?.metadata?.color;

  const trigger = proj ? (
    <Badge
      variant="secondary"
      className="max-w-full truncate text-[11px] font-medium cursor-pointer"
      style={color ? { backgroundColor: `${color}20`, color, borderColor: `${color}40` } : undefined}
    >
      {proj.metadata?.icon && (() => { const Icon = getIconComponent(proj.metadata!.icon); return <Icon className="mr-1 h-3 w-3 shrink-0" />; })()}
      {proj.name}
    </Badge>
  ) : (
    <span className={cn(
      'text-xs px-1.5 py-0.5 rounded',
      onChange
        ? 'text-muted-foreground/30 hover:text-muted-foreground/60 hover:bg-accent/50 cursor-pointer transition-colors'
        : 'text-muted-foreground/30'
    )}>
      —
    </span>
  );

  if (!onChange) return trigger;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="min-w-0 max-w-full focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-md">
          {trigger}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuItem onClick={() => onChange(undefined)}>
          <span className="text-muted-foreground">No project</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {projects.map(p => (
          <DropdownMenuItem key={p.id} onClick={() => onChange(p.id)}>
            {p.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface DueDateCellProps {
  date?: string;
  onChange: (date: string) => void;
}

export function DueDateCell({ date, onChange }: DueDateCellProps) {
  const [open, setOpen] = useState(false);

  const parsed = date ? parseISO(date) : undefined;
  const overdue = parsed && isPast(parsed) && !isToday(parsed);
  const today = parsed && isToday(parsed);

  const label = parsed
    ? format(parsed, 'MMM d')
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors',
            label
              ? cn('hover:bg-accent', overdue && 'text-red-500', today && 'text-amber-500', !overdue && !today && 'text-muted-foreground')
              : 'text-muted-foreground/30 hover:text-muted-foreground/60 hover:bg-accent/50'
          )}
        >
          {label ? (
            <>
              <CalendarIcon className="h-3 w-3" />
              {label}
            </>
          ) : (
            <span>—</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" onClick={(e) => e.stopPropagation()}>
        <div>
          <Calendar
            mode="single"
            selected={parsed}
            onSelect={(day) => {
              if (day) {
                onChange(format(day, 'yyyy-MM-dd'));
                setOpen(false);
              }
            }}
          />
          {date && (
            <div className="border-t px-2 pb-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-full text-xs text-muted-foreground"
                onClick={() => { onChange(''); setOpen(false); }}
              >
                <X className="mr-1 h-3 w-3" />
                Clear date
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
