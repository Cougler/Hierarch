import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight, ChevronLeft, ChevronRight, Rocket,
  Lock, FileText, Figma, MessageSquare, User,
  PenLine, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/app/supabase-client';
import { cn } from '@/app/lib/utils';
import { Button } from '@/app/components/ui/button';

interface OnboardingProps {
  onComplete: () => void;
}

interface Step {
  content: React.ReactNode;
}

function UserStory({ action, then }: { action: string; then: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm text-foreground leading-relaxed">
        <span className="text-muted-foreground">As a designer, I</span> {action}
      </p>
      <p className="text-[11px] text-muted-foreground/50 pl-4 border-l-2 border-primary/20 leading-relaxed">
        {then}
      </p>
    </div>
  );
}

// ─── Mock UI pieces ──────────────────────────────────────────────────────────

function MockPhaseList() {
  return (
    <div className="rounded-xl border border-border bg-card/50 w-full overflow-hidden">
      {[
        { title: 'Competitor audit', phase: 'To Do', color: 'bg-slate-500' },
        { title: 'User interviews', phase: 'To Do', color: 'bg-slate-500' },
        { title: 'Nav redesign', phase: 'In Progress', color: 'bg-blue-500' },
        { title: 'Dashboard v2', phase: 'In Progress', color: 'bg-blue-500' },
        { title: 'Onboarding flow', phase: 'Feedback', color: 'bg-orange-500' },
        { title: 'Login page', phase: 'Done', color: 'bg-emerald-500' },
      ].map((task, i) => (
        <div key={task.title} className={cn('flex items-center gap-3 px-3 py-2', i > 0 && 'border-t border-border/50')}>
          <span className={cn('h-2 w-2 rounded-full shrink-0', task.color)} />
          <span className="text-[10px] text-foreground/80 flex-1">{task.title}</span>
          <span className="text-[9px] text-muted-foreground/40">{task.phase}</span>
        </div>
      ))}
    </div>
  );
}

function MockReviewFlow() {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-3 w-full space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-background px-2.5 py-1.5 flex-1">
          <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
          <span className="text-[10px] text-foreground/80 flex-1">Nav redesign</span>
        </div>
        <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
        <div className="flex items-center gap-1.5 rounded-md border border-orange-500/30 bg-orange-500/5 px-2.5 py-1.5">
          <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0" />
          <span className="text-[10px] text-orange-700 dark:text-orange-400 font-medium">Feedback</span>
        </div>
      </div>
      <div className="flex justify-center">
        <div className="h-4 w-px bg-border" />
      </div>
      <div className="rounded-lg border border-border bg-background p-3 space-y-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-3 w-3 text-emerald-700 dark:text-emerald-400" />
          <span className="text-[10px] font-medium text-foreground">Feedback: Nav redesign</span>
          <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[8px] text-emerald-700 dark:text-emerald-400 font-medium ml-auto">auto-created</span>
        </div>
        <div className="flex items-center gap-2 pl-5">
          <User className="h-3 w-3 text-muted-foreground/40" />
          <span className="text-[10px] text-muted-foreground/60">Sarah, Design Lead</span>
        </div>
        <div className="pl-5">
          <div className="rounded-md bg-muted/30 px-2.5 py-2 text-[10px] text-muted-foreground/60 italic leading-relaxed">
            "Spacing feels tight on the secondary nav items. Try 12px gap."
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 justify-center">
        <span className="text-[9px] text-muted-foreground/40">then back to</span>
        <div className="flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          <span className="text-[9px] text-blue-700 dark:text-blue-400 font-medium">In Progress</span>
        </div>
      </div>
    </div>
  );
}

function MockDailyFlowGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 w-full">
      <div className="rounded-xl border border-border bg-card/50 p-3 space-y-2">
        <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">Projects</span>
        <div className="space-y-1">
          {['App Redesign', 'Design System'].map(name => (
            <div key={name} className="flex items-center gap-2 rounded-md bg-background px-2 py-1.5">
              <span className="text-[10px] text-foreground/80">{name}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card/50 p-3 space-y-2">
        <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">Tasks</span>
        <div className="space-y-1">
          {[
            { title: 'Nav redesign', color: 'bg-blue-500', phase: 'In Progress' },
            { title: 'Icon system', color: 'bg-slate-500', phase: 'To Do' },
          ].map(t => (
            <div key={t.title} className="flex items-center gap-2 rounded-md bg-background px-2 py-1.5">
              <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', t.color)} />
              <span className="text-[10px] text-foreground/80 flex-1">{t.title}</span>
              <span className="text-[8px] text-muted-foreground/40">{t.phase}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card/50 p-3 space-y-2">
        <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">Artifacts</span>
        <div className="space-y-1">
          {[
            { icon: FileText, color: 'text-blue-700 dark:text-blue-400', title: 'Design rationale' },
            { icon: Figma, color: 'text-pink-700 dark:text-pink-400', title: 'Dashboard mockup' },
            { icon: PenLine, color: 'text-amber-700 dark:text-amber-400', title: 'Spacing decision' },
          ].map(a => (
            <div key={a.title} className="flex items-center gap-2 rounded-md bg-background px-2 py-1.5">
              <a.icon className={cn('h-3 w-3 shrink-0', a.color)} />
              <span className="text-[10px] text-foreground/80">{a.title}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card/50 p-3 space-y-2">
        <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">Blockers</span>
        <div className="space-y-1">
          <div className="flex items-center gap-2 rounded-md bg-background px-2 py-1.5">
            <Lock className="h-3 w-3 shrink-0 text-destructive/50" />
            <span className="text-[10px] text-foreground/80 flex-1">API docs</span>
            <span className="text-[8px] text-muted-foreground/30">3d</span>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-background px-2 py-1.5">
            <Check className="h-3 w-3 shrink-0 text-emerald-500/50" />
            <span className="text-[10px] text-muted-foreground/40 line-through flex-1">Brand assets</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockOverview() {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-3 w-full space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/50">Overview</span>
        <span className="text-[9px] text-muted-foreground/30">Monday morning</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="border-t border-b border-border/50 px-2 py-1.5">
          <p className="text-sm font-medium text-foreground/80">3</p>
          <p className="text-[9px] text-muted-foreground/50">Active</p>
        </div>
        <div className="border-t border-b border-border/50 px-2 py-1.5">
          <p className="text-sm font-medium text-attention">2</p>
          <p className="text-[9px] text-muted-foreground/50">Blocked</p>
        </div>
        <div className="border-t border-b border-border/50 px-2 py-1.5">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400/80">5</p>
          <p className="text-[9px] text-muted-foreground/50">Done</p>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2.5 rounded-md bg-background px-2.5 py-1.5">
          <Lock className="h-3 w-3 text-destructive/50 shrink-0" />
          <span className="text-[10px] text-foreground/80 flex-1">Dashboard v2</span>
          <span className="text-[9px] text-attention">Blocked 3d</span>
        </div>
        <div className="flex items-center gap-2.5 rounded-md bg-background px-2.5 py-1.5">
          <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0" />
          <span className="text-[10px] text-foreground/80 flex-1">Onboarding flow</span>
          <span className="text-[9px] text-muted-foreground/40">In review</span>
        </div>
      </div>
    </div>
  );
}

// ─── Step content (right column only) ────────────────────────────────────────

const steps: Step[] = [
  {
    content: (
      <div className="space-y-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
          <img src="/logo.svg" className="h-6 w-6" alt="Hierarch" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Welcome to Hierarch</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Projects move through design phases. Tasks have simple statuses.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { label: 'Research', bg: 'bg-rose-500/15', text: 'text-rose-700 dark:text-rose-400' },
            { label: 'Explore', bg: 'bg-violet-500/15', text: 'text-violet-700 dark:text-violet-400' },
            { label: 'Design', bg: 'bg-blue-500/15', text: 'text-blue-700 dark:text-blue-400' },
            { label: 'Iterate', bg: 'bg-amber-500/15', text: 'text-amber-700 dark:text-amber-400' },
            { label: 'Review', bg: 'bg-orange-500/15', text: 'text-orange-700 dark:text-orange-400' },
            { label: 'Handoff', bg: 'bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-400' },
          ].map((p, i, arr) => (
            <span key={p.label} className="flex items-center gap-1.5">
              <span className={cn('rounded-full px-2.5 py-1 font-medium', p.bg, p.text)}>{p.label}</span>
              {i < arr.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/20" />}
            </span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground/50">
          Move forward, jump back, skip phases. Your process, your call.
        </p>
        <MockPhaseList />
      </div>
    ),
  },
  {
    content: (
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Built-in feedback loop</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Moving a task to <strong className="text-orange-700 dark:text-orange-400">Feedback</strong> auto-creates a feedback note. Record who reviewed it and what they said.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            When you're ready to act on it, move back to <strong className="text-blue-700 dark:text-blue-400">In Progress</strong>. The full history stays with the task.
          </p>
        </div>
        <MockReviewFlow />
      </div>
    ),
  },
  {
    content: (
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Everything you need</h2>
          <p className="text-xs text-muted-foreground">How designers use Hierarch</p>
        </div>
        <div className="flex flex-col gap-4">
          <UserStory
            action="create a project for each initiative."
            then="Tasks, artifacts, blockers, and phase history all stay grouped."
          />
          <UserStory
            action="break work into tasks: To Do, In Progress, Feedback, Done."
            then="Board view for the big picture, list view for triage."
          />
          <UserStory
            action="attach artifacts: notes, decisions, Figma files, links, videos."
            then="Every artifact links to a task or project."
          />
          <UserStory
            action="mark blockers when I'm waiting on someone."
            then="Blocked tasks surface on the Overview after 3 days."
          />
        </div>
        <MockDailyFlowGrid />
      </div>
    ),
  },
  {
    content: (
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">You're ready</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Open the <strong className="text-foreground">Overview</strong> each morning to run standup: what's blocked, what's in review, and where to focus your day.
          </p>
        </div>
        <MockOverview />
        <div className="rounded-xl border border-border bg-card/50 p-4 space-y-3">
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/50">Quick reference</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <span className="text-muted-foreground">Projects</span>
            <span className="text-foreground">Group work by initiative</span>
            <span className="text-muted-foreground">Tasks</span>
            <span className="text-foreground">To Do, In Progress, Done</span>
            <span className="text-muted-foreground">Artifacts</span>
            <span className="text-foreground">Notes, links, files, videos</span>
            <span className="text-muted-foreground">Blockers</span>
            <span className="text-foreground">Track what you're waiting on</span>
            <span className="text-muted-foreground">Overview</span>
            <span className="text-foreground">Your morning standup</span>
          </div>
        </div>
      </div>
    ),
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);

  function goTo(step: number) {
    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
  }

  async function handleComplete() {
    try {
      await supabase.auth.updateUser({ data: { has_seen_onboarding: true } });
    } catch {
      toast.error('Failed to save onboarding status');
    }
    onComplete();
  }

  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-primary/[0.06] blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/[0.04] blur-[120px]" />
      </div>

      {/* Top bar: back, progress, skip */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-8 py-5">
        {!isFirst ? (
          <button
            onClick={() => goTo(currentStep - 1)}
            className="text-xs text-muted-foreground/40 hover:text-foreground transition-colors flex items-center gap-0.5"
          >
            <ChevronLeft className="h-3 w-3" />
            Back
          </button>
        ) : (
          <div className="w-10" />
        )}

        <div className="flex gap-1.5">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === currentStep ? 'w-5 bg-primary' : 'w-1.5 bg-border hover:bg-muted-foreground'
              )}
            />
          ))}
        </div>

        {!isLast ? (
          <button
            onClick={handleComplete}
            className="text-xs text-muted-foreground/30 hover:text-foreground transition-colors"
          >
            Skip
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* Left column: content */}
      <div className="relative z-10 flex-1 flex items-center justify-center py-16 pl-8 overflow-y-auto">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="w-full max-w-2xl"
          >
            {steps[currentStep]?.content}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Right column: main action */}
      <div className="relative z-10 flex w-[280px] shrink-0 flex-col items-center justify-center px-8">
        {isLast ? (
          <button
            onClick={handleComplete}
            className="h-20 w-20 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center shadow-lg shadow-primary/20"
          >
            <Rocket className="h-6 w-6" />
          </button>
        ) : (
          <button
            onClick={() => goTo(currentStep + 1)}
            className="h-20 w-20 rounded-full border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
        <span className="mt-3 text-xs text-muted-foreground/40">
          {isLast ? 'Get Started' : 'Next'}
        </span>
      </div>
    </div>
  );
}
