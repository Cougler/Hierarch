'use client';

import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/app/lib/utils';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
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
} from 'lucide-react';
import { Search as SearchIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import type { Resource, ResourceType, Project } from '@/app/types';
import { ResourceCard } from '@/app/components/ResourceCard';
import { DocumentResourceDrawer } from '@/app/components/DocumentResourceDrawer';

type FilterType = 'all' | ResourceType;
type SortKey = 'date' | 'title';

interface AttachmentsViewProps {
  resources: Resource[];
  projects: Project[];
  onResourceCreate: (resource: Partial<Resource>) => void;
  onResourceUpdate: (id: string, updates: Partial<Resource>) => void;
  onResourceDelete: (id: string) => void;
}

const FILTER_OPTIONS: { label: string; value: FilterType; icon: React.ElementType }[] = [
  { label: 'All', value: 'all', icon: FileText },
  { label: 'Project Note', value: 'Project Note', icon: FileText },
  { label: 'Meeting Note', value: 'Meeting Note', icon: Users },
  { label: 'Research', value: 'Research', icon: SearchIcon },
  { label: 'Link', value: 'Link', icon: Link2 },
];

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
    }

    return sorted;
  }, [resources, search, filter, sortBy]);

  const handleEdit = useCallback((resource: Resource) => {
    setEditingResource(resource);
    setDrawerOpen(true);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      onResourceDelete(id);
      toast.success('Resource deleted');
    },
    [onResourceDelete],
  );

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

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <h2 className="text-lg font-semibold">Resources</h2>

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
        <div className="flex rounded-lg border bg-muted/50 p-0.5">
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
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-auto">
          <Button size="sm" className="h-8 gap-1.5" onClick={handleCreate}>
            <Plus className="h-3.5 w-3.5" />
            New Resource
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4">
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence initial={false}>
              {filtered.map((resource) => (
                <motion.div
                  key={resource.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  <ResourceCard
                    resource={resource}
                    size="md"
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

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
