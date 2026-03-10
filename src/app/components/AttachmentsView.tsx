'use client';

import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/app/lib/utils';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Checkbox } from '@/app/components/ui/checkbox';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/app/components/ui/dropdown-menu';
import {
  Search,
  Plus,
  ArrowUpDown,
  FileX,
  FileText,
  Link2,
  Users,
  X,
  Trash2,
  MoreHorizontal,
  Pencil,
  ExternalLink,
  Pin,
} from 'lucide-react';
import { Search as SearchIcon } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { Resource, ResourceType, Project } from '@/app/types';
import { DocumentResourceDrawer } from '@/app/components/DocumentResourceDrawer';

type FilterType = 'all' | ResourceType;
type SortKey = 'date' | 'title' | 'type';

const TYPE_ICONS: Record<ResourceType, React.ElementType> = {
  'Project Note': FileText,
  Link: Link2,
  Research: SearchIcon,
  'Meeting Note': Users,
};

const TYPE_COLORS: Record<ResourceType, string> = {
  'Project Note': 'text-blue-400',
  Link: 'text-emerald-400',
  Research: 'text-amber-400',
  'Meeting Note': 'text-violet-400',
};

const FILTER_OPTIONS: { label: string; value: FilterType; icon: React.ElementType }[] = [
  { label: 'All', value: 'all', icon: FileText },
  { label: 'Project Note', value: 'Project Note', icon: FileText },
  { label: 'Meeting Note', value: 'Meeting Note', icon: Users },
  { label: 'Research', value: 'Research', icon: SearchIcon },
  { label: 'Link', value: 'Link', icon: Link2 },
];

interface AttachmentsViewProps {
  resources: Resource[];
  projects: Project[];
  onResourceCreate: (resource: Partial<Resource>) => void;
  onResourceUpdate: (id: string, updates: Partial<Resource>) => void;
  onResourceDelete: (id: string) => void;
}

export function AttachmentsView({
  resources,
  projects,
  onResourceCreate,
  onResourceUpdate,
  onResourceDelete,
}: AttachmentsViewProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | undefined>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let result = resources;

    if (filter !== 'all') {
      result = result.filter((r) => r.type === filter);
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.content?.toLowerCase().includes(q) ||
          r.url?.toLowerCase().includes(q),
      );
    }

    const sorted = [...result];
    switch (sortBy) {
      case 'date':
        sorted.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        break;
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'type':
        sorted.sort((a, b) => a.type.localeCompare(b.type));
        break;
    }

    return sorted;
  }, [resources, search, filter, sortBy]);

  // ─── Selection ───
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allSelected = filtered.length > 0 && filtered.every(r => selectedIds.has(r.id));
  const someSelected = !allSelected && filtered.some(r => selectedIds.has(r.id));

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(r => r.id)));
    }
  }, [filtered, allSelected]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleBulkDelete = useCallback(() => {
    selectedIds.forEach(id => onResourceDelete(id));
    toast.success(`Deleted ${selectedIds.size} resource${selectedIds.size > 1 ? 's' : ''}`);
    setSelectedIds(new Set());
  }, [selectedIds, onResourceDelete]);

  // ─── CRUD ───
  const handleEdit = useCallback((resource: Resource) => {
    setEditingResource(resource);
    setDrawerOpen(true);
  }, []);

  const handleCreate = useCallback(() => {
    setEditingResource(undefined);
    setDrawerOpen(true);
  }, []);

  const handleSave = useCallback(
    (data: Partial<Resource>) => {
      if (data.id) {
        const { id, ...updates } = data;
        onResourceUpdate(id, updates);
        toast.success('Resource updated');
      } else {
        onResourceCreate(data);
        toast.success('Resource created');
      }
    },
    [onResourceCreate, onResourceUpdate],
  );

  const handleDelete = useCallback(
    (id: string) => {
      onResourceDelete(id);
      toast.success('Resource deleted');
    },
    [onResourceDelete],
  );

  const columnTemplate = '40px 1fr 120px 100px 120px 40px';

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border/40 px-4 py-3">
        <h2 className="text-sm font-semibold">Resources</h2>

        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resources..."
            className="h-8 pl-8 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Filter */}
        <div className="flex rounded-lg border border-border/40 bg-muted/50 p-0.5">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={cn(
                'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                filter === opt.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5" />
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={sortBy === 'date'}
              onCheckedChange={() => setSortBy('date')}
            >
              Date
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={sortBy === 'title'}
              onCheckedChange={() => setSortBy('title')}
            >
              Title
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={sortBy === 'type'}
              onCheckedChange={() => setSortBy('type')}
            >
              Type
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-auto flex items-center gap-2">
          {/* Bulk actions */}
          {selectedIds.size > 0 && (
            <>
              <span className="text-xs text-muted-foreground">
                {selectedIds.size} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                onClick={handleBulkDelete}
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={clearSelection}
              >
                Clear
              </Button>
            </>
          )}

          <Button
            size="sm"
            className="h-8 gap-1.5 bg-[#bf7535] hover:bg-[#bf7535]/90"
            onClick={handleCreate}
          >
            <Plus className="h-3.5 w-3.5" />
            New Resource
          </Button>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <div className="rounded-full bg-muted p-4">
            <FileX className="h-8 w-8" />
          </div>
          <p className="text-sm font-medium">No resources found</p>
          <p className="text-xs">
            {search || filter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Create your first resource to get started'}
          </p>
          {!search && filter === 'all' && (
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={handleCreate}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Create Resource
            </Button>
          )}
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="min-w-[600px]">
            {/* Column header */}
            <div
              style={{ gridTemplateColumns: columnTemplate }}
              className="grid items-center border-b border-border/40 bg-muted/30 py-1.5 text-xs font-medium text-muted-foreground select-none"
            >
              <div className="flex items-center justify-center px-2">
                <Checkbox
                  checked={someSelected ? 'indeterminate' : allSelected}
                  onCheckedChange={handleSelectAll}
                  className="h-3.5 w-3.5"
                />
              </div>
              <div className="px-3">Title</div>
              <div className="px-2">Type</div>
              <div className="px-2">Project</div>
              <div className="px-2">Date</div>
              <div />
            </div>

            {/* Rows */}
            {filtered.map((resource) => {
              const isSelected = selectedIds.has(resource.id);
              const TypeIcon = TYPE_ICONS[resource.type] || FileText;
              const typeColor = TYPE_COLORS[resource.type] || 'text-muted-foreground';
              const project = resource.projectId
                ? projects.find(p => p.id === resource.projectId || p.name === resource.projectId)
                : undefined;

              return (
                <div
                  key={resource.id}
                  style={{ gridTemplateColumns: columnTemplate }}
                  className={cn(
                    'grid items-center border-b border-border/30 py-2 text-sm transition-colors hover:bg-accent/30',
                    isSelected && 'bg-accent/20',
                  )}
                >
                  {/* Checkbox */}
                  <div className="flex items-center justify-center px-2">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(resource.id)}
                      className="h-3.5 w-3.5"
                    />
                  </div>

                  {/* Title */}
                  <button
                    className="flex items-center gap-2 px-3 text-left min-w-0"
                    onClick={() => handleEdit(resource)}
                  >
                    {resource.pinned && (
                      <Pin className="h-3 w-3 text-primary/50 shrink-0" />
                    )}
                    <span className="text-xs font-medium text-foreground truncate">
                      {resource.title || 'Untitled'}
                    </span>
                    {resource.url && (
                      <ExternalLink className="h-3 w-3 text-muted-foreground/30 shrink-0" />
                    )}
                  </button>

                  {/* Type */}
                  <div className="flex items-center gap-1.5 px-2">
                    <TypeIcon className={cn('h-3 w-3 shrink-0', typeColor)} />
                    <span className="text-[11px] text-muted-foreground truncate">
                      {resource.type}
                    </span>
                  </div>

                  {/* Project */}
                  <div className="px-2">
                    {project ? (
                      <span className="text-[11px] text-muted-foreground truncate block">
                        {project.name}
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/30">—</span>
                    )}
                  </div>

                  {/* Date */}
                  <div className="px-2">
                    <span className="text-[11px] text-muted-foreground/50">
                      {format(new Date(resource.createdAt), 'MMM d, yyyy')}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 rounded text-muted-foreground/30 hover:text-muted-foreground transition-colors">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onClick={() => handleEdit(resource)}>
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          Edit
                        </DropdownMenuItem>
                        {resource.url && (
                          <DropdownMenuItem
                            onClick={() => window.open(resource.url, '_blank')}
                          >
                            <ExternalLink className="mr-2 h-3.5 w-3.5" />
                            Open Link
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(resource.id)}
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Drawer */}
      <DocumentResourceDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        resource={editingResource}
        projects={projects}
        onSave={handleSave}
      />
    </div>
  );
}
