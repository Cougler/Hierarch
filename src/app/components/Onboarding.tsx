import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import {
  FolderKanban,
  StickyNote,
  Compass,
  ArrowRight,
  Layers,
  Rocket,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/app/supabase-client';
import { cn } from '@/app/lib/utils';
import { Button } from '@/app/components/ui/button';

interface OnboardingProps {
  onComplete: () => void;
}

interface Step {
  title: string;
  subtitle: string;
  content: React.ReactNode;
}

const ICON_CARD_CLASSES =
  'flex flex-col items-center gap-3 rounded-2xl border border-border bg-secondary/50 p-6 text-center backdrop-blur-sm';

function IconCard({ icon: Icon, label, description }: { icon: React.ElementType; label: string; description: string }) {
  return (
    <div className={ICON_CARD_CLASSES}>
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h4 className="font-semibold text-foreground">{label}</h4>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

const steps: Step[] = [
  {
    title: 'Welcome to Hierarch',
    subtitle: 'A design workspace that thinks the way you work.',
    content: (
      <div className="flex flex-col items-center gap-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/15">
          <img src="/logo.svg" className="h-10 w-10" alt="Hierarch" />
        </div>
        <p className="max-w-md text-center leading-relaxed text-muted-foreground">
          Hierarch organizes your design projects around nonlinear phases — explore, define, refine, get feedback, and hand off — instead of a rigid status pipeline.
        </p>
      </div>
    ),
  },
  {
    title: 'Projects, Tasks & Notes',
    subtitle: 'Everything lives together.',
    content: (
      <div className="grid gap-4 sm:grid-cols-3">
        <IconCard
          icon={FolderKanban}
          label="Projects"
          description="Group your work by client or initiative. Each project has its own board, resources, and timeline."
        />
        <IconCard
          icon={Layers}
          label="Tasks"
          description="Tasks move through design phases — not just 'to-do' and 'done.' View them as a board or a list."
        />
        <IconCard
          icon={StickyNote}
          label="Design Notes"
          description="Capture decisions, feedback, and research. Notes attach to projects and show up in your activity feed."
        />
      </div>
    ),
  },
  {
    title: 'Your Overview',
    subtitle: 'Start each day with clarity.',
    content: (
      <div className="flex flex-col items-center gap-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/15">
          <Compass className="h-10 w-10 text-primary" />
        </div>
        <div className="max-w-md space-y-3 text-center text-sm leading-relaxed text-muted-foreground">
          <p>
            The <strong className="text-foreground">Overview</strong> page shows your active projects, what needs attention, and recent progress — phase changes, new tasks, notes, and more.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/80">
            <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-violet-400">Explore</span>
            <ArrowRight className="h-3 w-3" />
            <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-blue-400">Define</span>
            <ArrowRight className="h-3 w-3" />
            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-amber-400">Refine</span>
            <ArrowRight className="h-3 w-3" />
            <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-orange-400">Feedback</span>
            <ArrowRight className="h-3 w-3" />
            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-emerald-400">Handoff</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Ready to Go',
    subtitle: "You're all set.",
    content: (
      <div className="flex flex-col items-center gap-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/15">
          <Rocket className="h-10 w-10 text-primary" />
        </div>
        <p className="max-w-md text-center leading-relaxed text-muted-foreground">
          Create your first project, add some tasks, and start moving work through your design phases.
        </p>
      </div>
    ),
  },
];

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
    enter: (d: number) => ({ x: d > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -80 : 80, opacity: 0 }),
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-primary/[0.06] blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/[0.04] blur-[120px]" />
      </div>

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-10">
        {/* Skip button */}
        {!isLast && (
          <button
            onClick={handleComplete}
            className="absolute right-0 top-0 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Skip
          </button>
        )}

        {/* Step content */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="flex w-full flex-col items-center gap-8"
          >
            <div className="text-center">
              <h2 className="text-3xl font-bold text-foreground">{steps[currentStep]?.title}</h2>
              <p className="mt-2 text-muted-foreground">{steps[currentStep]?.subtitle}</p>
            </div>
            {steps[currentStep]?.content}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex w-full items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => goTo(currentStep - 1)}
            disabled={isFirst}
            className={cn('text-muted-foreground hover:text-foreground', isFirst && 'invisible')}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>

          {/* Progress dots */}
          <div className="flex gap-2">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  i === currentStep ? 'w-6 bg-primary' : 'w-2 bg-border hover:bg-muted-foreground'
                )}
              />
            ))}
          </div>

          {isLast ? (
            <Button
              onClick={handleComplete}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Get Started
              <Rocket className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              onClick={() => goTo(currentStep + 1)}
              className="text-muted-foreground hover:text-foreground"
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
