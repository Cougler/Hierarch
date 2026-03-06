'use client';

import { useState } from 'react';
import { cn } from '@/app/lib/utils';
import { Button } from '@/app/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import {
  Folder, Star, Heart, Zap, Target, Rocket, Code, Book,
  Music, Camera, Globe, Shield, Award, Flag, Bookmark,
  Coffee, Compass, Feather, Gift, Key, Layers, Map,
  Palette, Sun, Moon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Folder, Star, Heart, Zap, Target, Rocket, Code, Book,
  Music, Camera, Globe, Shield, Award, Flag, Bookmark,
  Coffee, Compass, Feather, Gift, Key, Layers, Map,
  Palette, Sun, Moon,
};

const ICON_NAMES = Object.keys(ICON_MAP);

const PRESET_COLORS = [
  { name: 'slate', value: 'bg-slate-500', hex: '#64748b' },
  { name: 'red', value: 'bg-red-500', hex: '#ef4444' },
  { name: 'orange', value: 'bg-orange-500', hex: '#f97316' },
  { name: 'amber', value: 'bg-amber-500', hex: '#f59e0b' },
  { name: 'emerald', value: 'bg-emerald-500', hex: '#10b981' },
  { name: 'blue', value: 'bg-blue-500', hex: '#3b82f6' },
  { name: 'violet', value: 'bg-violet-500', hex: '#8b5cf6' },
  { name: 'pink', value: 'bg-pink-500', hex: '#ec4899' },
];

interface IconPickerProps {
  value?: string;
  color?: string;
  onChange: (icon: string, color: string) => void;
}

export function getIconComponent(name?: string): LucideIcon {
  return (name && ICON_MAP[name]) || Folder;
}

export { PRESET_COLORS };

export function IconPicker({ value = 'Folder', color = 'bg-blue-500', onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState(value);

  const CurrentIcon = getIconComponent(selectedIcon);

  const handleIconSelect = (iconName: string) => {
    setSelectedIcon(iconName);
    onChange(iconName, color);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0">
          <CurrentIcon className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="grid grid-cols-5 gap-1">
          {ICON_NAMES.map((name) => {
            const Icon = ICON_MAP[name];
            return (
              <button
                key={name}
                onClick={() => handleIconSelect(name)}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
                  selectedIcon === name
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
