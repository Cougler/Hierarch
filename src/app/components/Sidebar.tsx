'use client';

import { useState, useRef, useEffect } from 'react';
import { useLinearToken } from '@/app/hooks/use-linear-token';
import { useFigmaToken } from '@/app/hooks/use-figma-token';
import { useJiraToken } from '@/app/hooks/use-jira-token';
import { useFigmaUnread } from '@/app/hooks/use-figma-unread';
import { Figma } from 'lucide-react';

import { cn } from '@/app/lib/utils';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger,
} from '@/app/components/ui/context-menu';
import {
  Compass, ListTodo, Plus, Pencil, Copy, Trash2,
  ChevronDown, LogOut, Settings, User, Moon, Sun, X, BarChart2,
  SquarePen, CheckSquare, Gem, Plug, FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '@/app/components/ThemeProvider';
import { getIconComponent } from '@/app/components/IconPicker';
import type { Project, ProjectMetadata } from '@/app/types';
import { toast } from 'sonner';

interface SidebarProps {
  projects: Project[];
  activeView: string;
  onViewChange: (view: string) => void;
  todayCount: number;
  allTasksCount: number;
  user: { email?: string; user_metadata?: { name?: string; avatar_url?: string } } | null;
  onLogout: () => void;
  onShowOnboarding: () => void;
  onNewTask: () => void;
  onNewArtifact?: () => void;
  onProjectCreate: (name: string, metadata?: ProjectMetadata) => void;
  onProjectUpdate: (id: string, updates: Partial<Project>) => void;
  onProjectDelete: (id: string) => void;
  isMobile?: boolean;
  onClose?: () => void;
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
        'flex w-full items-center gap-3 rounded-md pl-1.5 pr-3 py-1.5 text-[13px] transition-colors',
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
  user,
  onLogout,
  onShowOnboarding,
  onNewTask,
  onNewArtifact,
  onProjectCreate,
  onProjectUpdate,
  onProjectDelete,
  isMobile,
  onClose,
}: SidebarProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameRef = useRef<HTMLInputElement>(null);

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const avatarUrl = user?.user_metadata?.avatar_url;
  const initials = userName.slice(0, 2).toUpperCase();

  const realProjects = projects.filter(p => p.metadata?.type !== 'section');
  const { isConnected: hasLinear } = useLinearToken();
  const { isConnected: hasFigma } = useFigmaToken();
  const { isConnected: hasJira } = useJiraToken();
  const figmaUnread = useFigmaUnread();
  const hasAnyIntegration = hasLinear || hasFigma || hasJira;

  useEffect(() => {
    if (renameTarget) {
      setTimeout(() => {
        renameRef.current?.focus();
        renameRef.current?.select();
      }, 50);
    }
  }, [renameTarget]);

  const handleNewProject = () => {
    const name = 'Untitled Project';
    onProjectCreate(name);
    // Navigate after a tick so the project exists in state — use name lookup,
    // App.tsx will resolve it to project ID
    setTimeout(() => {
      onViewChange(`project:${name}`);
      onClose?.();
    }, 50);
  };

  const handleRenameSubmit = () => {
    if (renameTarget && renameValue.trim()) {
      onProjectUpdate(renameTarget, { name: renameValue.trim() });
      toast.success('Project renamed');
    }
    setRenameTarget(null);
  };

  const sidebarContent = (
    <div className="flex h-full w-60 flex-col bg-shell">
      {/* Header: logo + create */}
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex flex-1 items-center">
          <img src="/logo.svg" className="h-5 w-5" alt="Hierarch" />
        </div>

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
            {onNewArtifact && (
              <DropdownMenuItem onClick={() => { onNewArtifact(); onClose?.(); }}>
                <FileText className="mr-2 h-4 w-4" /> New Artifact
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleNewProject}>
              <Plus className="mr-2 h-4 w-4" /> New Project
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
      <div className="px-3 space-y-1">
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
          icon={<Gem className="h-4 w-4 shrink-0" />}
          label="Artifacts"
          isActive={activeView === 'artifacts'}
          onClick={() => { onViewChange('artifacts'); onClose?.(); }}
        />
        <NavItem
          icon={<BarChart2 className="h-4 w-4 shrink-0" />}
          label="Capacity"
          isActive={activeView === 'capacity'}
          onClick={() => { onViewChange('capacity'); onClose?.(); }}
        />
      </div>

      {/* Projects section */}
      <div className="px-3 mt-5">
        <div className="flex items-center justify-between mb-1 px-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40">
            Projects
          </span>
          <button
            onClick={handleNewProject}
            className="text-foreground/30 hover:text-foreground/60 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="space-y-0.5">
          {realProjects.map(project => {
            const Icon = getIconComponent(project.metadata?.icon);
            const viewKey = `project:${project.id}`;
            const isRenaming = renameTarget === project.id;

            if (isRenaming) {
              return (
                <div key={project.id} className="flex items-center gap-2 px-3 py-1.5">
                  <Icon className="h-4 w-4 shrink-0 text-foreground/50" />
                  <Input
                    ref={renameRef}
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRenameSubmit();
                      if (e.key === 'Escape') setRenameTarget(null);
                    }}
                    onBlur={handleRenameSubmit}
                    className="h-6 text-sm bg-surface border-border px-1.5 py-0"
                  />
                </div>
              );
            }

            return (
              <ContextMenu key={project.id}>
                <ContextMenuTrigger>
                  <button
                    onClick={() => { onViewChange(viewKey); onClose?.(); }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md pl-1.5 pr-3 py-1.5 text-sm transition-colors',
                      activeView === viewKey
                        ? 'bg-accent text-foreground font-medium'
                        : 'text-foreground/60 hover:bg-accent/60 hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-foreground/50" />
                    <span className="flex-1 text-left truncate text-[13px]">{project.name}</span>
                  </button>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => { setRenameTarget(project.id); setRenameValue(project.name); }}>
                    <Pencil className="mr-2 h-3.5 w-3.5" /> Rename
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => onProjectCreate(`${project.name} (copy)`, project.metadata)}>
                    <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => onProjectDelete(project.id)} className="text-destructive">
                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}

          {realProjects.length === 0 && (
            <div className="px-3 py-3 space-y-2">
              <p className="text-xs text-foreground/30">Your projects will appear here</p>
              <button
                onClick={handleNewProject}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                <Plus className="h-3 w-3" />
                Create a project
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Integrations section — only show when an integration is connected */}
      {hasAnyIntegration && (
        <div className="px-3 mt-5">
          <div className="flex items-center justify-between mb-1 px-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40">
              Integrations
            </span>
            <button
              onClick={() => { onViewChange('integrations'); onClose?.(); }}
              className="text-foreground/30 hover:text-foreground/60 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-0.5">
            {hasLinear && (
              <button
                onClick={() => { onViewChange('linear'); onClose?.(); }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md pl-1.5 pr-3 py-1.5 text-sm transition-colors',
                  activeView === 'linear'
                    ? 'bg-accent text-foreground font-medium'
                    : 'text-foreground/60 hover:bg-accent/60 hover:text-foreground'
                )}
              >
                <img src="/linear.svg" alt="Linear" className="h-3.5 w-3.5 shrink-0 opacity-50 invert-on-light" />
                <span className="flex-1 text-left">Linear</span>
              </button>
            )}
            {hasJira && (
              <button
                onClick={() => { onViewChange('jira'); onClose?.(); }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md pl-1.5 pr-3 py-1.5 text-sm transition-colors',
                  activeView === 'jira'
                    ? 'bg-accent text-foreground font-medium'
                    : 'text-foreground/60 hover:bg-accent/60 hover:text-foreground'
                )}
              >
                <svg className="h-3.5 w-3.5 shrink-0 opacity-50" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.35V2.84a.84.84 0 0 0-.84-.84H11.53ZM6.77 6.8a4.36 4.36 0 0 0 4.34 4.34h1.8v1.72a4.36 4.36 0 0 0 4.34 4.34V7.63a.84.84 0 0 0-.84-.84H6.77ZM2 11.6a4.35 4.35 0 0 0 4.35 4.35h1.78v1.7c0 2.4 1.95 4.35 4.35 4.35v-9.56a.84.84 0 0 0-.84-.84H2Z" />
                </svg>
                <span className="flex-1 text-left">Jira</span>
              </button>
            )}
            {hasFigma && (
              <button
                onClick={() => { onViewChange('figma'); onClose?.(); }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md pl-1.5 pr-3 py-1.5 text-sm transition-colors',
                  activeView === 'figma'
                    ? 'bg-accent text-foreground font-medium'
                    : 'text-foreground/60 hover:bg-accent/60 hover:text-foreground'
                )}
              >
                <Figma className="h-3.5 w-3.5 shrink-0 opacity-50" />
                <span className="flex-1 text-left">Figma</span>
                {figmaUnread > 0 && (
                  <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground leading-none">
                    {figmaUnread}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Integrations nav item — show when no integrations connected */}
      {!hasAnyIntegration && (
        <div className="px-3 pb-2">
          <NavItem
            icon={<Plug className="h-4 w-4 shrink-0" />}
            label="Integrations"
            isActive={activeView === 'integrations'}
            onClick={() => { onViewChange('integrations'); onClose?.(); }}
          />
        </div>
      )}

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
