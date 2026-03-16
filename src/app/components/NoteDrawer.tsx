'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/app/lib/utils';
import { Button } from '@/app/components/ui/button';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from '@/app/components/ui/drawer';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/app/components/ui/dialog';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/app/components/ui/popover';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import {
  Bold, Italic, List, ListOrdered, Heading1, Heading2, Heading3, Type, Trash2, X,
  ExternalLink, Figma, Loader2, Link as LinkIcon,
  FileText, MessageSquare, FlaskConical, PenLine,
  Link2, Play, Image, Video, FileCode,
  FolderKanban, CheckSquare, Search, ChevronDown, ArrowLeft,
} from 'lucide-react';
import { Input } from '@/app/components/ui/input';
import { format, isToday, isYesterday } from 'date-fns';
import { useIsMobile } from '@/app/hooks/use-mobile';
import type { Project, Task } from '@/app/types';

export interface Artifact {
  id: string
  title: string
  text: string
  type: ArtifactType
  url?: string
  projectId?: string
  taskId?: string
  timestamp: string
  updatedAt: string
}

/** @deprecated Use Artifact instead */
export type DesignNote = Artifact

export type ArtifactType = 'freeform' | 'decision' | 'feedback' | 'research' | 'link' | 'figma' | 'prototype' | 'screenshot' | 'video' | 'doc';

// ─── Type metadata ──────────────────────────────────────────────────────────

const TYPE_META: { id: ArtifactType; label: string; icon: React.ElementType; color: string; bg: string }[] = [
  { id: 'freeform', label: 'Freeform', icon: FileText, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  { id: 'decision', label: 'Decision', icon: PenLine, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  { id: 'research', label: 'Research', icon: FlaskConical, color: 'text-violet-400', bg: 'bg-violet-400/10' },
  { id: 'link', label: 'Link', icon: Link2, color: 'text-sky-400', bg: 'bg-sky-400/10' },
  { id: 'figma', label: 'Figma', icon: Figma, color: 'text-pink-400', bg: 'bg-pink-400/10' },
  { id: 'prototype', label: 'Prototype', icon: Play, color: 'text-orange-400', bg: 'bg-orange-400/10' },
  { id: 'screenshot', label: 'Screenshot', icon: Image, color: 'text-teal-400', bg: 'bg-teal-400/10' },
  { id: 'video', label: 'Video', icon: Video, color: 'text-red-400', bg: 'bg-red-400/10' },
  { id: 'doc', label: 'Doc', icon: FileCode, color: 'text-slate-400', bg: 'bg-slate-400/10' },
];

const getTypeMeta = (id: ArtifactType) => TYPE_META.find(t => t.id === id) ?? TYPE_META[0]!;

// ─── Props ──────────────────────────────────────────────────────────────────

interface NoteDrawerProps {
  note: Artifact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  tasks?: Task[];
  onUpdate: (id: string, updates: Partial<Artifact>) => void;
  onDelete: (id: string) => void;
  onBack?: () => void;
  embedded?: boolean;
}

// ─── Toolbar button ───

function ToolbarBtn({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={cn(
        'p-1.5 rounded-md transition-colors',
        active
          ? 'bg-accent text-foreground'
          : 'text-muted-foreground/60 hover:text-foreground hover:bg-accent/50',
      )}
    >
      {children}
    </button>
  );
}

// ─── Searchable picker popover ──────────────────────────────────────────────

function PickerPopover({
  open,
  onOpenChange,
  trigger,
  items,
  selectedId,
  onSelect,
  placeholder,
  emptyLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  items: { id: string; label: string; secondary?: string }[];
  selectedId?: string;
  onSelect: (id: string) => void;
  placeholder: string;
  emptyLabel: string;
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(i => i.label.toLowerCase().includes(q) || i.secondary?.toLowerCase().includes(q));
  }, [items, query]);

  // Reset query when popover opens
  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-[220px] p-0" sideOffset={4}>
        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/50" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={placeholder}
              autoFocus
              className="w-full bg-transparent pl-7 pr-2 py-1.5 text-xs outline-none placeholder:text-muted-foreground/40"
            />
          </div>
        </div>
        <div className="border-t border-border/30 max-h-[200px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-xs text-muted-foreground/40 text-center">{emptyLabel}</div>
          ) : (
            filtered.map(item => (
              <button
                key={item.id}
                onClick={() => { onSelect(item.id); onOpenChange(false); }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-accent/50',
                  selectedId === item.id ? 'text-foreground font-medium' : 'text-muted-foreground',
                )}
              >
                <span className="truncate">{item.label}</span>
                {item.secondary && (
                  <span className="ml-auto text-[10px] text-muted-foreground/40 truncate max-w-[80px]">{item.secondary}</span>
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function NoteDrawer({
  note,
  open,
  onOpenChange,
  projects,
  tasks = [],
  onUpdate,
  onDelete,
  onBack,
  embedded,
}: NoteDrawerProps) {
  const isMobile = useIsMobile();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [title, setTitle] = useState('');
  const [activeType, setActiveType] = useState<ArtifactType>('freeform');
  const [figmaUrl, setFigmaUrl] = useState('');
  const [figmaThumbnail, setFigmaThumbnail] = useState<string | null>(null);
  const [figmaLoading, setFigmaLoading] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isFigmaUrl = (url: string) =>
    /^https:\/\/(www\.)?figma\.com\/(file|design|proto|board)\//.test(url.trim());

  const fetchFigmaThumbnail = useCallback(async (url: string) => {
    if (!isFigmaUrl(url)) {
      setFigmaThumbnail(null);
      return;
    }
    setFigmaLoading(true);
    try {
      const res = await fetch(`https://www.figma.com/api/oembed?url=${encodeURIComponent(url)}`);
      if (res.ok) {
        const data = await res.json();
        setFigmaThumbnail(data.thumbnail_url || null);
      } else {
        setFigmaThumbnail(null);
      }
    } catch {
      setFigmaThumbnail(null);
    } finally {
      setFigmaLoading(false);
    }
  }, []);

  // Sync state when note changes
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setActiveType(note.type);
      setFigmaUrl(note.url || '');
      setFigmaThumbnail(null);
      if (note.type === 'figma' && note.url && isFigmaUrl(note.url)) {
        fetchFigmaThumbnail(note.url);
      }
      requestAnimationFrame(() => {
        if (editorRef.current && editorRef.current.innerHTML !== note.text) {
          editorRef.current.innerHTML = note.text;
        }
      });
    }
  }, [note?.id]);

  // Focus title on open for new notes
  useEffect(() => {
    if (open && note && !note.title) {
      requestAnimationFrame(() => titleRef.current?.focus());
    }
  }, [open, note?.id]);

  const saveContent = useCallback(() => {
    if (!note || !editorRef.current) return;
    const html = editorRef.current.innerHTML;
    if (html !== note.text) {
      onUpdate(note.id, { text: html, updatedAt: new Date().toISOString() });
    }
  }, [note, onUpdate]);

  const debouncedSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(saveContent, 500);
  }, [saveContent]);

  // Save on close
  useEffect(() => {
    if (!open) saveContent();
  }, [open]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (note) {
      onUpdate(note.id, { title: value, updatedAt: new Date().toISOString() });
    }
  };

  const handleTypeChange = (type: ArtifactType) => {
    setActiveType(type);
    if (note) {
      onUpdate(note.id, { type, updatedAt: new Date().toISOString() });
    }
  };

  const handleProjectChange = (projectId: string | undefined) => {
    if (note) {
      onUpdate(note.id, { projectId, updatedAt: new Date().toISOString() });
    }
  };

  const handleTaskChange = (taskId: string | undefined) => {
    if (note) {
      onUpdate(note.id, { taskId, updatedAt: new Date().toISOString() });
    }
  };

  const handleFigmaUrlChange = (url: string) => {
    setFigmaUrl(url);
    if (note) {
      onUpdate(note.id, { url, updatedAt: new Date().toISOString() });
    }
  };

  const handleFigmaUrlBlur = () => {
    if (figmaUrl && isFigmaUrl(figmaUrl)) {
      fetchFigmaThumbnail(figmaUrl);
    } else {
      setFigmaThumbnail(null);
    }
  };

  const handleDelete = () => {
    if (!note) return;
    onDelete(note.id);
    setConfirmDelete(false);
    onOpenChange(false);
  };

  // ─── Rich text commands ───
  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
    debouncedSave();
  };

  const [headingOpen, setHeadingOpen] = useState(false);

  const handleLink = () => {
    const selection = window.getSelection();
    const hasSelection = selection && selection.toString().length > 0;
    const url = prompt('Enter URL:', 'https://');
    if (!url) return;
    if (hasSelection) {
      exec('createLink', url);
    } else {
      exec('insertHTML', `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
    }
  };

  const formatTimestamp = (iso: string) => {
    const d = new Date(iso);
    if (isToday(d)) return `Today at ${format(d, 'h:mm a')}`;
    if (isYesterday(d)) return `Yesterday at ${format(d, 'h:mm a')}`;
    return format(d, 'MMM d, yyyy');
  };

  const project = note?.projectId
    ? projects.find(p => p.id === note.projectId || p.name === note.projectId)
    : undefined;

  const task = note?.taskId
    ? tasks.find(t => t.id === note.taskId)
    : undefined;

  const typeMeta = getTypeMeta(activeType);
  const TypeIcon = typeMeta.icon;

  // Task items for picker, optionally filtered by current project
  const taskItems = useMemo(() => {
    return tasks.map(t => {
      const proj = projects.find(p => p.id === t.project || p.name === t.project);
      return { id: t.id, label: t.title, secondary: proj?.name };
    });
  }, [tasks, projects]);

  const projectItems = useMemo(() => {
    return projects
      .filter(p => p.metadata?.type !== 'section')
      .map(p => ({ id: p.id, label: p.name }));
  }, [projects]);

  // ─── Content ───
  const content = note ? (
    <div key={note.id} className="flex flex-col h-full">
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-5 pb-5 pt-3 space-y-4 overflow-hidden">
          {/* Title */}
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                editorRef.current?.focus();
              }
            }}
            placeholder="Untitled artifact"
            className="w-full bg-transparent text-lg font-semibold text-foreground outline-none placeholder:text-muted-foreground/40"
          />

          {/* Type selector pill */}
          <Popover open={typeOpen} onOpenChange={setTypeOpen}>
            <PopoverTrigger asChild>
              <button className={cn(
                'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                typeMeta.bg, typeMeta.color,
                'hover:brightness-110',
              )}>
                <TypeIcon className="h-3 w-3" />
                {typeMeta.label}
                <ChevronDown className="h-2.5 w-2.5 opacity-60" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[240px] p-1.5" sideOffset={4}>
              <div className="grid grid-cols-2 gap-0.5">
                {TYPE_META.map(t => {
                  const Icon = t.icon;
                  const isActive = activeType === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => { handleTypeChange(t.id); setTypeOpen(false); }}
                      className={cn(
                        'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs transition-colors',
                        isActive
                          ? cn(t.bg, t.color, 'font-medium')
                          : 'text-muted-foreground hover:bg-white/[0.06] hover:text-foreground',
                      )}
                    >
                      <Icon className={cn('h-4 w-4 shrink-0', isActive ? t.color : 'opacity-60')} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          {/* Project + Task selectors */}
          <div className="grid grid-cols-2 gap-3">
            {/* Project */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/40">Project</span>
              <div className="flex items-center gap-1">
                <PickerPopover
                  open={projectOpen}
                  onOpenChange={setProjectOpen}
                  trigger={
                    <button className={cn(
                      'flex flex-1 min-w-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors',
                      project
                        ? 'bg-white/[0.04] text-foreground hover:bg-white/[0.07]'
                        : 'border border-dashed border-border/40 text-muted-foreground/40 hover:text-muted-foreground hover:border-border/60',
                    )}>
                      <FolderKanban className="h-3 w-3 shrink-0" />
                      <span className="truncate">{project?.name ?? 'None'}</span>
                      <ChevronDown className="h-2.5 w-2.5 ml-auto shrink-0 opacity-40" />
                    </button>
                  }
                  items={projectItems}
                  selectedId={project?.id}
                  onSelect={id => handleProjectChange(id)}
                  placeholder="Search projects…"
                  emptyLabel="No projects"
                />
                {project && (
                  <button
                    onClick={() => handleProjectChange(undefined)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/30 hover:text-muted-foreground hover:bg-white/[0.06] transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Task */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/40">Task</span>
              <div className="flex items-center gap-1">
                <PickerPopover
                  open={taskOpen}
                  onOpenChange={setTaskOpen}
                  trigger={
                    <button className={cn(
                      'flex flex-1 min-w-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors',
                      task
                        ? 'bg-white/[0.04] text-foreground hover:bg-white/[0.07]'
                        : 'border border-dashed border-border/40 text-muted-foreground/40 hover:text-muted-foreground hover:border-border/60',
                    )}>
                      <CheckSquare className="h-3 w-3 shrink-0" />
                      <span className="truncate">{task?.title ?? 'None'}</span>
                      <ChevronDown className="h-2.5 w-2.5 ml-auto shrink-0 opacity-40" />
                    </button>
                  }
                  items={taskItems}
                  selectedId={task?.id}
                  onSelect={id => handleTaskChange(id)}
                  placeholder="Search tasks…"
                  emptyLabel="No tasks"
                />
                {task && (
                  <button
                    onClick={() => handleTaskChange(undefined)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/30 hover:text-muted-foreground hover:bg-white/[0.06] transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Figma URL + preview */}
          {activeType === 'figma' && (
            <div className="space-y-3">
              <div className="relative">
                <Figma className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-pink-400/60" />
                <Input
                  value={figmaUrl}
                  onChange={(e) => handleFigmaUrlChange(e.target.value)}
                  onBlur={handleFigmaUrlBlur}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleFigmaUrlBlur(); }}
                  placeholder="Paste a Figma link..."
                  className="pl-8 pr-8 h-9 text-sm bg-white/[0.04] border-white/[0.08] placeholder:text-muted-foreground/40 w-full min-w-0"
                />
                {figmaUrl && isFigmaUrl(figmaUrl) && (
                  <a
                    href={figmaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                    title="Open in Figma"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>

              {/* Thumbnail preview */}
              {figmaLoading && (
                <div className="flex items-center justify-center py-8 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                  <Loader2 className="h-5 w-5 text-muted-foreground/40 animate-spin" />
                </div>
              )}
              {!figmaLoading && figmaThumbnail && (
                <a
                  href={figmaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group/thumb rounded-lg overflow-hidden border border-white/[0.06] hover:border-pink-400/30 transition-colors"
                >
                  <img
                    src={figmaThumbnail}
                    alt="Figma preview"
                    className="w-full object-cover"
                    style={{ maxHeight: 240 }}
                  />
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.02] text-xs text-muted-foreground/60 group-hover/thumb:text-pink-400/80 transition-colors">
                    <Figma className="h-3 w-3" />
                    Open in Figma
                  </div>
                </a>
              )}
              {!figmaLoading && !figmaThumbnail && figmaUrl && isFigmaUrl(figmaUrl) && (
                <a
                  href={figmaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-3 rounded-lg border border-white/[0.06] bg-white/[0.02] text-xs text-muted-foreground/60 hover:text-pink-400/80 hover:border-pink-400/30 transition-colors"
                >
                  <Figma className="h-4 w-4 text-pink-400/60" />
                  <span className="flex-1 truncate">{figmaUrl}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              )}
            </div>
          )}

          {/* Toolbar */}
          <div className="flex items-center gap-0.5 py-1">
            <ToolbarBtn onClick={() => exec('bold')} title="Bold (⌘B)">
              <Bold className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => exec('italic')} title="Italic (⌘I)">
              <Italic className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <div className="w-px h-4 bg-border/30 mx-1" />
            {/* Heading / Paragraph selector */}
            <Popover open={headingOpen} onOpenChange={setHeadingOpen}>
              <PopoverTrigger asChild>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  title="Text style"
                  className="flex items-center gap-1 p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-accent/50 transition-colors"
                >
                  <Type className="h-3.5 w-3.5" />
                  <ChevronDown className="h-2.5 w-2.5 opacity-60" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[160px] p-1" sideOffset={4}>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { exec('formatBlock', 'h1'); setHeadingOpen(false); }}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
                >
                  <Heading1 className="h-4 w-4 shrink-0 opacity-60" />
                  <span className="text-base font-bold">Heading 1</span>
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { exec('formatBlock', 'h2'); setHeadingOpen(false); }}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
                >
                  <Heading2 className="h-4 w-4 shrink-0 opacity-60" />
                  <span className="text-sm font-semibold">Heading 2</span>
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { exec('formatBlock', 'h3'); setHeadingOpen(false); }}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
                >
                  <Heading3 className="h-4 w-4 shrink-0 opacity-60" />
                  <span className="text-[13px] font-medium">Heading 3</span>
                </button>
                <div className="h-px bg-border/30 my-0.5" />
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { exec('formatBlock', 'p'); setHeadingOpen(false); }}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
                >
                  <Type className="h-4 w-4 shrink-0 opacity-60" />
                  <span className="text-sm">Paragraph</span>
                </button>
              </PopoverContent>
            </Popover>
            <div className="w-px h-4 bg-border/30 mx-1" />
            <ToolbarBtn onClick={() => exec('insertUnorderedList')} title="Bullet list">
              <List className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => exec('insertOrderedList')} title="Numbered list">
              <ListOrdered className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <div className="w-px h-4 bg-border/30 mx-1" />
            <ToolbarBtn onClick={handleLink} title="Link (⌘K)">
              <LinkIcon className="h-3.5 w-3.5" />
            </ToolbarBtn>
          </div>

          {/* Editor */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={debouncedSave}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'b') { e.preventDefault(); exec('bold'); }
              if ((e.metaKey || e.ctrlKey) && e.key === 'i') { e.preventDefault(); exec('italic'); }
              if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); handleLink(); }
            }}
            className="min-h-[200px] outline-none text-sm text-foreground/90 leading-relaxed [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-5 [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-medium [&_h3]:mt-3 [&_h3]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_li]:my-0.5 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-primary/80 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:my-2 [&_hr]:border-border/30 [&_hr]:my-4 placeholder:text-muted-foreground/40"
            data-placeholder="Start writing..."
          />
        </div>
      </ScrollArea>

      {/* Footer — pinned */}
      <div className="shrink-0 flex items-center justify-between border-t border-white/[0.06] px-5 py-3">
        <span className="text-[11px] text-muted-foreground/40">
          {formatTimestamp(note.updatedAt || note.timestamp)}
        </span>
        <button
          onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground/30 hover:text-destructive transition-colors"
        >
          <Trash2 className="h-3 w-3" />
          Delete
        </button>
      </div>
    </div>
  ) : null;

  // Embedded mode: return just the content + delete dialog (no shell)
  if (embedded) {
    return (
      <>
        {content}
        <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Artifact</DialogTitle>
              <DialogDescription>
                This will permanently delete this artifact. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="max-h-[85vh] flex flex-col">
            <DrawerHeader>
              <DrawerTitle>{note?.title || 'Artifact'}</DrawerTitle>
              <DrawerDescription>Edit this artifact.</DrawerDescription>
            </DrawerHeader>
            <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-6">{content}</div>
          </DrawerContent>
        </Drawer>

        <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Artifact</DialogTitle>
              <DialogDescription>
                This will permanently delete this artifact. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            {/* Floating close button */}
            <motion.button
              key="note-drawer-close"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 0.85, x: 0 }}
              exit={{ opacity: 0, x: 40, transition: { type: 'spring', stiffness: 420, damping: 32, mass: 0.7 } }}
              whileHover={{ opacity: 1 }}
              transition={{ delay: 0.25, type: 'spring', stiffness: 320, damping: 28 }}
              onClick={() => onOpenChange(false)}
              style={{ backgroundColor: '#1c1c1a' }}
              className="fixed top-8 right-[460px] z-50 flex h-[60px] w-8 items-center justify-center rounded-full text-muted-foreground shadow-lg border border-white/[0.08] hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </motion.button>

            {/* Floating sheet */}
            <motion.div
              key="note-drawer"
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.7 }}
              style={{ backgroundColor: '#1c1c1a', transformOrigin: 'top right' }}
              className="fixed top-8 right-8 bottom-8 z-50 w-[420px] rounded-2xl shadow-2xl border border-white/[0.08] overflow-hidden flex flex-col"
            >
              <div className="flex-1 min-h-0 overflow-y-auto">{content}</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Artifact</DialogTitle>
            <DialogDescription>
              This will permanently delete this artifact. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
