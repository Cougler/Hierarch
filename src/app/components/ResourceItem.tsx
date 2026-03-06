'use client';

import { cn } from '@/app/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import {
  FileText,
  Link2,
  Search,
  Users,
  MoreHorizontal,
  Pencil,
  Trash2,
  ExternalLink,
  GripVertical,
} from 'lucide-react';
import type { Resource, ResourceType } from '@/app/types';

export const RESOURCE_TYPE_ICONS: Record<ResourceType, React.ElementType> = {
  'Project Note': FileText,
  Link: Link2,
  Research: Search,
  'Meeting Note': Users,
};

export const RESOURCE_TYPE_COLORS: Record<ResourceType, string> = {
  'Project Note': 'text-blue-500',
  Link: 'text-emerald-500',
  Research: 'text-amber-500',
  'Meeting Note': 'text-violet-500',
};

export const RESOURCE_TYPE_BG_COLORS: Record<ResourceType, string> = {
  'Project Note': 'bg-blue-500/20 text-blue-400',
  Link: 'bg-emerald-500/20 text-emerald-400',
  Research: 'bg-amber-500/20 text-amber-400',
  'Meeting Note': 'bg-violet-500/20 text-violet-400',
};

type ResourceItemVariant = 'compact' | 'inline' | 'card';

interface ResourceItemProps {
  resource: Resource;
  variant?: ResourceItemVariant;
  draggable?: boolean;
  onEdit?: (resource: Resource) => void;
  onDelete?: (id: string) => void;
  onClick?: (resource: Resource) => void;
}

export function ResourceItem({
  resource,
  variant = 'compact',
  draggable = false,
  onEdit,
  onDelete,
  onClick,
}: ResourceItemProps) {
  const Icon = RESOURCE_TYPE_ICONS[resource.type];
  const bgColor = RESOURCE_TYPE_BG_COLORS[resource.type];
  const hasActions = onEdit || onDelete;

  return (
    <div
      className={cn(
        'group flex items-center gap-3 transition-colors',
        variant === 'compact' && 'rounded-lg bg-card p-3 hover:bg-accent/50',
        variant === 'inline' && 'rounded-md border bg-card/50 px-3 py-2',
        variant === 'card' && 'rounded-lg border bg-card p-4 hover:shadow-md',
        onClick && 'cursor-pointer',
      )}
      onClick={() => onClick?.(resource)}
    >
      {draggable && (
        <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground/40 active:cursor-grabbing" />
      )}

      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-lg',
          bgColor,
          variant === 'inline' ? 'h-6 w-6' : 'h-8 w-8',
        )}
      >
        <Icon className={cn(variant === 'inline' ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
      </div>

      <div className="min-w-0 flex-1">
        <p className={cn(
          'truncate font-medium',
          variant === 'inline' ? 'text-sm' : 'text-sm',
        )}>
          {resource.title}
        </p>
      </div>

      {resource.type === 'Link' && resource.url && (
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}

      {hasActions && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(resource)}>
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Edit
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                onClick={() => onDelete(resource.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
