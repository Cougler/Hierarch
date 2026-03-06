'use client';

import { FocusTimerWidget } from '@/app/components/FocusTimerWidget';
import type { TimeEntry } from '@/app/types';

interface FocusTimerViewProps {
  onSaveEntry: (entry: Partial<TimeEntry>) => void;
}

export function FocusTimerView({ onSaveEntry }: FocusTimerViewProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center border-b border-border px-6 py-4 shrink-0">
        <div>
          <h1 className="text-lg font-semibold">Focus Timer</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Track focused work sessions</p>
        </div>
      </div>
      <div className="flex flex-1 items-start justify-center overflow-auto px-6 py-12">
        <div className="w-full max-w-sm">
          <FocusTimerWidget onSaveEntry={onSaveEntry} />
        </div>
      </div>
    </div>
  );
}
