'use client';

import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/app/lib/utils';
import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import {
  Plus, Trash2, X,
  FileText, MessageSquare, FlaskConical, PenLine,
  Link2, Figma, Play, Image, Video, FileCode,
  MoreHorizontal,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem,
} from '@/app/components/ui/dropdown-menu';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/app/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import type { Project } from '@/app/types';
import type { Artifact, ArtifactType } from '@/app/components/NoteDrawer';
import { DataTable } from '@/app/components/DataTable';
import type { DataTableGroup, ViewMode } from '@/app/components/DataTable';
import { usePersistedState } from '@/app/hooks/use-persisted-state';

// ─── Type metadata ──────────────────────────────────────────────────────────

export const ARTIFACT_TYPE_ICONS: Record<string, React.ElementType> = {
  freeform: FileText,
  decision: PenLine,
  feedback: MessageSquare,
  research: FlaskConical,
  link: Link2,
  figma: Figma,
  prototype: Play,
  screenshot: Image,
  video: Video,
  doc: FileCode,
};

export const ARTIFACT_TYPE_COLORS: Record<string, string> = {
  freeform: 'text-blue-700 dark:text-blue-400',
  decision: 'text-amber-700 dark:text-amber-400',
  feedback: 'text-emerald-700 dark:text-emerald-400',
  research: 'text-violet-700 dark:text-violet-400',
  link: 'text-sky-700 dark:text-sky-400',
  figma: 'text-pink-700 dark:text-pink-400',
  prototype: 'text-orange-700 dark:text-orange-400',
  screenshot: 'text-teal-700 dark:text-teal-400',
  video: 'text-red-700 dark:text-red-400',
  doc: 'text-slate-600 dark:text-slate-400',
};

export const ARTIFACT_TYPE_BG_COLORS: Record<string, string> = {
  freeform: 'bg-blue-400/10',
  decision: 'bg-amber-400/10',
  feedback: 'bg-emerald-400/10',
  research: 'bg-violet-400/10',
  link: 'bg-sky-400/10',
  figma: 'bg-pink-400/10',
  prototype: 'bg-orange-400/10',
  screenshot: 'bg-teal-400/10',
  video: 'bg-red-400/10',
  doc: 'bg-slate-400/10',
};

export const ARTIFACT_TYPE_LABELS: Record<string, string> = {
  freeform: 'Note',
  decision: 'Decision',
  feedback: 'Feedback',
  research: 'Research',
  link: 'Link',
  figma: 'Figma',
  prototype: 'Prototype',
  screenshot: 'Screenshot',
  video: 'Video',
  doc: 'Doc',
};

const ALL_TYPES: ArtifactType[] = [
  'freeform', 'decision', 'feedback', 'research',
  'link', 'figma', 'prototype', 'screenshot', 'video', 'doc',
];

// ─── Sort / Group types ─────────────────────────────────────────────────────

type SortKey = 'updated' | 'title' | 'type' | 'project';
type GroupKey = 'type' | 'project' | 'none';

// ─── Component ──────────────────────────────────────────────────────────────

interface ArtifactsViewProps {
  artifacts: Artifact[];
  projects: Project[];
  onArtifactCreate: (projectId: string) => void;
  onArtifactClick: (artifact: Artifact) => void;
  onArtifactDelete: (id: string) => void;
}

export function ArtifactsView({
  artifacts,
  projects,
  onArtifactCreate,
  onArtifactClick,
  onArtifactDelete,
}: ArtifactsViewProps) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = usePersistedState<SortKey>('hierarch-artifacts-sort', 'updated');
  const [sortDir, setSortDir] = usePersistedState<'asc' | 'desc'>('hierarch-artifacts-dir', 'desc');
  const [groupBy, setGroupBy] = usePersistedState<GroupKey>('hierarch-artifacts-group', 'none');
  const [viewMode, setViewMode] = usePersistedState<ViewMode>('hierarch-artifacts-view', 'list');
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterProjects, setFilterProjects] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const getProjectName = (projectId?: string) => {
    if (!projectId) return null;
    return projects.find(p => p.id === projectId || p.name === projectId)?.name ?? null;
  };

  // ─── Filter ─────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = [...artifacts];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        a => a.title.toLowerCase().includes(q) || a.text.toLowerCase().includes(q)
      );
    }

    if (filterTypes.length > 0) {
      result = result.filter(a => filterTypes.includes(a.type));
    }

    if (filterProjects.length > 0) {
      result = result.filter(a => {
        if (!a.projectId) return filterProjects.includes('__none__');
        return filterProjects.includes(a.projectId);
      });
    }

    return result;
  }, [artifacts, search, filterTypes, filterProjects]);

  // ─── Sort ───────────────────────────────────────────────────────────────

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'updated':
          return dir * (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
        case 'title':
          return dir * (a.title || '').localeCompare(b.title || '');
        case 'type':
          return dir * a.type.localeCompare(b.type);
        case 'project': {
          const ap = getProjectName(a.projectId) || 'zzz';
          const bp = getProjectName(b.projectId) || 'zzz';
          return dir * ap.localeCompare(bp);
        }
        default:
          return 0;
      }
    });
  }, [filtered, sortBy, sortDir]);

  // ─── Group ──────────────────────────────────────────────────────────────

  const groups = useMemo<DataTableGroup<Artifact>[] | null>(() => {
    if (groupBy === 'none') return null;

    const map = new Map<string, Artifact[]>();

    if (groupBy === 'type') {
      for (const a of sorted) {
        const key = ARTIFACT_TYPE_LABELS[a.type] || a.type;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(a);
      }
    } else if (groupBy === 'project') {
      for (const a of sorted) {
        const key = getProjectName(a.projectId) || 'No Project';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(a);
      }
    }

    return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
  }, [sorted, groupBy]);

  const handleSelectAll = useCallback(() => {
    const allItems = groups ? groups.flatMap(g => g.items) : sorted;
    const allSelected = allItems.length > 0 && allItems.every(a => selectedIds.has(a.id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allItems.map(a => a.id)));
    }
  }, [sorted, groups, selectedIds]);

  // ─── Filter helpers ─────────────────────────────────────────────────────

  const toggleFilterType = (type: string) => {
    setFilterTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleFilterProject = (id: string) => {
    setFilterProjects(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const hasActiveFilters = filterTypes.length > 0 || filterProjects.length > 0;

  const clearFilters = () => {
    setFilterTypes([]);
    setFilterProjects([]);
  };

  const usedTypes = useMemo(() => {
    const s = new Set(artifacts.map(a => a.type));
    return ALL_TYPES.filter(t => s.has(t));
  }, [artifacts]);

  // ─── Row renderer (list view) ─────────────────────────────────────────

  const renderRow = (artifact: Artifact, columnTemplate: string) => {
    const TypeIcon = ARTIFACT_TYPE_ICONS[artifact.type] || FileText;
    const typeColor = ARTIFACT_TYPE_COLORS[artifact.type] || 'text-muted-foreground';
    const projectName = getProjectName(artifact.projectId);

    return (
      <div
        onClick={() => onArtifactClick(artifact)}
        style={{ gridTemplateColumns: columnTemplate }}
        className={cn(
          'group grid cursor-pointer items-center',
          'border-b border-border/50 transition-colors',
          'hover:bg-accent/50',
        )}
      >
        {/* Select */}
        <div className="flex items-center justify-center px-2" onClick={e => e.stopPropagation()}>
          <Checkbox
            checked={selectedIds.has(artifact.id)}
            onCheckedChange={() => toggleSelect(artifact.id)}
            className="h-3.5 w-3.5"
          />
        </div>

        {/* Title */}
        <div className="min-w-0 px-3 py-2 flex items-center gap-2.5">
          <TypeIcon className={cn('h-4 w-4 shrink-0', typeColor)} />
          <span className="font-medium text-sm text-foreground truncate">
            {artifact.title || 'Untitled'}
          </span>
        </div>

        {/* Type */}
        <div className="min-w-0 px-2 py-2">
          <span className={cn('text-xs', typeColor)}>
            {ARTIFACT_TYPE_LABELS[artifact.type] || artifact.type}
          </span>
        </div>

        {/* Project */}
        <div className="min-w-0 px-2 py-2 overflow-hidden">
          {projectName ? (
            <span className="text-xs text-muted-foreground truncate">{projectName}</span>
          ) : (
            <span className="text-xs text-muted-foreground/40">&mdash;</span>
          )}
        </div>

        {/* Updated */}
        <div className="px-2 py-2">
          <span className="text-xs text-muted-foreground/60 whitespace-nowrap">
            {formatDistanceToNow(new Date(artifact.updatedAt), { addSuffix: true })}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center" onClick={e => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-6 w-6 items-center justify-center rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:bg-accent hover:text-foreground transition-all focus:opacity-100">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => { onArtifactDelete(artifact.id); toast.success('Artifact deleted'); }}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  // ─── Grid view (cards) ────────────────────────────────────────────────

  const renderGrid = () => {
    const itemsToRender = groups
      ? groups.flatMap(g => g.items)
      : sorted;

    if (itemsToRender.length === 0) {
      return (
        <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
          <p className="text-sm">
            {search || hasActiveFilters ? 'No artifacts match your filters' : 'No artifacts yet'}
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3 p-4">
        {itemsToRender.map(artifact => {
          const TypeIcon = ARTIFACT_TYPE_ICONS[artifact.type] || FileText;
          const typeColor = ARTIFACT_TYPE_COLORS[artifact.type] || 'text-muted-foreground';
          const bgColor = ARTIFACT_TYPE_BG_COLORS[artifact.type] || 'bg-muted/10';
          const projectName = getProjectName(artifact.projectId);

          return (
            <div
              key={artifact.id}
              onClick={() => onArtifactClick(artifact)}
              className={cn(
                'group relative flex flex-col gap-3 rounded-xl border border-border/50 p-4 cursor-pointer',
                'transition-colors hover:bg-accent/50 hover:border-border',
              )}
            >
              {/* Type icon + badge */}
              <div className="flex items-start justify-between">
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', bgColor)}>
                  <TypeIcon className={cn('h-4 w-4', typeColor)} />
                </div>
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex h-6 w-6 items-center justify-center rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:bg-accent hover:text-foreground transition-all focus:opacity-100">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => { onArtifactDelete(artifact.id); toast.success('Artifact deleted'); }}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Title */}
              <div className="min-w-0">
                <p className="font-medium text-sm text-foreground truncate">
                  {artifact.title || 'Untitled'}
                </p>
                {artifact.text && (
                  <p className="mt-0.5 text-xs text-muted-foreground/60 line-clamp-2">
                    {artifact.text.replace(/<[^>]+>/g, '').slice(0, 120)}
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-auto pt-1">
                <span className={cn('text-[11px] font-medium', typeColor)}>
                  {ARTIFACT_TYPE_LABELS[artifact.type]}
                </span>
                <div className="flex items-center gap-2">
                  {projectName && (
                    <span className="text-[11px] text-muted-foreground/50 truncate max-w-[100px]">
                      {projectName}
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground/40">
                    {formatDistanceToNow(new Date(artifact.updatedAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ─── Filter dropdown content ───────────────────────────────────────────

  const filterContent = (
    <>
      <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wide">Type</div>
      {usedTypes.map(type => {
        const Icon = ARTIFACT_TYPE_ICONS[type];
        const color = ARTIFACT_TYPE_COLORS[type];
        return (
          <DropdownMenuCheckboxItem
            key={type}
            checked={filterTypes.includes(type)}
            onCheckedChange={() => toggleFilterType(type)}
          >
            {Icon && <Icon className={cn('mr-2 h-3.5 w-3.5', color)} />}
            {ARTIFACT_TYPE_LABELS[type]}
          </DropdownMenuCheckboxItem>
        );
      })}
      <DropdownMenuSeparator />
      <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wide">Project</div>
      {projects.filter(p => p.metadata?.type !== 'section').map(project => (
        <DropdownMenuCheckboxItem
          key={project.id}
          checked={filterProjects.includes(project.id)}
          onCheckedChange={() => toggleFilterProject(project.id)}
        >
          {project.name}
        </DropdownMenuCheckboxItem>
      ))}
      <DropdownMenuCheckboxItem
        checked={filterProjects.includes('__none__')}
        onCheckedChange={() => toggleFilterProject('__none__')}
      >
        <span className="text-muted-foreground/60">No project</span>
      </DropdownMenuCheckboxItem>
      {hasActiveFilters && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={clearFilters}>
            <X className="mr-2 h-3.5 w-3.5" /> Clear all filters
          </DropdownMenuItem>
        </>
      )}
    </>
  );

  // ─── Render ────────────────────────────────────────────────────────────

  const handleBulkDelete = useCallback(() => {
    selectedIds.forEach(id => onArtifactDelete(id));
    toast.success(`Deleted ${selectedIds.size} artifact${selectedIds.size > 1 ? 's' : ''}`);
    setSelectedIds(new Set());
  }, [selectedIds, onArtifactDelete]);

  return (
    <DataTable<Artifact>
      storageKey="hierarch-artifact-col-widths"
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      gridLabel="Card view"
      renderGrid={renderGrid}
      columns={[
        { id: 'title', title: 'Title', defaultWidth: 320 },
        { id: 'type', title: 'Type', defaultWidth: 100 },
        { id: 'project', title: 'Project', defaultWidth: 160 },
        { id: 'updated', title: 'Updated', defaultWidth: 120, resizable: false },
      ]}
      trailingWidth={52}
      selectedKeys={selectedIds}
      onSelectToggle={toggleSelect}
      onSelectAll={handleSelectAll}
      onClearSelection={clearSelection}
      bulkActions={
        <button
          onClick={handleBulkDelete}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      }
      items={sorted}
      groups={groups}
      getKey={a => a.id}
      renderRow={renderRow}
      search={search}
      onSearchChange={setSearch}
      sortOptions={[
        { id: 'updated', label: 'Updated' },
        { id: 'title', label: 'Title' },
        { id: 'type', label: 'Type' },
        { id: 'project', label: 'Project' },
      ]}
      sortBy={sortBy}
      onSortByChange={id => setSortBy(id as SortKey)}
      sortDir={sortDir}
      onSortDirChange={setSortDir}
      groupOptions={[
        { id: 'type', label: 'Type' },
        { id: 'project', label: 'Project' },
      ]}
      groupBy={groupBy}
      onGroupByChange={id => setGroupBy(id as GroupKey)}
      filterContent={filterContent}
      hasActiveFilters={hasActiveFilters}
      activeFilterCount={filterTypes.length + filterProjects.length}
      emptyMessage="No artifacts yet"
      filteredEmptyMessage="No artifacts match your filters"
      toolbarRight={
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" className="h-7 gap-1.5 text-xs bg-[#bf7535] hover:bg-[#bf7535]/90" onClick={() => onArtifactCreate('')}>
              <Plus className="h-3.5 w-3.5" />
              Add Artifact
            </Button>
          </TooltipTrigger>
          <TooltipContent>New artifact</TooltipContent>
        </Tooltip>
      }
    />
  );
}
