import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import {
  FolderKanban,
  CheckSquare,
  FileBox,
  Timer,
  Columns3,
  Package,
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
  'flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm';

function IconCard({ icon: Icon, label, description }: { icon: React.ElementType; label: string; description: string }) {
  return (
    <div className={ICON_CARD_CLASSES}>
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/10">
        <Icon className="h-6 w-6 text-teal-400" />
      </div>
      <h4 className="font-semibold text-white">{label}</h4>
      <p className="text-sm leading-relaxed text-gray-400">{description}</p>
    </div>
  );
}

const steps: Step[] = [
  {
    title: 'Welcome to Hierarch',
    subtitle: 'Your all-in-one workspace for getting things done.',
    content: (
      <div className="flex flex-col items-center gap-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20">
          <img src="/logo.svg" className="h-10 w-10" alt="Hierarch" />
        </div>
        <p className="max-w-md text-center leading-relaxed text-gray-300">
          Hierarch helps you organize projects, track tasks, manage resources, and stay focused
          — all in one beautiful interface.
        </p>
      </div>
    ),
  },
  {
    title: 'How It Works',
    subtitle: 'Three pillars that keep your work organized.',
    content: (
      <div className="grid gap-4 sm:grid-cols-3">
        <IconCard
          icon={FolderKanban}
          label="Projects"
          description="Group related work into projects with their own boards and timelines."
        />
        <IconCard
          icon={CheckSquare}
          label="Tasks"
          description="Break work into actionable tasks with priorities, labels, and due dates."
        />
        <IconCard
          icon={FileBox}
          label="Resources"
          description="Attach files, links, and notes to keep everything in context."
        />
      </div>
    ),
  },
  {
    title: 'Key Features',
    subtitle: 'Powerful tools to boost your productivity.',
    content: (
      <div className="grid gap-4 sm:grid-cols-3">
        <IconCard
          icon={Timer}
          label="Focus Timer"
          description="Built-in Pomodoro timer to help you stay in flow and track time spent."
        />
        <IconCard
          icon={Columns3}
          label="Kanban Board"
          description="Drag-and-drop cards across columns to visualize your workflow."
        />
        <IconCard
          icon={Package}
          label="Resource Hub"
          description="Centralized storage for all your project assets and references."
        />
      </div>
    ),
  },
  {
    title: 'Ready to Go!',
    subtitle: "You're all set. Let's build something great.",
    content: (
      <div className="flex flex-col items-center gap-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20">
          <Rocket className="h-10 w-10 text-teal-400" />
        </div>
        <p className="max-w-md text-center leading-relaxed text-gray-300">
          Your workspace is ready. Create your first project, invite teammates, and start
          shipping faster than ever.
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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gray-950 px-4 py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-teal-500/8 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-cyan-500/8 blur-[120px]" />
      </div>

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-10">
        {/* Skip button */}
        {!isLast && (
          <button
            onClick={handleComplete}
            className="absolute right-0 top-0 text-sm text-gray-500 transition-colors hover:text-gray-300"
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
              <h2 className="text-3xl font-bold text-white">{steps[currentStep].title}</h2>
              <p className="mt-2 text-gray-400">{steps[currentStep].subtitle}</p>
            </div>
            {steps[currentStep].content}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex w-full items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => goTo(currentStep - 1)}
            disabled={isFirst}
            className={cn('text-gray-400 hover:text-white', isFirst && 'invisible')}
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
                  i === currentStep ? 'w-6 bg-teal-400' : 'w-2 bg-gray-600 hover:bg-gray-500'
                )}
              />
            ))}
          </div>

          {isLast ? (
            <Button
              onClick={handleComplete}
              className="bg-teal-500 text-white hover:bg-teal-600"
            >
              Get Started
              <Rocket className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              onClick={() => goTo(currentStep + 1)}
              className="text-gray-400 hover:text-white"
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
