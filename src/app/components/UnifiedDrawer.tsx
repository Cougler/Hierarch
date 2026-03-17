'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/app/lib/utils';
import { ArrowLeft, ChevronRight, X } from 'lucide-react';
import { useIsMobile } from '@/app/hooks/use-mobile';
import type { Task, StatusConfig, Project, BlockerType } from '@/app/types';
import type { Artifact } from '@/app/components/NoteDrawer';

import { TaskDetailsDrawer } from './TaskDetailsDrawer';
import { NoteDrawer } from './NoteDrawer';
import { ProjectDrawerContent } from './ProjectDrawerContent';

// ─── Types ──────────────────────────────────────────────────────────────────

export type DrawerFrame =
  | { type: 'project'; projectId: string }
  | { type: 'task'; taskId: string }
  | { type: 'artifact'; artifactId: string };

interface UnifiedDrawerProps {
  stack: DrawerFrame[];
  direction: 1 | -1;
  onClose: () => void;
  onBack: () => void;
  onPushTask: (task: Task) => void;
  onPushArtifact: (artifact: Artifact) => void;
  // Data
  projects: Project[];
  tasks: Task[];
  statuses: StatusConfig[];
  artifacts: Artifact[];
  selectedTask: Task | null;
  selectedArtifact: Artifact | null;
  previewProject: Project | null;
  // Callbacks
  onTaskUpdate: (id: string, updates: Partial<Task>) => void;
  onTaskDelete: (id: string) => void;
  onArtifactUpdate: (id: string, updates: Partial<Artifact>) => void;
  onArtifactDelete: (id: string) => void;
  onArtifactCreate: (projectId: string) => void;
  onProjectUpdate?: (id: string, updates: Partial<Project>) => void;
  onViewChange: (view: string) => void;
  onCreateBlocker?: (taskId: string, blocker: { type: BlockerType; title: string; owner?: string }) => void;
  onResolveBlocker?: (taskId: string, blockerId: string, unresolve?: boolean) => void;
  onDeleteBlocker?: (taskId: string, blockerId: string) => void;
  onArtifactCreateForTask?: (taskId: string) => void;
}

// ─── Breadcrumb label helpers ───────────────────────────────────────────────

function getFrameLabel(
  frame: DrawerFrame,
  projects: Project[],
  tasks: Task[],
  artifacts: Artifact[],
): string {
  if (frame.type === 'project') {
    return projects.find(p => p.id === frame.projectId)?.name ?? 'Project';
  }
  if (frame.type === 'task') {
    return tasks.find(t => t.id === frame.taskId)?.title ?? 'Task';
  }
  const art = artifacts.find(a => a.id === frame.artifactId);
  return art?.title || 'Artifact';
}

function getFrameType(frame: DrawerFrame): string {
  if (frame.type === 'project') return 'Project';
  if (frame.type === 'task') return 'Task';
  return 'Artifact';
}

// ─── Content variants ───────────────────────────────────────────────────────

const contentVariants = {
  enter: (dir: number) => ({ x: dir * 60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -60, opacity: 0 }),
};

const contentTransition = { type: 'tween' as const, duration: 0.2, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] };

// ─── Component ──────────────────────────────────────────────────────────────

export function UnifiedDrawer({
  stack,
  direction,
  onClose,
  onBack,
  onPushTask,
  onPushArtifact,
  projects,
  tasks,
  statuses,
  artifacts,
  selectedTask,
  selectedArtifact,
  previewProject,
  onTaskUpdate,
  onTaskDelete,
  onArtifactUpdate,
  onArtifactDelete,
  onArtifactCreate,
  onProjectUpdate,
  onViewChange,
  onCreateBlocker,
  onResolveBlocker,
  onDeleteBlocker,
  onArtifactCreateForTask,
}: UnifiedDrawerProps) {
  const isMobile = useIsMobile();
  const isOpen = stack.length > 0;
  const currentFrame = stack[stack.length - 1];
  const canGoBack = stack.length > 1;

  const frameKey = currentFrame
    ? `${currentFrame.type}-${'projectId' in currentFrame ? currentFrame.projectId : 'taskId' in currentFrame ? currentFrame.taskId : currentFrame.artifactId}`
    : 'empty';

  // Build breadcrumb trail
  const breadcrumbs = stack.map((frame, i) => ({
    label: getFrameLabel(frame, projects, tasks, artifacts),
    typeLabel: getFrameType(frame),
    isActive: i === stack.length - 1,
  }));

  // Render the active content
  const renderContent = () => {
    if (!currentFrame) return null;

    if (currentFrame.type === 'project' && previewProject) {
      return (
        <ProjectDrawerContent
          project={previewProject}
          tasks={tasks}
          statuses={statuses}
          artifacts={artifacts}
          onTaskClick={onPushTask}
          onArtifactClick={onPushArtifact}
          onArtifactCreate={onArtifactCreate}
          onProjectUpdate={onProjectUpdate}
          onViewChange={onViewChange}
          onClose={onClose}
        />
      );
    }

    if (currentFrame.type === 'task' && selectedTask) {
      return (
        <TaskDetailsDrawer
          task={selectedTask}
          open={true}
          onOpenChange={() => {}}
          projects={projects}
          statuses={statuses}
          artifacts={artifacts}
          onUpdate={onTaskUpdate}
          onDelete={(id) => { onTaskDelete(id); onClose(); }}
          onArtifactClick={onPushArtifact}
          onCreateBlocker={onCreateBlocker}
          onResolveBlocker={onResolveBlocker}
          onDeleteBlocker={onDeleteBlocker}
          onArtifactCreate={onArtifactCreateForTask}
          embedded
        />
      );
    }

    if (currentFrame.type === 'artifact' && selectedArtifact) {
      return (
        <NoteDrawer
          note={selectedArtifact}
          open={true}
          onOpenChange={() => {}}
          projects={projects}
          tasks={tasks}
          onUpdate={onArtifactUpdate}
          onDelete={(id) => { onArtifactDelete(id); onClose(); }}
          embedded
        />
      );
    }

    return null;
  };

  if (isMobile) {
    // On mobile, fall through to standalone drawers (handled by App.tsx)
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && currentFrame && (
        <>
          {/* Floating close button */}
          <motion.button
            key="unified-drawer-close"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 0.85, x: 0 }}
            exit={{ opacity: 0, x: 40, transition: { type: 'spring', stiffness: 420, damping: 32, mass: 0.7 } }}
            whileHover={{ opacity: 1 }}
            transition={{ delay: 0.25, type: 'spring', stiffness: 320, damping: 28 }}
            onClick={onClose}
            className="fixed top-8 right-[460px] z-50 flex h-[60px] w-8 items-center justify-center rounded-full bg-drawer text-muted-foreground shadow-lg border border-border hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </motion.button>

          {/* Drawer shell */}
          <motion.div
            key="unified-drawer"
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.7 }}
            style={{ transformOrigin: 'top right' }}
            className="fixed top-8 right-8 bottom-8 z-50 w-[420px] rounded-2xl bg-drawer shadow-2xl border border-border overflow-hidden flex flex-col"
          >
            {/* Navigation bar */}
            <div className="shrink-0 flex items-center gap-2 px-4 pt-4 pb-2">
              {/* Back button */}
              {canGoBack && (
                <button
                  onClick={onBack}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-surface transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}

              {/* Breadcrumbs */}
              <div className="flex items-center gap-1 min-w-0 flex-1">
                {breadcrumbs.map((crumb, i) => (
                  <div key={i} className="flex items-center gap-1 min-w-0">
                    {i > 0 && <ChevronRight className="h-2.5 w-2.5 text-muted-foreground/20 shrink-0" />}
                    <span
                      className={cn(
                        'text-[10px] font-medium uppercase tracking-widest truncate',
                        crumb.isActive
                          ? 'text-muted-foreground'
                          : 'text-muted-foreground/30',
                      )}
                    >
                      {crumb.typeLabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Content area with transitions */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <AnimatePresence mode="popLayout" custom={direction} initial={false}>
                <motion.div
                  key={frameKey}
                  custom={direction}
                  variants={contentVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={contentTransition}
                  className="h-full"
                >
                  {renderContent()}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
