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
  { id: 'freeform', label: 'Quick Note', icon: FileText, color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-500/10' },
  { id: 'decision', label: 'Decision', icon: PenLine, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-500/10' },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
  { id: 'research', label: 'Research', icon: FlaskConical, color: 'text-violet-700 dark:text-violet-400', bg: 'bg-violet-500/10' },
  { id: 'link', label: 'Link', icon: Link2, color: 'text-sky-700 dark:text-sky-400', bg: 'bg-sky-500/10' },
  { id: 'figma', label: 'Figma', icon: Figma, color: 'text-pink-700 dark:text-pink-400', bg: 'bg-pink-500/10' },
  { id: 'prototype', label: 'Prototype', icon: Play, color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-500/10' },
  { id: 'screenshot', label: 'Screenshot', icon: Image, color: 'text-teal-700 dark:text-teal-400', bg: 'bg-teal-500/10' },
  { id: 'video', label: 'Video', icon: Video, color: 'text-red-700 dark:text-red-400', bg: 'bg-red-500/10' },
  { id: 'doc', label: 'Doc', icon: FileCode, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-500/10' },
];

const getTypeMeta = (id: ArtifactType) => TYPE_META.find(t => t.id === id) ?? TYPE_META[0]!;

// Types that support a URL field
const URL_TYPES: Partial<Record<ArtifactType, { placeholder: string; icon: React.ElementType; validate?: (url: string) => boolean }>> = {
  link: { placeholder: 'Paste a URL...', icon: Link2 },
  video: { placeholder: 'Paste a video link (YouTube, Vimeo, Loom)...', icon: Video },
  prototype: { placeholder: 'Paste a prototype link (InVision, Marvel, ProtoPie)...', icon: Play },
  screenshot: { placeholder: 'Paste an image URL...', icon: Image },
  figma: {
    placeholder: 'Paste a Figma link...',
    icon: Figma,
    validate: (url: string) => /^https:\/\/(www\.)?figma\.com\/(file|design|proto|board)\//.test(url.trim()),
  },
};

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m?.[1] ?? null;
}

function getVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m?.[1] ?? null;
}

function getLoomId(url: string): string | null {
  const m = url.match(/loom\.com\/share\/([a-f0-9]+)/);
  return m?.[1] ?? null;
}

function getEmbedUrl(url: string): { embed: string; provider: string } | null {
  const ytId = getYouTubeId(url);
  if (ytId) return { embed: `https://www.youtube.com/embed/${ytId}`, provider: 'YouTube' };
  const vimeoId = getVimeoId(url);
  if (vimeoId) return { embed: `https://player.vimeo.com/video/${vimeoId}`, provider: 'Vimeo' };
  const loomId = getLoomId(url);
  if (loomId) return { embed: `https://www.loom.com/embed/${loomId}`, provider: 'Loom' };
  return null;
}

const DOMAIN_LABELS: Record<string, string> = {
  'youtube.com': 'YouTube Video',
  'youtu.be': 'YouTube Video',
  'vimeo.com': 'Vimeo Video',
  'loom.com': 'Loom Recording',
  'figma.com': 'Figma File',
  'github.com': 'GitHub',
  'notion.so': 'Notion Page',
  'linear.app': 'Linear Issue',
  'docs.google.com': 'Google Doc',
  'drive.google.com': 'Google Drive',
  'slack.com': 'Slack Message',
  'miro.com': 'Miro Board',
  'whimsical.com': 'Whimsical',
  'excalidraw.com': 'Excalidraw',
  'stackoverflow.com': 'Stack Overflow',
  'medium.com': 'Medium Article',
  'twitter.com': 'X Post',
  'x.com': 'X Post',
  'dribbble.com': 'Dribbble Shot',
  'behance.net': 'Behance Project',
  'vercel.app': 'Vercel Deploy',
  'netlify.app': 'Netlify Deploy',
};

function getLinkLabel(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    // Check exact match first, then check if hostname ends with a known domain
    if (DOMAIN_LABELS[hostname]) return DOMAIN_LABELS[hostname];
    for (const [domain, label] of Object.entries(DOMAIN_LABELS)) {
      if (hostname.endsWith(domain)) return label;
    }
    // Capitalize the domain name as fallback
    const parts = hostname.split('.');
    const name = parts.length > 1 ? parts[parts.length - 2]! : parts[0]!;
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return url;
  }
}

function isImageUrl(url: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg|avif|bmp)(\?|$)/i.test(url);
}

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
  const [artifactUrl, setArtifactUrl] = useState('');
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

  const urlTypeConfig = URL_TYPES[activeType];

  // Sync state when note changes
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setActiveType(note.type);
      setArtifactUrl(note.url || '');
      setFigmaThumbnail(null);
      if (note.url && isFigmaUrl(note.url)) {
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

  const handleUrlChange = (url: string) => {
    setArtifactUrl(url);
    if (note) {
      onUpdate(note.id, { url, updatedAt: new Date().toISOString() });
    }
  };

  const handleUrlBlur = () => {
    if (artifactUrl && isFigmaUrl(artifactUrl)) {
      fetchFigmaThumbnail(artifactUrl);
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
  const [detectedLink, setDetectedLink] = useState<{ url: string; range: Range; top: number; left: number } | null>(null);

  const detectLinkOnInput = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !editorRef.current) return;
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE || !node.textContent) { setDetectedLink(null); return; }

    // Check if the text node contains a URL that just finished (followed by space or at end)
    const text = node.textContent.slice(0, range.startOffset);
    const urlMatch = text.match(/(https?:\/\/[^\s]+)\s?$/);
    if (urlMatch && urlMatch[1]) {
      const url = urlMatch[1];
      // Don't detect if already inside an anchor
      if (node.parentElement?.tagName === 'A') { setDetectedLink(null); return; }
      const linkRange = document.createRange();
      linkRange.setStart(node, urlMatch.index!);
      linkRange.setEnd(node, urlMatch.index! + url.length);
      const rangeRect = linkRange.getBoundingClientRect();
      const editorRect = editorRef.current!.getBoundingClientRect();
      setDetectedLink({
        url,
        range: linkRange,
        top: rangeRect.bottom - editorRect.top + 4,
        left: Math.max(0, rangeRect.left - editorRect.left),
      });
    } else {
      setDetectedLink(null);
    }
  }, []);

  const convertToLinkBadge = useCallback(() => {
    if (!detectedLink || !editorRef.current) return;
    const { url, range } = detectedLink;
    let hostname = '';
    try { hostname = new URL(url).hostname.replace('www.', ''); } catch { hostname = url; }
    const label = getLinkLabel(url);
    range.deleteContents();
    const wrapper = document.createElement('span');
    wrapper.className = 'hierarch-link-badge-wrap';
    wrapper.contentEditable = 'false';
    wrapper.innerHTML = `<a href="${url}" target="_blank" rel="noopener noreferrer" class="hierarch-link-badge"><img src="https://www.google.com/s2/favicons?domain=${hostname}&sz=16" alt="" style="width:12px;height:12px;border-radius:2px;vertical-align:middle;margin-right:4px;display:inline" />${label}</a><button class="hierarch-link-badge-close" title="Remove">&times;</button>`;
    wrapper.querySelector('.hierarch-link-badge-close')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      wrapper.remove();
      debouncedSave();
    });
    range.insertNode(wrapper);
    // Move cursor after the badge
    const after = document.createRange();
    after.setStartAfter(wrapper);
    after.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(after);
    // Insert a space after
    document.execCommand('insertText', false, ' ');
    setDetectedLink(null);
    debouncedSave();
  }, [detectedLink, debouncedSave]);

  const convertToLinkCard = useCallback(() => {
    if (!detectedLink || !editorRef.current) return;
    const { url, range } = detectedLink;
    let hostname = '';
    try { hostname = new URL(url).hostname.replace('www.', ''); } catch { hostname = url; }
    const label = getLinkLabel(url);
    range.deleteContents();
    const card = document.createElement('a');
    card.href = url;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.className = 'hierarch-link-card';
    card.contentEditable = 'false';
    card.innerHTML = `<span class="hierarch-link-card-inner"><img src="https://www.google.com/s2/favicons?domain=${hostname}&sz=32" alt="" /><span class="hierarch-link-card-text"><span class="hierarch-link-card-host">${label}</span><span class="hierarch-link-card-url">${url}</span></span><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></span>`;
    range.insertNode(card);
    // Move cursor after
    const after = document.createRange();
    after.setStartAfter(card);
    after.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(after);
    document.execCommand('insertText', false, '\n');
    setDetectedLink(null);
    debouncedSave();
  }, [detectedLink, debouncedSave]);

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
                          : 'text-muted-foreground hover:bg-surface hover:text-foreground',
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
                        ? 'bg-surface text-foreground hover:bg-surface-hover'
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
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/30 hover:text-muted-foreground hover:bg-surface transition-colors"
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
                        ? 'bg-surface text-foreground hover:bg-surface-hover'
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
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/30 hover:text-muted-foreground hover:bg-surface transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* URL field + preview (for link, video, prototype, screenshot, figma) */}
          {urlTypeConfig && (
            <div className="space-y-3">
              <div className="relative">
                <urlTypeConfig.icon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
                <Input
                  value={artifactUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  onBlur={handleUrlBlur}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleUrlBlur(); }}
                  placeholder={urlTypeConfig.placeholder}
                  className="pl-8 pr-8 h-9 text-sm bg-surface border-border placeholder:text-muted-foreground/40 w-full min-w-0"
                />
                {artifactUrl && /^https?:\/\//.test(artifactUrl) && (
                  <a
                    href={artifactUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                    title="Open link"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>

              {/* Figma thumbnail preview */}
              {activeType === 'figma' && figmaLoading && (
                <div className="flex items-center justify-center py-8 rounded-lg border border-border bg-accent/50">
                  <Loader2 className="h-5 w-5 text-muted-foreground/40 animate-spin" />
                </div>
              )}
              {activeType === 'figma' && !figmaLoading && figmaThumbnail && (
                <a
                  href={artifactUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group/thumb rounded-lg overflow-hidden border border-border hover:border-pink-400/30 transition-colors"
                >
                  <img src={figmaThumbnail} alt="Figma preview" className="w-full object-cover" style={{ maxHeight: 240 }} />
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-accent/50 text-xs text-muted-foreground/60 group-hover/thumb:text-pink-400/80 transition-colors">
                    <Figma className="h-3 w-3" />
                    Open in Figma
                  </div>
                </a>
              )}
              {activeType === 'figma' && !figmaLoading && !figmaThumbnail && artifactUrl && isFigmaUrl(artifactUrl) && (
                <a href={artifactUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-3 rounded-lg border border-border bg-accent/50 text-xs text-muted-foreground/60 hover:text-pink-400/80 hover:border-pink-400/30 transition-colors">
                  <Figma className="h-4 w-4 text-pink-400/60" />
                  <span className="flex-1 truncate">{artifactUrl}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              )}

              {/* Video embed preview (YouTube, Vimeo, Loom) */}
              {activeType === 'video' && artifactUrl && (() => {
                const embed = getEmbedUrl(artifactUrl);
                if (!embed) return null;
                return (
                  <div className="rounded-lg overflow-hidden border border-border">
                    <iframe
                      src={embed.embed}
                      title={embed.provider}
                      className="w-full aspect-video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-accent/50 text-xs text-muted-foreground/60">
                      <Video className="h-3 w-3" />
                      {embed.provider}
                    </div>
                  </div>
                );
              })()}

              {/* Image preview for screenshot type */}
              {activeType === 'screenshot' && artifactUrl && isImageUrl(artifactUrl) && (
                <div className="rounded-lg overflow-hidden border border-border">
                  <img src={artifactUrl} alt="Screenshot" className="w-full object-cover" style={{ maxHeight: 300 }} />
                </div>
              )}

              {/* Generic link preview for link/prototype */}
              {(activeType === 'link' || activeType === 'prototype') && artifactUrl && /^https?:\/\//.test(artifactUrl) && (
                <a
                  href={artifactUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-3 rounded-lg border border-border bg-accent/50 text-xs transition-colors hover:border-primary/30"
                >
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${new URL(artifactUrl).hostname}&sz=32`}
                    alt=""
                    className="h-4 w-4 shrink-0 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground/80 truncate">{new URL(artifactUrl).hostname.replace('www.', '')}</p>
                    <p className="text-muted-foreground/40 truncate text-[10px]">{artifactUrl}</p>
                  </div>
                  <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground/40" />
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
          <div className="relative">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={() => { debouncedSave(); detectLinkOnInput(); }}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'b') { e.preventDefault(); exec('bold'); }
              if ((e.metaKey || e.ctrlKey) && e.key === 'i') { e.preventDefault(); exec('italic'); }
              if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); handleLink(); }
            }}
            style={{ maxWidth: 'calc(420px - 40px)' }}
            className="min-h-[200px] w-full outline-none text-sm text-foreground/90 leading-relaxed [word-break:break-word] [overflow-wrap:anywhere] [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-5 [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-medium [&_h3]:mt-3 [&_h3]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_li]:my-0.5 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a]:break-all [&_a:hover]:text-primary/80 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:my-2 [&_hr]:border-border/30 [&_hr]:my-4 placeholder:text-muted-foreground/40"
            data-placeholder="Start writing..."
          />

          {/* Link detected tooltip */}
          <AnimatePresence>
            {detectedLink && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.12 }}
                style={{ position: 'absolute', top: detectedLink.top, left: detectedLink.left }}
                className="z-10 flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-border bg-popover shadow-md"
              >
                <span className="text-[10px] text-muted-foreground/60 mr-1">Link detected</span>
                <button
                  onClick={convertToLinkBadge}
                  className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <Link2 className="h-2.5 w-2.5" />
                  Badge
                </button>
                <button
                  onClick={convertToLinkCard}
                  className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                  Card
                </button>
                <button
                  onClick={() => setDetectedLink(null)}
                  className="text-muted-foreground/30 hover:text-muted-foreground transition-colors ml-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </div>
      </ScrollArea>

      {/* Footer — pinned */}
      <div className="shrink-0 flex items-center justify-between border-t border-border px-5 py-3">
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
              className="fixed top-8 right-[460px] z-50 flex h-[60px] w-8 items-center justify-center rounded-full bg-drawer text-muted-foreground shadow-lg border border-border hover:text-foreground transition-colors"
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
              style={{ transformOrigin: 'top right' }}
              className="fixed top-8 right-8 bottom-8 z-50 w-[420px] rounded-2xl bg-drawer shadow-2xl border border-border overflow-hidden flex flex-col"
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
