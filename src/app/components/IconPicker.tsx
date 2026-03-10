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
  { name: 'slate',   hex: '#64748b' },
  { name: 'red',     hex: '#ef4444' },
  { name: 'orange',  hex: '#f97316' },
  { name: 'amber',   hex: '#f59e0b' },
  { name: 'emerald', hex: '#10b981' },
  { name: 'blue',    hex: '#3b82f6' },
  { name: 'violet',  hex: '#8b5cf6' },
  { name: 'pink',    hex: '#ec4899' },
];

// Resolve legacy bg-class names or hex strings to a hex value
function resolveHex(color?: string): string {
  if (!color) return '#3b82f6';
  if (color.startsWith('#')) return color;
  const legacyMap: Record<string, string> = {
    'bg-slate-500': '#64748b', 'bg-red-500': '#ef4444',
    'bg-orange-500': '#f97316', 'bg-amber-500': '#f59e0b',
    'bg-emerald-500': '#10b981', 'bg-blue-500': '#3b82f6',
    'bg-violet-500': '#8b5cf6', 'bg-pink-500': '#ec4899',
  };
  return legacyMap[color] || '#3b82f6';
}

interface IconPickerProps {
  value?: string;
  color?: string;
  onChange: (icon: string, color: string) => void;
}

export function getIconComponent(name?: string): LucideIcon {
  return (name && ICON_MAP[name]) || Folder;
}

export { PRESET_COLORS };

export function IconPicker({ value = 'Folder', color, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState(value);
  const [selectedColor, setSelectedColor] = useState(() => resolveHex(color));

  const CurrentIcon = getIconComponent(selectedIcon);

  const handleIconSelect = (iconName: string) => {
    setSelectedIcon(iconName);
    onChange(iconName, selectedColor);
    setOpen(false);
  };

  const handleColorSelect = (hex: string) => {
    setSelectedColor(hex);
    onChange(selectedIcon, hex);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0">
          <CurrentIcon className="h-4 w-4" style={{ color: selectedColor }} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2.5" align="start">
        {/* Icon grid */}
        <div className="grid grid-cols-5 gap-1">
          {ICON_NAMES.map((name) => {
            const Icon = ICON_MAP[name];
            if (!Icon) return null;
            return (
              <button
                key={name}
                onClick={() => handleIconSelect(name)}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
                  selectedIcon === name
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="my-2 border-t border-border/50" />

        {/* Color swatches */}
        <div className="flex items-center gap-1.5 px-0.5">
          {PRESET_COLORS.map(({ name, hex }) => (
            <button
              key={name}
              onClick={() => handleColorSelect(hex)}
              title={name}
              className="h-5 w-5 rounded-full transition-transform hover:scale-110 focus:outline-none"
              style={{
                backgroundColor: hex,
                boxShadow: selectedColor === hex
                  ? `0 0 0 2px var(--background), 0 0 0 3.5px ${hex}`
                  : 'none',
              }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
