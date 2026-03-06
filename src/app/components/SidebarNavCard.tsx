'use client';

import { cn } from '@/app/lib/utils';
import { Badge } from '@/app/components/ui/badge';
import { motion } from 'motion/react';

interface SidebarNavCardProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

export function SidebarNavCard({ icon, label, count, isActive, onClick }: SidebarNavCardProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'flex flex-1 flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors',
        isActive
          ? 'border-primary/30 bg-primary/10 text-primary'
          : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
    >
      <div className="flex w-full items-center justify-between">
        <span className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-medium">{label}</span>
        </span>
        <Badge
          variant={isActive ? 'default' : 'secondary'}
          className="h-5 min-w-5 justify-center px-1.5 text-[10px]"
        >
          {count}
        </Badge>
      </div>
    </motion.button>
  );
}
