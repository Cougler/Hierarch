import { cn } from '@/app/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';

export interface FigmaAvatar {
  id: string;
  url: string;
  label: string;
}

export const FIGMA_AVATARS: FigmaAvatar[] = [
  { id: 'avatar-01', url: '', label: 'Amber' },
  { id: 'avatar-02', url: '', label: 'Blue' },
  { id: 'avatar-03', url: '', label: 'Coral' },
  { id: 'avatar-04', url: '', label: 'Dusk' },
  { id: 'avatar-05', url: '', label: 'Emerald' },
  { id: 'avatar-06', url: '', label: 'Fern' },
  { id: 'avatar-07', url: '', label: 'Gold' },
  { id: 'avatar-08', url: '', label: 'Harbor' },
  { id: 'avatar-09', url: '', label: 'Iris' },
  { id: 'avatar-10', url: '', label: 'Jade' },
  { id: 'avatar-11', url: '', label: 'Kiwi' },
  { id: 'avatar-12', url: '', label: 'Lavender' },
  { id: 'avatar-13', url: '', label: 'Mint' },
  { id: 'avatar-14', url: '', label: 'Navy' },
  { id: 'avatar-15', url: '', label: 'Orchid' },
  { id: 'avatar-16', url: '', label: 'Peach' },
  { id: 'avatar-17', url: '', label: 'Quartz' },
  { id: 'avatar-18', url: '', label: 'Rose' },
  { id: 'avatar-19', url: '', label: 'Sage' },
  { id: 'avatar-20', url: '', label: 'Teal' },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const SIZE_MAP = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
} as const;

interface UserAvatarProps {
  url?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function UserAvatar({ url, name = '', size = 'md', className }: UserAvatarProps) {
  const initials = getInitials(name) || '?';

  return (
    <Avatar className={cn(SIZE_MAP[size], className)}>
      {url && <AvatarImage src={url} alt={name || 'User avatar'} />}
      <AvatarFallback className="bg-teal-500/20 font-semibold text-teal-300">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
