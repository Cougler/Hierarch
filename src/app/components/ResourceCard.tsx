'use client';

import { cn } from '@/app/lib/utils';
import { Card } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
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
  Pin,
} from 'lucide-react';
import { format } from 'date-fns';
import type { Resource, ResourceType } from '@/app/types';

const TYPE_ICONS: Record<ResourceType, React.ElementType> = {
  'Project Note': FileText,
  Link: Link2,
  Research: Search,
  'Meeting Note': Users,
};

const TYPE_COLORS: Record<ResourceType, string> = {
  'Project Note': 'text-blue-500',
  Link: 'text-emerald-500',
  Research: 'text-amber-500',
  'Meeting Note': 'text-violet-500',
};

interface ResourceCardProps {
  resource: Resource;
  size?: 'sm' | 'md' | 'lg';
  onEdit: (resource: Resource) => void;
  onDelete: (id: string) => void;
}

function stripHtml(html: string): string {
  if (typeof document !== 'undefined') {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }
  return html.replace(/<[^>]*>/g, '');
}

export function ResourceCard({
  resource,
  size = 'md',
  onEdit,
  onDelete,
}: ResourceCardProps) {
  const Icon = TYPE_ICONS[resource.type];
  const iconColor = TYPE_COLORS[resource.type];
  const preview = resource.content ? stripHtml(resource.content) : resource.url || '';

  const truncatedPreview =
    size === 'sm'
      ? preview.slice(0, 60)
      : size === 'md'
        ? preview.slice(0, 120)
        : preview.slice(0, 240);

  const formattedDate = resource.createdAt
    ? format(new Date(resource.createdAt), 'MMM d, yyyy')
    : '';

  return (
    <Card
      className={cn(
        'group relative transition-all hover:shadow-md',
        size === 'sm' && 'p-3',
        size === 'md' && 'p-4',
        size === 'lg' && 'p-5',
      )}
    >
      {resource.pinned && (
        <Pin className="absolute right-2 top-2 h-3.5 w-3.5 rotate-45 text-amber-500" />
      )}

      <div className={cn('flex gap-3', size === 'lg' ? 'flex-col' : 'items-start')}>
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-lg bg-muted',
            size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
          )}
        >
          <Icon className={cn('h-4 w-4', iconColor)} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4
                className={cn(
                  'truncate font-medium leading-tight',
                  size === 'sm' ? 'text-sm' : 'text-base',
                )}
              >
                {resource.title}
              </h4>
              {size !== 'sm' && (
                <div className="mt-0.5 flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {resource.type}
                  </Badge>
                  {formattedDate && (
                    <span className="text-xs text-muted-foreground">
                      {formattedDate}
                    </span>
                  )}
                </div>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(resource)}>
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(resource.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {truncatedPreview && (
            <p
              className={cn(
                'text-muted-foreground',
                size === 'sm' ? 'mt-1 text-xs line-clamp-1' : 'mt-2 text-sm line-clamp-2',
                size === 'lg' && 'line-clamp-4',
              )}
            >
              {resource.type === 'Link' && (
                <ExternalLink className="mr-1 inline h-3 w-3" />
              )}
              {truncatedPreview}
              {preview.length > truncatedPreview.length && '...'}
            </p>
          )}

          {size === 'lg' && resource.tags && resource.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {resource.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
