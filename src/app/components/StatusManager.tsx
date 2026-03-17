'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/app/lib/utils';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/app/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { GripVertical, Plus, Trash2, Check, MessageSquare } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { StatusConfig } from '@/app/types';

const STATUS_COLORS = [
  { value: 'bg-slate-500', hex: '#64748b' },
  { value: 'bg-red-500', hex: '#ef4444' },
  { value: 'bg-orange-500', hex: '#f97316' },
  { value: 'bg-amber-500', hex: '#f59e0b' },
  { value: 'bg-emerald-500', hex: '#10b981' },
  { value: 'bg-blue-500', hex: '#3b82f6' },
  { value: 'bg-violet-500', hex: '#8b5cf6' },
  { value: 'bg-pink-500', hex: '#ec4899' },
];

function colorToCountColor(color: string): string {
  return color.replace('bg-', 'text-').replace('-500', '-400');
}

interface StatusManagerProps {
  statuses: StatusConfig[];
  onChange: (statuses: StatusConfig[]) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function SortableStatusItem({
  status,
  onUpdate,
  onDelete,
  onToggleDone,
  onToggleFeedback,
  canDelete,
}: {
  status: StatusConfig;
  onUpdate: (id: string, updates: Partial<StatusConfig>) => void;
  onDelete: (id: string) => void;
  onToggleDone: (id: string) => void;
  onToggleFeedback: (id: string) => void;
  canDelete: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: status.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const currentHex = STATUS_COLORS.find(c => c.value === status.color)?.hex || '#64748b';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 rounded-md border bg-card p-2',
        isDragging && 'opacity-50'
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <Popover>
        <PopoverTrigger asChild>
          <button
            className={cn('h-4 w-4 shrink-0 rounded-full', status.color)}
            style={{ backgroundColor: currentHex }}
          />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex gap-1.5">
            {STATUS_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => onUpdate(status.id, {
                  color: c.value,
                  countColor: colorToCountColor(c.value),
                })}
                className={cn(
                  'h-6 w-6 rounded-full transition-all',
                  c.value,
                  status.color === c.value
                    ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                    : 'hover:scale-110'
                )}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Input
        value={status.title}
        onChange={(e) => onUpdate(status.id, { title: e.target.value })}
        className="h-7 flex-1 text-sm"
      />

      <button
        onClick={() => onToggleFeedback(status.id)}
        className={cn(
          'flex h-6 items-center gap-1 rounded-md px-1.5 text-[10px] font-medium transition-colors',
          status.isFeedback
            ? 'bg-orange-500/20 text-orange-500'
            : 'text-muted-foreground hover:bg-accent'
        )}
        title="Feedback phase — prompts for reviewer on entry"
      >
        <MessageSquare className="h-3 w-3" />
      </button>

      <button
        onClick={() => onToggleDone(status.id)}
        className={cn(
          'flex h-6 items-center gap-1 rounded-md px-1.5 text-[10px] font-medium transition-colors',
          status.isDone
            ? 'bg-emerald-500/20 text-emerald-500'
            : 'text-muted-foreground hover:bg-accent'
        )}
        title="Mark as Handoff / Done phase"
      >
        <Check className="h-3 w-3" />
      </button>

      <button
        onClick={() => onDelete(status.id)}
        disabled={!canDelete}
        className="text-muted-foreground hover:text-destructive disabled:opacity-30"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function StatusManager({ statuses: initialStatuses, onChange, open, onOpenChange }: StatusManagerProps) {
  const [draft, setDraft] = useState<StatusConfig[]>(initialStatuses);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleOpen = useCallback((isOpen: boolean) => {
    if (isOpen) setDraft(initialStatuses);
    onOpenChange?.(isOpen);
  }, [initialStatuses, onOpenChange]);

  const updateStatus = useCallback((id: string, updates: Partial<StatusConfig>) => {
    setDraft(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const deleteStatus = useCallback((id: string) => {
    setDraft(prev => prev.filter(s => s.id !== id));
  }, []);

  const toggleDone = useCallback((id: string) => {
    setDraft(prev => prev.map(s => ({
      ...s,
      isDone: s.id === id ? !s.isDone : false,
    })));
  }, []);

  const toggleFeedback = useCallback((id: string) => {
    setDraft(prev => prev.map(s => ({
      ...s,
      isFeedback: s.id === id ? !s.isFeedback : false,
    })));
  }, []);

  const addStatus = useCallback(() => {
    const newId = `phase-${Date.now()}`;
    setDraft(prev => [
      ...prev,
      {
        id: newId,
        title: 'New Phase',
        color: 'bg-slate-500',
        countColor: 'text-slate-400',
        order: prev.length,
        width: 280,
        visible: true,
      },
    ]);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setDraft(prev => {
      const oldIndex = prev.findIndex(s => s.id === active.id);
      const newIndex = prev.findIndex(s => s.id === over.id);
      return arrayMove(prev, oldIndex, newIndex).map((s, i) => ({ ...s, order: i }));
    });
  }, []);

  const handleSave = () => {
    onChange(draft);
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Phases</DialogTitle>
          <DialogDescription>
            Configure design phases. Drag to reorder. Mark one as review (prompts for reviewer) and one as handoff (marks tasks complete).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={draft.map(s => s.id)} strategy={verticalListSortingStrategy}>
              {draft.map((status) => (
                <SortableStatusItem
                  key={status.id}
                  status={status}
                  onUpdate={updateStatus}
                  onDelete={deleteStatus}
                  onToggleDone={toggleDone}
                  onToggleFeedback={toggleFeedback}
                  canDelete={draft.length > 1}
                />
              ))}
            </SortableContext>
          </DndContext>

          <Button variant="outline" size="sm" onClick={addStatus} className="w-full">
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add Phase
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
