'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

import { cn } from '@/app/lib/utils';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger,
} from '@/app/components/ui/context-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/app/components/ui/tooltip';
import {
  Compass, ListTodo, Plus, MoreHorizontal, Pencil, Copy, Trash2,
  ChevronDown, LogOut, Settings, User, Moon, Sun, X, BarChart2, StickyNote,
  SquarePen, FolderPlus, CheckSquare, Layers, FolderKanban,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTheme } from '@/app/components/ThemeProvider';
import { IconPicker, getIconComponent } from '@/app/components/IconPicker';
import type { Project, ProjectMetadata } from '@/app/types';
import { toast } from 'sonner';

interface SidebarProps {
  projects: Project[];
  activeView: string;
  onViewChange: (view: string) => void;
  todayCount: number;
  allTasksCount: number;
  pinnedVersion: number;
  user: { email?: string; user_metadata?: { name?: string; avatar_url?: string } } | null;
  onLogout: () => void;
  onShowOnboarding: () => void;
  onNewTask: () => void;
  isMobile?: boolean;
  onClose?: () => void;
}

// Kept for future use (sortable project list in sidebar)
export function SortableProjectItem({
  project,
  isActive,
  onSelect,
  onRename,
  onDuplicate,
  onDelete,
}: {
  project: Project;
  isActive: boolean;
  onSelect: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = getIconComponent(project.metadata?.icon);

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <ContextMenu>
        <ContextMenuTrigger>
          <motion.button
            {...listeners}
            whileTap={{ scale: 0.98 }}
            onClick={onSelect}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors cursor-grab active:cursor-grabbing',
              isActive
                ? 'bg-accent text-foreground font-medium'
                : 'text-foreground/60 hover:bg-accent/60 hover:text-foreground',
              isDragging && 'opacity-50'
            )}
          >
            <Icon className="h-4 w-4 shrink-0 text-foreground/50" />
            <span className="flex-1 truncate text-left">{project.name}</span>
          </motion.button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={onRename}>
            <Pencil className="mr-2 h-3.5 w-3.5" /> Rename
          </ContextMenuItem>
          <ContextMenuItem onClick={onDuplicate}>
            <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}

function NavItem({
  icon,
  label,
  count,
  isActive,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  isActive?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-accent text-foreground font-medium'
          : 'text-foreground/60 hover:bg-accent/60 hover:text-foreground'
      )}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {count !== undefined && count > 0 && (
        <span className={cn(
          'text-xs font-medium tabular-nums',
          isActive ? 'text-foreground/70' : 'text-muted-foreground/60'
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

export function Sidebar({
  projects,
  activeView,
  onViewChange,
  todayCount,
  allTasksCount,
  pinnedVersion,
  user,
  onLogout,
  onShowOnboarding,
  onNewTask,
  isMobile,
  onClose,
}: SidebarProps) {
  const { resolvedTheme, setTheme } = useTheme();

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const avatarUrl = user?.user_metadata?.avatar_url;
  const initials = userName.slice(0, 2).toUpperCase();

  // Read pinned projects from localStorage (re-reads when pinnedVersion changes)
  const pinnedIds: string[] = (() => {
    try {
      const raw = localStorage.getItem('hierarch-pinned-projects');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  })();
  // Force dependency on pinnedVersion so this recalculates
  void pinnedVersion;
  const pinnedProjects = pinnedIds
    .map(id => projects.find(p => p.id === id))
    .filter((p): p is Project => !!p);

  const sidebarContent = (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full w-60 flex-col" style={{ backgroundColor: '#262624' }}>
        {/* Header: logo + create */}
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="flex flex-1 items-center">
            <img src="/logo.svg" className="h-5 w-5 opacity-50" alt="Hierarch" />
          </div>

          {/* Create new */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground">
                <SquarePen className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => { onNewTask(); onClose?.(); }}>
                <CheckSquare className="mr-2 h-4 w-4" /> New Task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { onViewChange('projects'); onClose?.(); }}>
                <FolderPlus className="mr-2 h-4 w-4" /> New Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {isMobile && (
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Primary nav */}
        <div className="px-3 space-y-1 flex-1">
          <NavItem
            icon={<Compass className="h-4 w-4 shrink-0" />}
            label="Overview"
            isActive={activeView === 'today'}
            onClick={() => { onViewChange('today'); onClose?.(); }}
          />
          <NavItem
            icon={<ListTodo className="h-4 w-4 shrink-0" />}
            label="All Tasks"
            count={allTasksCount}
            isActive={activeView === 'tasks'}
            onClick={() => { onViewChange('tasks'); onClose?.(); }}
          />
          <NavItem
            icon={<BarChart2 className="h-4 w-4 shrink-0" />}
            label="Capacity"
            isActive={activeView === 'capacity'}
            onClick={() => { onViewChange('capacity'); onClose?.(); }}
          />
          <NavItem
            icon={<StickyNote className="h-4 w-4 shrink-0" />}
            label="Notes"
            isActive={activeView === 'attachments'}
            onClick={() => { onViewChange('attachments'); onClose?.(); }}
          />
          <NavItem
            icon={<FolderKanban className="h-4 w-4 shrink-0" />}
            label="Projects"
            isActive={activeView === 'projects' || activeView.startsWith('project:')}
            onClick={() => { onViewChange('projects'); onClose?.(); }}
          />
          <NavItem
            icon={<Layers className="h-4 w-4 shrink-0" />}
            label="Linear"
            isActive={activeView === 'linear'}
            onClick={() => { onViewChange('linear'); onClose?.(); }}
          />

          {/* Pinned projects */}
          {pinnedProjects.length > 0 && (
            <>
              <div className="mt-4 mb-1 px-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40">
                  Pinned
                </span>
              </div>
              {pinnedProjects.map(project => {
                const Icon = getIconComponent(project.metadata?.icon);
                const viewKey = `project:${project.name}`;
                return (
                  <button
                    key={project.id}
                    onClick={() => { onViewChange(viewKey); onClose?.(); }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                      activeView === viewKey
                        ? 'bg-accent text-foreground font-medium'
                        : 'text-foreground/60 hover:bg-accent/60 hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-foreground/50" />
                    <span className="flex-1 text-left truncate">{project.name}</span>
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Account footer */}
        <div className="px-3 py-3 border-t border-border/40">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2 rounded-md px-2 py-2 hover:bg-accent/60 transition-colors min-w-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                    {initials}
                  </div>
                )}
                <span className="flex-1 truncate text-left text-sm font-semibold text-foreground">
                  {userName}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-52">
              <DropdownMenuItem onClick={() => { onViewChange('account'); onClose?.(); }}>
                <User className="mr-2 h-4 w-4" /> Account
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { onViewChange('settings'); onClose?.(); }}>
                <Settings className="mr-2 h-4 w-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
                {resolvedTheme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                {resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TooltipProvider>
  );

  if (isMobile) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ x: -256 }}
          animate={{ x: 0 }}
          exit={{ x: -256 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed inset-0 z-50 flex"
        >
          <div className="w-60 h-full shadow-2xl">{sidebarContent}</div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 bg-black/50"
            onClick={onClose}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className="hidden md:flex shrink-0 h-full">
      {sidebarContent}
    </div>
  );
}
