'use client';

import { useMemo, useRef, useCallback, type ReactNode } from 'react';
import { cn } from '@/app/lib/utils';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Checkbox } from '@/app/components/ui/checkbox';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, X, ArrowUpDown, ArrowUp, ArrowDown, SlidersHorizontal,
  List, LayoutGrid,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuTrigger, DropdownMenuCheckboxItem,
  DropdownMenuSeparator, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger,
  DropdownMenuItem,
} from '@/app/components/ui/dropdown-menu';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/app/components/ui/tooltip';
import { useResizableColumns } from '@/app/hooks/use-resizable-columns';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ViewMode = 'list' | 'grid';

export interface ColumnDef {
  id: string;
  title: string;
  defaultWidth: number;
  resizable?: boolean;
}

export interface SortOption {
  id: string;
  label: string;
}

export interface GroupOption {
  id: string;
  label: string;
}

export interface DataTableGroup<T> {
  label: string;
  items: T[];
}

export interface DataTableProps<T> {
  /** localStorage key prefix for persisting column widths + view state */
  storageKey: string;
  /** Optional title shown between view toggle and center zone (e.g. project name) */
  title?: string;

  // ─── View mode ─────────────────────────────────────────────────────────
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  /** Grid view label for the tooltip. Defaults to "Grid view". */
  gridLabel?: string;
  /** Content rendered when viewMode is 'grid'. */
  renderGrid?: () => ReactNode;

  // ─── Columns (list view) ───────────────────────────────────────────────
  columns: ColumnDef[];
  /** Fixed-width trailing column (e.g. actions). Omit to skip. */
  trailingWidth?: number;

  // ─── Selection ─────────────────────────────────────────────────────────
  /** Set of selected item keys. Pass to enable selection checkboxes. */
  selectedKeys?: Set<string>;
  onSelectToggle?: (key: string) => void;
  onSelectAll?: () => void;
  /** Deselects all items. Used by the bulk bar Clear button. */
  onClearSelection?: () => void;
  /** Content shown in the bulk action bar when items are selected. */
  bulkActions?: ReactNode;

  // ─── Data ──────────────────────────────────────────────────────────────
  items: T[];
  groups?: DataTableGroup<T>[] | null;
  getKey: (item: T) => string;
  renderRow: (item: T, columnTemplate: string) => ReactNode;

  // ─── Search ────────────────────────────────────────────────────────────
  search: string;
  onSearchChange: (v: string) => void;

  // ─── Sort ──────────────────────────────────────────────────────────────
  sortOptions: SortOption[];
  sortBy: string;
  onSortByChange: (id: string) => void;
  sortDir: 'asc' | 'desc';
  onSortDirChange: (dir: 'asc' | 'desc') => void;

  // ─── Group ─────────────────────────────────────────────────────────────
  groupOptions?: GroupOption[];
  groupBy?: string;
  onGroupByChange?: (id: string) => void;

  // ─── Filter ────────────────────────────────────────────────────────────
  filterContent?: ReactNode;
  hasActiveFilters?: boolean;
  activeFilterCount?: number;

  // ─── Empty states ──────────────────────────────────────────────────────
  emptyMessage?: string;
  filteredEmptyMessage?: string;
  emptyContent?: ReactNode;

  // ─── Toolbar slots ─────────────────────────────────────────────────────
  /** Elements rendered at the right of the toolbar (always visible). */
  toolbarRight?: ReactNode;
  minWidth?: number;
}

const SELECT_COL_WIDTH = 40;

// ─── Component ──────────────────────────────────────────────────────────────

export function DataTable<T>({
  storageKey,
  title,
  viewMode,
  onViewModeChange,
  gridLabel = 'Grid view',
  renderGrid,
  columns,
  trailingWidth = 52,
  selectedKeys,
  onSelectToggle,
  onSelectAll,
  onClearSelection,
  bulkActions,
  items,
  groups,
  getKey,
  renderRow,
  search,
  onSearchChange,
  sortOptions,
  sortBy,
  onSortByChange,
  sortDir,
  onSortDirChange,
  groupOptions,
  groupBy = 'none',
  onGroupByChange,
  filterContent,
  hasActiveFilters = false,
  activeFilterCount = 0,
  emptyMessage = 'No items yet',
  filteredEmptyMessage = 'No items match your filters',
  emptyContent,
  toolbarRight,
  minWidth = 600,
}: DataTableProps<T>) {
  const hasSelectionEnabled = selectedKeys !== undefined;
  const hasActiveSelection = hasSelectionEnabled && selectedKeys!.size > 0;
  const tableRef = useRef<HTMLDivElement>(null);

  // ─── Resizable columns ────────────────────────────────────────────────

  const defaults = useMemo(() => {
    const d: Record<string, number> = {};
    for (const col of columns) d[col.id] = col.defaultWidth;
    return d;
  }, [columns]);

  const { widths, onResizeStart } = useResizableColumns(storageKey, defaults);

  const getMaxWidth = useCallback(
    (colId: string) => {
      const container = tableRef.current;
      if (!container) return undefined;
      const containerWidth = container.clientWidth;

      let fixedTotal = 0;
      if (hasSelectionEnabled) fixedTotal += SELECT_COL_WIDTH;
      if (trailingWidth > 0) fixedTotal += trailingWidth;

      let othersTotal = 0;
      for (const col of columns) {
        if (col.id === colId) continue;
        othersTotal += widths[col.id] ?? col.defaultWidth;
      }

      return Math.max(60, containerWidth - fixedTotal - othersTotal);
    },
    [columns, widths, hasSelectionEnabled, trailingWidth],
  );

  const columnTemplate = useMemo(() => {
    const parts: string[] = [];
    if (hasSelectionEnabled) parts.push(`${SELECT_COL_WIDTH}px`);
    for (const col of columns) parts.push(`${widths[col.id] ?? col.defaultWidth}px`);
    if (trailingWidth > 0) parts.push(`${trailingWidth}px`);
    return parts.join(' ');
  }, [columns, widths, trailingWidth, hasSelectionEnabled]);

  const isFiltered = search.trim() !== '' || hasActiveFilters;
  const isSortNonDefault = sortBy !== sortOptions[0]?.id || sortDir !== 'asc';

  // ─── Selection helpers ────────────────────────────────────────────────

  const allKeys = useMemo(() => {
    const allItems = groups ? groups.flatMap(g => g.items) : items;
    return allItems.map(getKey);
  }, [items, groups, getKey]);

  const allSelected = hasSelectionEnabled && allKeys.length > 0 && allKeys.every(k => selectedKeys!.has(k));
  const someSelected = hasSelectionEnabled && !allSelected && allKeys.some(k => selectedKeys!.has(k));

  // ─── Row rendering helpers ────────────────────────────────────────────

  const renderRows = (rowItems: T[]) => (
    <AnimatePresence initial={false}>
      {rowItems.map(item => (
        <motion.div
          key={getKey(item)}
          layout
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.12 }}
        >
          {renderRow(item, columnTemplate)}
        </motion.div>
      ))}
    </AnimatePresence>
  );

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full" ref={tableRef}>
      {/* Toolbar — hidden when showing custom empty content */}
      {items.length === 0 && !isFiltered && emptyContent ? null : <div className="flex items-center gap-1 border-b border-border/40 px-3 py-2">
        {/* View toggle — always far left */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onViewModeChange('list')}
              className={cn(
                'rounded-md p-1.5 transition-colors',
                viewMode === 'list' ? 'text-foreground' : 'text-muted-foreground/50 hover:text-muted-foreground',
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
              onClick={() => onViewModeChange('grid')}
              className={cn(
                'rounded-md p-1.5 transition-colors',
                viewMode === 'grid' ? 'text-foreground' : 'text-muted-foreground/50 hover:text-muted-foreground',
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{gridLabel}</TooltipContent>
        </Tooltip>

        <div className="mx-1 h-4 w-px bg-border/50 shrink-0" />

        {/* Optional title */}
        {title && (
          <>
            <span className="shrink-0 text-sm font-semibold truncate max-w-[200px]">{title}</span>
            <div className="mx-1 h-4 w-px bg-border/50 shrink-0" />
          </>
        )}

        {/* Animated center zone — bulk bar or normal bar */}
        <div className="flex flex-1 items-center overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            {hasActiveSelection ? (
              <motion.div
                key="bulk"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
                className="flex flex-1 items-center gap-1"
              >
                <span className="shrink-0 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                  {selectedKeys!.size} selected
                </span>

                <div className="mx-1 h-4 w-px bg-border/50 shrink-0" />

                {bulkActions}

                <button
                  onClick={onClearSelection}
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
                    onChange={e => onSearchChange(e.target.value)}
                    placeholder="Search…"
                    className="h-7 border-0 bg-muted/40 pl-8 text-sm shadow-none focus-visible:ring-0 focus-visible:bg-muted/70 transition-colors placeholder:text-muted-foreground/40"
                  />
                  {search && (
                    <button
                      onClick={() => onSearchChange('')}
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
                      isSortNonDefault
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
                    {sortOptions.map(opt => (
                      <DropdownMenuCheckboxItem
                        key={opt.id}
                        checked={sortBy === opt.id}
                        onCheckedChange={() => onSortByChange(opt.id)}
                      >
                        {opt.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Direction</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={sortDir === 'asc'}
                      onCheckedChange={() => onSortDirChange('asc')}
                    >
                      <ArrowUp className="mr-2 h-3 w-3" />
                      Ascending
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={sortDir === 'desc'}
                      onCheckedChange={() => onSortDirChange('desc')}
                    >
                      <ArrowDown className="mr-2 h-3 w-3" />
                      Descending
                    </DropdownMenuCheckboxItem>
                    {groupOptions && onGroupByChange && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem
                          checked={groupBy !== 'none'}
                          onCheckedChange={(v) => onGroupByChange(v ? (groupOptions[0]?.id ?? 'none') : 'none')}
                          onSelect={e => e.preventDefault()}
                        >
                          Group
                        </DropdownMenuCheckboxItem>
                        {groupBy !== 'none' && (
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="pl-6">
                              {groupOptions.find(o => o.id === groupBy)?.label ?? 'Group by'}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {groupOptions.map(opt => (
                                <DropdownMenuCheckboxItem
                                  key={opt.id}
                                  checked={groupBy === opt.id}
                                  onCheckedChange={() => onGroupByChange(opt.id)}
                                >
                                  {opt.label}
                                </DropdownMenuCheckboxItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        )}
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Filter */}
                {filterContent && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className={cn(
                        'flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors',
                        hasActiveFilters
                          ? 'text-foreground font-medium'
                          : 'text-muted-foreground/60 hover:text-muted-foreground',
                      )}>
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        Filter
                        {activeFilterCount > 0 && (
                          <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary leading-none">
                            {activeFilterCount}
                          </span>
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      {filterContent}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right tools — always visible */}
        {toolbarRight && (
          <div className="flex items-center gap-0.5 shrink-0">
            <div className="mx-1 h-4 w-px bg-border/50" />
            {toolbarRight}
          </div>
        )}
      </div>}

      {/* Content */}
      {viewMode === 'grid' && renderGrid ? (
        <div className="flex-1 overflow-auto">
          {renderGrid()}
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div style={{ minWidth }}>
            {/* Column header — hidden when showing custom empty content */}
            {items.length === 0 && !isFiltered && emptyContent ? null : <div
              style={{ gridTemplateColumns: columnTemplate }}
              className="grid items-center border-b bg-muted/30 py-1.5 text-xs font-medium text-muted-foreground select-none"
            >
              {hasSelectionEnabled && (
                <div className="flex items-center justify-center px-2">
                  <Checkbox
                    checked={someSelected ? 'indeterminate' : allSelected}
                    onCheckedChange={() => onSelectAll?.()}
                    className="h-3.5 w-3.5"
                  />
                </div>
              )}

              {columns.map(col => (
                <div key={col.id} className="relative px-3">
                  {col.title}
                  {col.resizable !== false && (
                    <div
                      onMouseDown={onResizeStart(col.id, widths[col.id] ?? col.defaultWidth, getMaxWidth(col.id))}
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-border rounded"
                    />
                  )}
                </div>
              ))}
              {trailingWidth > 0 && <div />}
            </div>}

            {/* Rows */}
            {items.length === 0 && !groups ? (
              !isFiltered && emptyContent ? emptyContent : (
                <div className="flex flex-col items-center pt-16 pb-8">
                  <h3 className="text-lg font-semibold text-foreground mb-1.5">
                    {isFiltered ? filteredEmptyMessage : emptyMessage}
                  </h3>
                  {!isFiltered && (
                    <p className="text-[13px] text-muted-foreground/70 leading-relaxed max-w-[280px] text-center">
                      Items will appear here once you start adding them.
                    </p>
                  )}
                </div>
              )
            ) : groups ? (
              groups.map(({ label, items: groupItems }) => (
                <div key={label}>
                  <div className="flex items-center gap-2 border-b bg-muted/20 px-4 py-1.5">
                    <span className="text-xs font-semibold">{label}</span>
                    <Badge variant="secondary" className="text-[10px]">{groupItems.length}</Badge>
                  </div>
                  {renderRows(groupItems)}
                </div>
              ))
            ) : (
              renderRows(items)
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
