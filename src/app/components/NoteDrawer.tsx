'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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
import { ScrollArea } from '@/app/components/ui/scroll-area';
import {
  Bold, Italic, List, ListOrdered, Heading2, Quote, Minus, Trash2, X,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { useIsMobile } from '@/app/hooks/use-mobile';
import type { Project } from '@/app/types';

export interface DesignNote {
  id: string
  title: string
  text: string
  type: NoteType
  projectId?: string
  timestamp: string
  updatedAt: string
}

export type NoteType = 'freeform' | 'decision' | 'feedback' | 'research' | 'critique';

const NOTE_TYPES: { id: NoteType; label: string }[] = [
  { id: 'freeform', label: 'Freeform' },
  { id: 'decision', label: 'Decision' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'research', label: 'Research' },
  { id: 'critique', label: 'Critique' },
];

interface NoteDrawerProps {
  note: DesignNote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  onUpdate: (id: string, updates: Partial<DesignNote>) => void;
  onDelete: (id: string) => void;
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

export function NoteDrawer({
  note,
  open,
  onOpenChange,
  projects,
  onUpdate,
  onDelete,
}: NoteDrawerProps) {
  const isMobile = useIsMobile();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [title, setTitle] = useState('');
  const [activeType, setActiveType] = useState<NoteType>('freeform');
  const editorRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync state when note changes
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setActiveType(note.type);
      // Set editor content after mount
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

  const handleTypeChange = (type: NoteType) => {
    setActiveType(type);
    if (note) {
      onUpdate(note.id, { type, updatedAt: new Date().toISOString() });
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

  const formatTimestamp = (iso: string) => {
    const d = new Date(iso);
    if (isToday(d)) return `Today at ${format(d, 'h:mm a')}`;
    if (isYesterday(d)) return `Yesterday at ${format(d, 'h:mm a')}`;
    return format(d, 'MMM d, yyyy');
  };

  const project = note?.projectId
    ? projects.find(p => p.id === note.projectId || p.name === note.projectId)
    : undefined;

  // ─── Content ───
  const content = note ? (
    <ScrollArea key={note.id} className="h-full">
      <div className="p-5 space-y-5">
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
          placeholder="Untitled note"
          className="w-full bg-transparent text-lg font-semibold text-foreground outline-none placeholder:text-muted-foreground/40"
        />

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{formatTimestamp(note.updatedAt || note.timestamp)}</span>
          {project && (
            <>
              <span className="text-border">·</span>
              <span>{project.name}</span>
            </>
          )}
        </div>

        {/* Type tabs */}
        <div className="flex items-center gap-0 border-b border-border/30">
          {NOTE_TYPES.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTypeChange(tab.id)}
              className={cn(
                'relative px-1 pb-2.5 pt-0.5 mr-4 text-xs font-medium transition-colors',
                activeType === tab.id
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
              {activeType === tab.id && (
                <motion.div
                  layoutId="note-type-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-0.5 py-1">
          <ToolbarBtn onClick={() => exec('bold')} title="Bold (⌘B)">
            <Bold className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => exec('italic')} title="Italic (⌘I)">
            <Italic className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <div className="w-px h-4 bg-border/30 mx-1" />
          <ToolbarBtn onClick={() => exec('formatBlock', 'h2')} title="Heading">
            <Heading2 className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => exec('insertUnorderedList')} title="Bullet list">
            <List className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => exec('insertOrderedList')} title="Numbered list">
            <ListOrdered className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => exec('formatBlock', 'blockquote')} title="Quote">
            <Quote className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => exec('insertHorizontalRule')} title="Divider">
            <Minus className="h-3.5 w-3.5" />
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
          }}
          className="min-h-[200px] outline-none text-sm text-foreground/90 leading-relaxed [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_li]:my-0.5 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:my-2 [&_hr]:border-border/30 [&_hr]:my-4 placeholder:text-muted-foreground/40"
          data-placeholder="Start writing..."
        />

        {/* Delete */}
        <div className="pt-4 border-t border-border/20">
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-2 text-xs text-muted-foreground/50 hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete note
          </button>
        </div>
      </div>
    </ScrollArea>
  ) : null;

  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="max-h-[85vh] flex flex-col">
            <DrawerHeader>
              <DrawerTitle>{note?.title || 'Design Note'}</DrawerTitle>
              <DrawerDescription>Edit your design note.</DrawerDescription>
            </DrawerHeader>
            <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-6">{content}</div>
          </DrawerContent>
        </Drawer>

        <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Note</DialogTitle>
              <DialogDescription>
                This will permanently delete this note. This action cannot be undone.
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
            <DialogTitle>Delete Note</DialogTitle>
            <DialogDescription>
              This will permanently delete this note. This action cannot be undone.
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
