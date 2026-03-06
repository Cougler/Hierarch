'use client';

import { cn } from '@/app/lib/utils';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import {
  Figma,
  MessageSquare,
  Github,
  BookOpen,
  BarChart3,
  HardDrive,
  Droplets,
  Bug,
  Puzzle,
} from 'lucide-react';
import { motion } from 'motion/react';

interface AppInfo {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  connected: boolean;
  comingSoon: boolean;
}

const APPS: AppInfo[] = [
  {
    id: 'figma',
    name: 'Figma',
    description: 'Import designs and sync design tokens',
    icon: Figma,
    iconBg: 'bg-violet-500/15',
    iconColor: 'text-violet-500',
    connected: true,
    comingSoon: false,
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Get task notifications in your channels',
    icon: MessageSquare,
    iconBg: 'bg-green-500/15',
    iconColor: 'text-green-500',
    connected: false,
    comingSoon: true,
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Link PRs and commits to tasks',
    icon: Github,
    iconBg: 'bg-gray-500/15',
    iconColor: 'text-gray-400',
    connected: false,
    comingSoon: true,
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Sync pages and databases',
    icon: BookOpen,
    iconBg: 'bg-orange-500/15',
    iconColor: 'text-orange-500',
    connected: false,
    comingSoon: true,
  },
  {
    id: 'linear',
    name: 'Linear',
    description: 'Two-way issue sync with Linear',
    icon: BarChart3,
    iconBg: 'bg-blue-500/15',
    iconColor: 'text-blue-500',
    connected: false,
    comingSoon: true,
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    description: 'Attach files from Google Drive',
    icon: HardDrive,
    iconBg: 'bg-yellow-500/15',
    iconColor: 'text-yellow-500',
    connected: false,
    comingSoon: true,
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    description: 'Sync and attach Dropbox files',
    icon: Droplets,
    iconBg: 'bg-sky-500/15',
    iconColor: 'text-sky-500',
    connected: false,
    comingSoon: true,
  },
  {
    id: 'jira',
    name: 'Jira',
    description: 'Import and sync Jira issues',
    icon: Bug,
    iconBg: 'bg-indigo-500/15',
    iconColor: 'text-indigo-500',
    connected: false,
    comingSoon: true,
  },
];

export function AppsDashboard() {
  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Puzzle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Apps</h1>
            <p className="text-sm text-muted-foreground">
              Connect your favorite tools to Hierarch
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {APPS.map((app, i) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.04 }}
            >
              <Card className="group relative overflow-hidden transition-colors hover:bg-accent/50">
                {app.comingSoon && (
                  <Badge className="absolute right-3 top-3 bg-amber-500/15 text-amber-500 border-amber-500/25 text-[10px]">
                    Coming Soon
                  </Badge>
                )}
                <CardContent className="flex flex-col items-center gap-3 p-6 pt-8 text-center">
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-xl',
                      app.iconBg,
                    )}
                  >
                    <app.icon className={cn('h-6 w-6', app.iconColor)} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{app.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      {app.description}
                    </p>
                  </div>
                  <Button
                    variant={app.connected ? 'secondary' : 'outline'}
                    size="sm"
                    className="mt-1 w-full"
                    disabled={app.comingSoon}
                  >
                    {app.connected ? 'Connected' : 'Install'}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
