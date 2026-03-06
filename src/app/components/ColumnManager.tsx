'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Slider } from '@/app/components/ui/slider';
import { Label } from '@/app/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/app/components/ui/dialog';

interface Column {
  id: string;
  title: string;
  visible: boolean;
  width: number;
}

interface ColumnManagerProps {
  columns: Column[];
  onChange: (columns: Column[]) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ColumnManager({ columns: initialColumns, onChange, open, onOpenChange }: ColumnManagerProps) {
  const [draft, setDraft] = useState<Column[]>(initialColumns);

  const handleOpen = useCallback((isOpen: boolean) => {
    if (isOpen) setDraft(initialColumns);
    onOpenChange?.(isOpen);
  }, [initialColumns, onOpenChange]);

  const toggleVisibility = useCallback((id: string) => {
    setDraft(prev => prev.map(c =>
      c.id === id ? { ...c, visible: !c.visible } : c
    ));
  }, []);

  const updateWidth = useCallback((id: string, width: number) => {
    setDraft(prev => prev.map(c =>
      c.id === id ? { ...c, width } : c
    ));
  }, []);

  const handleSave = () => {
    onChange(draft);
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Columns</DialogTitle>
          <DialogDescription>
            Toggle column visibility and adjust widths for the list view.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {draft.map((col) => (
            <div key={col.id} className="flex items-center gap-3">
              <Checkbox
                id={`col-${col.id}`}
                checked={col.visible}
                onCheckedChange={() => toggleVisibility(col.id)}
              />
              <Label htmlFor={`col-${col.id}`} className="w-24 shrink-0 text-sm">
                {col.title}
              </Label>
              <Slider
                value={[col.width]}
                onValueChange={([w]) => updateWidth(col.id, w)}
                min={100}
                max={500}
                step={10}
                className="flex-1"
              />
              <span className="w-12 text-right text-xs text-muted-foreground">
                {col.width}px
              </span>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
