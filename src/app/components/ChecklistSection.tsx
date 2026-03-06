'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/app/lib/utils';
import { Input } from '@/app/components/ui/input';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Badge } from '@/app/components/ui/badge';
import { Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
}

interface ChecklistSectionProps {
  items: ChecklistItem[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (title: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  showCount?: boolean;
  variant?: 'default' | 'bordered';
}

export function ChecklistSection({
  items,
  onToggle,
  onDelete,
  onAdd,
  placeholder = 'Add item… press Enter',
  emptyMessage,
  showCount = false,
  variant = 'default',
}: ChecklistSectionProps) {
  const [newValue, setNewValue] = useState('');

  const handleAdd = useCallback(() => {
    const trimmed = newValue.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setNewValue('');
  }, [newValue, onAdd]);

  const anyCompleted = items.some((i) => i.completed);

  return (
    <div className="space-y-2">
      {showCount && items.length > 0 && (
        <div className="flex justify-end">
          <Badge variant="secondary" className="text-[10px]">
            {items.filter((i) => i.completed).length}/{items.length}
          </Badge>
        </div>
      )}

      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.12 }}
            className={cn(
              'group flex items-center gap-2',
              variant === 'bordered' && 'rounded-lg border px-3 py-2',
            )}
          >
            <Checkbox
              checked={item.completed}
              onCheckedChange={() => onToggle(item.id)}
              className={cn(
                'transition-opacity',
                anyCompleted || item.completed ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
              )}
            />
            <span
              className={cn(
                'min-w-0 flex-1 truncate text-sm',
                item.completed && 'text-muted-foreground line-through',
              )}
            >
              {item.title}
            </span>
            <button
              onClick={() => onDelete(item.id)}
              className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {emptyMessage && items.length === 0 && (
        <p className="py-2 text-center text-xs text-muted-foreground">
          {emptyMessage}
        </p>
      )}

      <Input
        value={newValue}
        onChange={(e) => setNewValue(e.target.value)}
        placeholder={placeholder}
        className="h-8 text-sm"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
          }
        }}
      />
    </div>
  );
}
