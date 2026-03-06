'use client';

import { cn } from '@/app/lib/utils';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Figma, Clock } from 'lucide-react';
import { motion } from 'motion/react';

const MOCK_FILES = [
  { id: '1', name: 'App Redesign v3', date: 'Edited 2h ago', color: 'bg-violet-500' },
  { id: '2', name: 'Component Library', date: 'Edited 1d ago', color: 'bg-blue-500' },
  { id: '3', name: 'Landing Page', date: 'Edited 3d ago', color: 'bg-emerald-500' },
  { id: '4', name: 'Mobile Screens', date: 'Edited 5d ago', color: 'bg-amber-500' },
  { id: '5', name: 'Wireframes', date: 'Edited 1w ago', color: 'bg-rose-500' },
  { id: '6', name: 'Icon Set', date: 'Edited 2w ago', color: 'bg-teal-500' },
  { id: '7', name: 'Brand Guidelines', date: 'Edited 2w ago', color: 'bg-orange-500' },
  { id: '8', name: 'Dashboard Prototype', date: 'Edited 3w ago', color: 'bg-pink-500' },
];

export function FigmaView() {
  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1e1e1e] dark:bg-white/10">
              <Figma className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Figma</h1>
              <p className="text-sm text-muted-foreground">Your design files</p>
            </div>
          </div>
          <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/25">
            Coming Soon
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {MOCK_FILES.map((file, i) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.04 }}
            >
              <Card className="group cursor-pointer overflow-hidden transition-colors hover:bg-accent/50">
                <div className={cn('relative h-32 w-full', file.color)}>
                  <div className="absolute inset-0 flex items-center justify-center opacity-20">
                    <Figma className="h-12 w-12 text-white" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </div>
                <CardContent className="p-3">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {file.date}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
