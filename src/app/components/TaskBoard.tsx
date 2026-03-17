'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/app/lib/utils';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Separator } from '@/app/components/ui/separator';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/app/components/ui/tooltip';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from '@/app/components/ui/dropdown-menu';

import {
  LayoutGrid, List, Plus, Search, SlidersHorizontal, ArrowUpDown,
  ArrowUp, ArrowDown, Trash2, Settings2, Columns3, FolderKanban, X, CheckCheck, Circle,
} from 'lucide-react';
import { Checkbox } from '@/app/components/ui/checkbox';
import { useColumnWidths } from '@/app/hooks/use-column-widths';
import {
  DndContext, DragOverlay, closestCorners, PointerSensor,
  useSensor, useSensors, useDroppable,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import type { Task, StatusConfig, Project } from '@/app/types';
import { TaskCard } from '@/app/components/TaskCard';
import { TaskRow } from '@/app/components/TaskRow';
import { StatusManager } from '@/app/components/StatusManager';
import { ColumnManager } from '@/app/components/ColumnManager';

type ViewMode = 'list' | 'board';
type SortKey = 'date' | 'status' | 'project';

interface TaskBoardProps {
  tasks: Task[];
  projects: Project[];
  statuses: StatusConfig[];
  onTaskCreate: (task: Partial<Task>) => void;
  onTaskUpdate: (id: string, updates: Partial<Task>) => void;
  onTaskDelete: (id: string) => void;
  onTaskClick: (task: Task) => void;
  onStatusesChange: (statuses: StatusConfig[]) => void;
  onNewTask?: () => void;
  onStartFocus?: (task: Task) => void;
  onCreateNote?: (task: Task) => void;
  focusTaskId?: string | null;
  projectFilter?: string;
  defaultView?: ViewMode;
}

export function TaskBoard({
  tasks,
  projects,
  statuses,
  onTaskCreate,
  onTaskUpdate,
  onTaskDelete,
  onTaskClick,
  onStatusesChange,
  onNewTask,
  onStartFocus,
  onCreateNote,
  focusTaskId,
  projectFilter,
  defaultView = 'list',
}: TaskBoardProps) {
  const [view, setView] = useState<ViewMode>(() => {
    const stored = localStorage.getItem('hierarch-task-view') as ViewMode | null;
    return stored || defaultView;
  });
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('status');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [groupBy, setGroupBy] = useState(false);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [filterProjects, setFilterProjects] = useState<string[]>([]);
  const [filterDueDate, setFilterDueDate] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusManagerOpen, setStatusManagerOpen] = useState(false);
  const [columnManagerOpen, setColumnManagerOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [inlineCreating, setInlineCreating] = useState(false);

  const [listColumns, setListColumns] = useState([
    { id: 'select', title: 'Select', visible: true, width: 40 },
    { id: 'title', title: 'Task', visible: true, width: 300 },
    { id: 'project', title: 'Project', visible: true, width: 140 },
    { id: 'dueDate', title: 'Due Date', visible: true, width: 120 },
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // Filter & sort
  const filtered = useMemo(() => {
    let result = tasks;

    if (projectFilter) {
      const projId = projects.find(p => p.name === projectFilter || p.id === projectFilter)?.id;
      result = result.filter(t => t.project === projectFilter || (projId && t.project === projId));
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q),
      );
    }

    if (filterStatuses.length > 0) {
      result = result.filter(t => filterStatuses.includes(t.status));
    }

    if (filterProjects.length > 0) {
      result = result.filter(t => {
        const proj = projects.find(p => p.id === t.project || p.name === t.project);
        return proj ? filterProjects.includes(proj.id) : false;
      });
    }

    if (filterDueDate.length > 0) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      result = result.filter(t => {
        if (filterDueDate.includes('no_date') && !t.dueDate) return true;
        if (!t.dueDate) return false;
        const d = new Date(t.dueDate); d.setHours(0, 0, 0, 0);
        if (filterDueDate.includes('overdue') && d < today) return true;
        if (filterDueDate.includes('today') && d.getTime() === today.getTime()) return true;
        if (filterDueDate.includes('this_week')) {
          const end = new Date(today); end.setDate(today.getDate() + 6);
          if (d > today && d <= end) return true;
        }
        return false;
      });
    }

    const sorted = [...result];
    const dir = sortDir === 'asc' ? 1 : -1;
    switch (sortBy) {
      case 'date':
        sorted.sort((a, b) => dir * (a.dueDate || 'z').localeCompare(b.dueDate || 'z'));
        break;
      case 'status': {
        const orderMap = new Map(statuses.map(s => [s.id, s.order]));
        sorted.sort((a, b) =>
          dir * ((orderMap.get(a.status) ?? 99) - (orderMap.get(b.status) ?? 99)) ||
          a.order - b.order,
        );
        break;
      }
      case 'project':
        sorted.sort((a, b) => dir * (a.project || 'z').localeCompare(b.project || 'z'));
        break;
    }

    return sorted;
  }, [tasks, search, sortBy, sortDir, statuses, projectFilter, filterStatuses, filterProjects, filterDueDate, projects]);

  // Group tasks by status for board view
  const tasksByStatus = useMemo(() => {
    const map = new Map<string, Task[]>();
    statuses.forEach(s => map.set(s.id, []));
    filtered.forEach(t => {
      const bucket = map.get(t.status);
      if (bucket) bucket.push(t);
      else map.set(t.status, [t]);
    });
    return map;
  }, [filtered, statuses]);

  // Group tasks for list view
  const taskGroups = useMemo((): { label: string; tasks: Task[] }[] | null => {
    if (!groupBy) return null;

    if (sortBy === 'status') {
      const ordered = sortDir === 'asc' ? statuses : [...statuses].reverse();
      return ordered
        .map(s => ({ label: s.title, tasks: filtered.filter(t => t.status === s.id) }))
        .filter(g => g.tasks.length > 0);
    }

    if (sortBy === 'project') {
      const map = new Map<string, Task[]>();
      filtered.forEach(t => {
        const proj = projects.find(p => p.id === t.project || p.name === t.project);
        const key = proj?.name ?? 'No Project';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(t);
      });
      return Array.from(map.entries()).map(([label, tasks]) => ({ label, tasks }));
    }

    if (sortBy === 'date') {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const buckets: { label: string; tasks: Task[] }[] = [
        { label: 'Overdue', tasks: [] },
        { label: 'Today', tasks: [] },
        { label: 'Upcoming', tasks: [] },
        { label: 'No Date', tasks: [] },
      ];
      filtered.forEach(t => {
        if (!t.dueDate) { buckets[3]?.tasks.push(t); return; }
        const d = new Date(t.dueDate); d.setHours(0, 0, 0, 0);
        if (d < today) buckets[0]?.tasks.push(t);
        else if (d.getTime() === today.getTime()) buckets[1]?.tasks.push(t);
        else buckets[2]?.tasks.push(t);
      });
      return buckets.filter(b => b.tasks.length > 0);
    }

    return null;
  }, [filtered, groupBy, sortBy, sortDir, statuses, projects]);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        if (view === 'list') setInlineCreating(true);
        else handleAddTask();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const handleAddTask = useCallback(
    (statusId?: string) => {
      const firstStatus = statusId || statuses[0]?.id || 'explore';
      onTaskCreate({
        title: 'New Task',
        status: firstStatus,
        description: '',
        tags: [],
        dueDate: '',
        assignees: [],
        order: filtered.length,
        project: projectFilter || undefined,
      });
      toast.success('Task created');
    },
    [statuses, onTaskCreate, filtered.length, projectFilter],
  );

  const handleTaskUpdate = useCallback(
    (id: string, updates: Partial<Task>) => {
      if (id === '__duplicate__') {
        onTaskCreate(updates);
        toast.success('Task duplicated');
        return;
      }
      onTaskUpdate(id, updates);
    },
    [onTaskUpdate, onTaskCreate],
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleBulkDelete = useCallback(() => {
    selectedIds.forEach(id => onTaskDelete(id));
    toast.success(`Deleted ${selectedIds.size} task${selectedIds.size > 1 ? 's' : ''}`);
    setSelectedIds(new Set());
  }, [selectedIds, onTaskDelete]);

  const handleBulkStatus = useCallback((statusId: string) => {
    selectedIds.forEach(id => onTaskUpdate(id, { status: statusId }));
    toast.success(`Updated ${selectedIds.size} task${selectedIds.size > 1 ? 's' : ''}`);
    setSelectedIds(new Set());
  }, [selectedIds, onTaskUpdate]);

  const handleBulkProject = useCallback((projectName: string | null) => {
    selectedIds.forEach(id => onTaskUpdate(id, { project: projectName ?? undefined }));
    toast.success(`Moved ${selectedIds.size} task${selectedIds.size > 1 ? 's' : ''}`);
    setSelectedIds(new Set());
  }, [selectedIds, onTaskUpdate]);

  const handleSelectAll = useCallback(() => {
    const allSelected = filtered.length > 0 && filtered.every(t => selectedIds.has(t.id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(t => t.id)));
    }
  }, [filtered, selectedIds]);

  const handleBulkMarkDone = useCallback(() => {
    const doneStatus = statuses.find(s => s.isDone);
    if (!doneStatus) return;
    const allDone = [...selectedIds].every(id => {
      const t = tasks.find(t => t.id === id);
      return t && statuses.find(s => s.id === t.status)?.isDone;
    });
    const targetStatus = allDone ? (statuses.find(s => !s.isDone)?.id ?? statuses[0]?.id) : doneStatus.id;
    if (!targetStatus) return;
    selectedIds.forEach(id => onTaskUpdate(id, { status: targetStatus }));
    setSelectedIds(new Set());
  }, [selectedIds, tasks, statuses, onTaskUpdate]);

  // --- DnD handlers ---
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find(t => t.id === active.id);
    if (!activeTask) return;

    const overId = over.id as string;

    // Dropping over a column droppable
    if (statuses.some(s => s.id === overId)) {
      if (activeTask.status !== overId) {
        onTaskUpdate(activeTask.id, { status: overId });
      }
      return;
    }

    // Dropping over another task
    const overTask = tasks.find(t => t.id === overId);
    if (overTask && activeTask.status !== overTask.status) {
      onTaskUpdate(activeTask.id, { status: overTask.status });
    }
  }, [tasks, statuses, onTaskUpdate]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeTask = tasks.find(t => t.id === active.id);
    const overTask = tasks.find(t => t.id === over.id);
    if (!activeTask) return;

    if (overTask && activeTask.status === overTask.status) {
      const columnTasks = tasks
        .filter(t => t.status === activeTask.status)
        .sort((a, b) => a.order - b.order);
      const oldIdx = columnTasks.findIndex(t => t.id === active.id);
      const newIdx = columnTasks.findIndex(t => t.id === over.id);
      if (oldIdx !== -1 && newIdx !== -1) {
        const reordered = arrayMove(columnTasks, oldIdx, newIdx);
        reordered.forEach((t, i) => {
          if (t.order !== i) onTaskUpdate(t.id, { order: i });
        });
      }
    }
  }, [tasks, onTaskUpdate]);

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  const hasSelection = selectedIds.size > 0;

  // --- Render ---
  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-border/40 px-3 py-2">
        {/* View toggle — always visible */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => { setView('list'); localStorage.setItem('hierarch-task-view', 'list'); }}
              className={cn(
                'rounded-md p-1.5 transition-colors',
                view === 'list' ? 'text-foreground' : 'text-muted-foreground/50 hover:text-muted-foreground',
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>List view</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => { setView('board'); localStorage.setItem('hierarch-task-view', 'board'); }}
              className={cn(
                'rounded-md p-1.5 transition-colors',
                view === 'board' ? 'text-foreground' : 'text-muted-foreground/50 hover:text-muted-foreground',
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Board view</TooltipContent>
        </Tooltip>

        <div className="mx-1 h-4 w-px bg-border/50 shrink-0" />

        {/* Animated center zone — bulk bar or normal bar */}
        <div className="flex flex-1 items-center overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            {hasSelection ? (
              <motion.div
                key="bulk"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
                className="flex flex-1 items-center gap-1"
              >
                {/* Count */}
                <span className="shrink-0 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                  {selectedIds.size} selected
                </span>

                <div className="mx-1 h-4 w-px bg-border/50 shrink-0" />

                {/* Mark done / undone */}
                <button
                  onClick={handleBulkMarkDone}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark done
                </button>

                {/* Change status */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                      <Circle className="h-3.5 w-3.5" />
                      Status
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel>Set status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {statuses.map(s => (
                      <DropdownMenuItem key={s.id} onClick={() => handleBulkStatus(s.id)}>
                        <div className={cn('mr-2 h-2 w-2 rounded-full', s.color)} />
                        {s.title}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Move to project */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                      <FolderKanban className="h-3.5 w-3.5" />
                      Project
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel>Move to project</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleBulkProject(null)}>
                      <span className="text-muted-foreground">No project</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {projects.map(p => (
                      <DropdownMenuItem key={p.id} onClick={() => handleBulkProject(p.name)}>
                        {p.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="mx-1 h-4 w-px bg-border/50 shrink-0" />

                {/* Delete */}
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>

                {/* Clear — pushed right */}
                <button
                  onClick={clearSelection}
                  className="ml-auto flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="normal"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.12 }}
                className="flex flex-1 items-center gap-1"
              >
                {/* Search */}
                <div className="relative min-w-[160px] max-w-xs flex-1">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search…"
                    className="h-7 border-0 bg-muted/40 pl-8 text-sm shadow-none focus-visible:ring-0 focus-visible:bg-muted/70 transition-colors placeholder:text-muted-foreground/40"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Sort */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={cn(
                      'flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors',
                      sortBy !== 'status' || sortDir !== 'asc'
                        ? 'text-foreground font-medium'
                        : 'text-muted-foreground/60 hover:text-muted-foreground',
                    )}>
                      <ArrowUpDown className="h-3.5 w-3.5" />
                      Sort
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem checked={sortBy === 'date'} onCheckedChange={() => setSortBy('date')}>
                      Due Date
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={sortBy === 'status'} onCheckedChange={() => setSortBy('status')}>
                      Status
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={sortBy === 'project'} onCheckedChange={() => setSortBy('project')}>
                      Project
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Direction</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem checked={sortDir === 'asc'} onCheckedChange={() => setSortDir('asc')}>
                      <ArrowUp className="mr-2 h-3 w-3" />
                      Ascending
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={sortDir === 'desc'} onCheckedChange={() => setSortDir('desc')}>
                      <ArrowDown className="mr-2 h-3 w-3" />
                      Descending
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={groupBy}
                      onCheckedChange={(v) => setGroupBy(!!v)}
                      onSelect={e => e.preventDefault()}
                    >
                      Group
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Filter */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={cn(
                      'flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors',
                      filterStatuses.length > 0 || filterProjects.length > 0 || filterDueDate.length > 0
                        ? 'text-foreground font-medium'
                        : 'text-muted-foreground/60 hover:text-muted-foreground',
                    )}>
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      Filter
                      {(filterStatuses.length + filterProjects.length + filterDueDate.length) > 0 && (
                        <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary leading-none">
                          {filterStatuses.length + filterProjects.length + filterDueDate.length}
                        </span>
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {statuses.map(s => (
                      <DropdownMenuCheckboxItem
                        key={s.id}
                        checked={filterStatuses.includes(s.id)}
                        onCheckedChange={v => setFilterStatuses(prev => v ? [...prev, s.id] : prev.filter(x => x !== s.id))}
                        onSelect={e => e.preventDefault()}
                      >
                        <div className={cn('mr-2 h-2 w-2 rounded-full shrink-0', s.color)} />
                        {s.title}
                      </DropdownMenuCheckboxItem>
                    ))}
                    {!projectFilter && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Project</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {projects.map(p => (
                          <DropdownMenuCheckboxItem
                            key={p.id}
                            checked={filterProjects.includes(p.id)}
                            onCheckedChange={v => setFilterProjects(prev => v ? [...prev, p.id] : prev.filter(x => x !== p.id))}
                            onSelect={e => e.preventDefault()}
                          >
                            {p.name}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Due Date</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {[
                      { id: 'overdue', label: 'Overdue' },
                      { id: 'today', label: 'Today' },
                      { id: 'this_week', label: 'This week' },
                      { id: 'no_date', label: 'No date' },
                    ].map(opt => (
                      <DropdownMenuCheckboxItem
                        key={opt.id}
                        checked={filterDueDate.includes(opt.id)}
                        onCheckedChange={v => setFilterDueDate(prev => v ? [...prev, opt.id] : prev.filter(x => x !== opt.id))}
                        onSelect={e => e.preventDefault()}
                      >
                        {opt.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                    {(filterStatuses.length > 0 || filterProjects.length > 0 || filterDueDate.length > 0) && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-muted-foreground text-xs"
                          onClick={() => { setFilterStatuses([]); setFilterProjects([]); setFilterDueDate([]); }}
                        >
                          Clear all filters
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right tools — always visible */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="rounded-md p-1.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                onClick={() => setStatusManagerOpen(true)}
              >
                <Settings2 className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Manage phases</TooltipContent>
          </Tooltip>

          {view === 'list' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="rounded-md p-1.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  onClick={() => setColumnManagerOpen(true)}
                >
                  <Columns3 className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Manage columns</TooltipContent>
            </Tooltip>
          )}

          <div className="mx-1 h-4 w-px bg-border/50" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" className="h-7 gap-1.5 text-xs bg-[#bf7535] hover:bg-[#bf7535]/90" onClick={() => onNewTask ? onNewTask() : handleAddTask()}>
                <Plus className="h-3.5 w-3.5" />
                Add Task
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              New task <kbd className="ml-1 rounded border bg-muted px-1 text-[10px]">Ctrl+N</kbd>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {view === 'board' ? (
            <BoardView
              tasks={filtered}
              tasksByStatus={tasksByStatus}
              statuses={statuses.filter(s => s.visible !== false)}
              projects={projects}
              onUpdate={handleTaskUpdate}
              onDelete={onTaskDelete}
              onClick={onTaskClick}
              onAddTask={handleAddTask}
            />
          ) : (
            <ListView
              tasks={filtered}
              taskGroups={taskGroups}
              projects={projects}
              statuses={statuses}
              selectedIds={selectedIds}
              onSelect={toggleSelect}
              onSelectAll={handleSelectAll}
              onUpdate={handleTaskUpdate}
              onDelete={onTaskDelete}
              onClick={onTaskClick}
              onStartFocus={onStartFocus}
              onCreateNote={onCreateNote}
              focusTaskId={focusTaskId}
              columns={listColumns}
              inlineCreating={inlineCreating}
              onStartInline={() => setInlineCreating(true)}
              onInlineSave={(title) => {
                onTaskCreate({
                  title,
                  status: statuses[0]?.id || 'explore',
                  description: '',
                  tags: [],
                  dueDate: '',
                  assignees: [],
                  order: filtered.length,
                  project: projectFilter || undefined,
                });
              }}
              onInlineCancel={() => setInlineCreating(false)}
            />
          )}

          <DragOverlay>
            {activeTask && (
              <div className="rotate-3 opacity-90">
                <TaskCard
                  task={activeTask}
                  projects={projects}
                  statuses={statuses}
                  onUpdate={handleTaskUpdate}
                  onDelete={onTaskDelete}
                  onClick={onTaskClick}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Dialogs */}
      <StatusManager
        statuses={statuses}
        onChange={onStatusesChange}
        open={statusManagerOpen}
        onOpenChange={setStatusManagerOpen}
      />
      <ColumnManager
        columns={listColumns}
        onChange={setListColumns}
        open={columnManagerOpen}
        onOpenChange={setColumnManagerOpen}
      />
    </div>
  );
}

/* ─── Board View ─── */

interface BoardViewProps {
  tasks: Task[];
  tasksByStatus: Map<string, Task[]>;
  statuses: StatusConfig[];
  projects: Project[];
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onClick: (task: Task) => void;
  onAddTask: (statusId: string) => void;
}

function KanbanColumn({
  status,
  columnTasks,
  projects,
  statuses,
  onUpdate,
  onDelete,
  onClick,
  onAddTask,
}: {
  status: StatusConfig;
  columnTasks: Task[];
  projects: Project[];
  statuses: StatusConfig[];
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onClick: (task: Task) => void;
  onAddTask: (statusId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id });

  return (
    <div className={cn(
      'flex w-[280px] shrink-0 flex-col rounded-xl transition-colors',
      isOver ? 'bg-muted/50' : 'bg-muted/30',
    )}>
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className={cn('h-2.5 w-2.5 rounded-full', status.color)} />
        <span className="text-sm font-medium">{status.title}</span>
        <span className={cn('ml-auto text-xs font-medium', status.countColor)}>
          {columnTasks.length}
        </span>
      </div>

      {/* Droppable + sortable area */}
      <SortableContext
        items={columnTasks.map(t => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <ScrollArea className="flex-1 px-2">
          <div ref={setNodeRef} className="min-h-[80px] space-y-2 pb-2">
            <AnimatePresence initial={false}>
              {columnTasks.map(task => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  <TaskCard
                    task={task}
                    projects={projects}
                    statuses={statuses}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onClick={onClick}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {columnTasks.length === 0 && (
              <div className="flex h-20 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
                Drop tasks here
              </div>
            )}
          </div>
        </ScrollArea>
      </SortableContext>

      {/* Add task */}
      <button
        onClick={() => onAddTask(status.id)}
        className="mx-2 mb-2 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
        Add task
      </button>
    </div>
  );
}

function BoardView({
  tasksByStatus,
  statuses,
  projects,
  onUpdate,
  onDelete,
  onClick,
  onAddTask,
}: BoardViewProps) {
  return (
    <div className="h-full overflow-x-auto">
      <div className="flex h-full min-w-max gap-4 p-4">
        {statuses.map(status => (
          <KanbanColumn
            key={status.id}
            status={status}
            columnTasks={tasksByStatus.get(status.id) ?? []}
            projects={projects}
            statuses={statuses}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onClick={onClick}
            onAddTask={onAddTask}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── List View ─── */

interface ListViewProps {
  tasks: Task[];
  taskGroups: { label: string; tasks: Task[] }[] | null;
  projects: Project[];
  statuses: StatusConfig[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onClick: (task: Task) => void;
  onStartFocus?: (task: Task) => void;
  onCreateNote?: (task: Task) => void;
  focusTaskId?: string | null;
  columns: { id: string; title: string; visible: boolean; width: number }[];
  inlineCreating: boolean;
  onStartInline: () => void;
  onInlineSave: (title: string) => void;
  onInlineCancel: () => void;
}

function ListView({
  tasks,
  taskGroups,
  projects,
  statuses,
  selectedIds,
  onSelect,
  onSelectAll,
  onUpdate,
  onDelete,
  onClick,
  onStartFocus,
  onCreateNote,
  focusTaskId,
  columns,
  inlineCreating,
  onStartInline,
  onInlineSave,
  onInlineCancel,
}: ListViewProps) {
  const { widths, columnTemplate, onResizeStart } = useColumnWidths();

  const allSelected = tasks.length > 0 && tasks.every(t => selectedIds.has(t.id));
  const someSelected = !allSelected && tasks.some(t => selectedIds.has(t.id));

  const renderRows = (items: Task[]) => (
    <SortableContext items={items.map(t => t.id)} strategy={verticalListSortingStrategy}>
      <AnimatePresence initial={false}>
        {items.map(task => (
          <motion.div
            key={task.id}
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.12 }}
          >
            <TaskRow
              task={task}
              projects={projects}
              statuses={statuses}
              isSelected={selectedIds.has(task.id)}
              anySelected={selectedIds.size > 0}
              onSelect={onSelect}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onClick={onClick}
              onStartFocus={onStartFocus}
              onCreateNote={onCreateNote}
              focusTaskId={focusTaskId}
              columnTemplate={columnTemplate}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </SortableContext>
  );

  return (
    <ScrollArea className="h-full">
      <div className="min-w-[600px]">
        {/* Header */}
        <div
          style={{ gridTemplateColumns: columnTemplate }}
          className="grid items-center border-b bg-muted/30 py-1.5 text-xs font-medium text-muted-foreground select-none"
        >
          <div className="flex items-center justify-center px-2">
            <Checkbox
              checked={someSelected ? 'indeterminate' : allSelected}
              onCheckedChange={onSelectAll}
              className="h-3.5 w-3.5"
            />
          </div>
          <div className="relative px-3">
            Task
            <div onMouseDown={onResizeStart('title', widths.title)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-border rounded" />
          </div>
          <div className="relative px-2">
            Project
            <div onMouseDown={onResizeStart('project', widths.project)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-border rounded" />
          </div>
          <div className="relative px-2">
            Due Date
          </div>
          <div /> {/* more menu col */}
        </div>

        {/* Rows */}
        {taskGroups ? (
          taskGroups.map(({ label, tasks: groupTasks }) => (
            <div key={label}>
              <div className="flex items-center gap-2 border-b bg-muted/20 px-4 py-1.5">
                <span className="text-xs font-semibold">{label}</span>
                <Badge variant="secondary" className="text-[10px]">{groupTasks.length}</Badge>
              </div>
              {renderRows(groupTasks)}
            </div>
          ))
        ) : (
          renderRows(tasks)
        )}

        {tasks.length === 0 && !inlineCreating && (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
            <p className="text-sm">No tasks yet</p>
          </div>
        )}

        {/* Inline creation row */}
        {inlineCreating && (
          <InlineTaskRow
            onSave={onInlineSave}
            onCancel={onInlineCancel}
            columnTemplate={columnTemplate}
          />
        )}

        {/* Add a task affordance */}
        {!inlineCreating && (
          <button
            onClick={onStartInline}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-xs text-muted-foreground/30 hover:text-muted-foreground/70 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Add a task…
          </button>
        )}
      </div>
    </ScrollArea>
  );
}

/* ─── Inline Task Row ─── */

function InlineTaskRow({
  onSave,
  onCancel,
  columnTemplate,
}: {
  onSave: (title: string) => void;
  onCancel: () => void;
  columnTemplate: string;
}) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div
      style={{ gridTemplateColumns: columnTemplate }}
      className="grid items-center border-b border-border/40 py-1.5"
    >
      <div /> {/* select col */}
      <div className="px-3">
        <input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (value.trim()) {
                onSave(value.trim());
                setValue('');
              }
            } else if (e.key === 'Escape') {
              onCancel();
            }
          }}
          onBlur={() => {
            if (value.trim()) onSave(value.trim());
            onCancel();
          }}
          placeholder="Task name…"
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/40"
        />
      </div>
      <div /> {/* project col */}
      <div /> {/* due col */}
      <div /> {/* more col */}
    </div>
  );
}
