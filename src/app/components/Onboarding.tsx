import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { supabase } from '@/app/supabase-client';
import { cn } from '@/app/lib/utils';
import * as DialogPrimitive from '@radix-ui/react-dialog';

const AMBER = 'text-[#bf7535]';
const TOTAL_STEPS = 6;

interface OnboardingProps {
  onComplete: () => void;
  onCreateProject?: (name: string, metadata?: any) => void;
  onNavigateToProject?: (projectName: string) => void;
  demoMode?: boolean;
}

interface SlideData {
  layout: 'text-left' | 'text-right' | 'text-top';
  image: string;
  content: React.ReactNode;
  textClassName?: string;
}

const slides: SlideData[] = [
  {
    layout: 'text-left',
    image: '/page1.webp',
    content: (
      <>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#bf7535]/15 mb-6">
          <img src="/logo.svg" className="h-6 w-6" alt="Hierarch" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">Welcome to Hierarch</h1>
        <p className="text-sm text-white/60 leading-relaxed">
          Work in Hierarch is made up of{' '}
          <strong className={AMBER}>Projects</strong>,{' '}
          <strong className={AMBER}>Tasks</strong> and{' '}
          <strong className={AMBER}>Artifacts</strong>.
        </p>
      </>
    ),
  },
  {
    layout: 'text-left',
    image: '/page2.webp',
    content: (
      <p className="text-sm text-white/80 leading-relaxed">
        <strong className={AMBER}>Projects</strong> flow through design phases. Jump between them freely, the way real design work moves
      </p>
    ),
  },
  {
    layout: 'text-left',
    image: '/page3.webp',
    content: (
      <p className="text-sm text-white/80 leading-relaxed">
        <strong className={AMBER}>Tasks</strong> have statuses and can live within or outside of{' '}
        <strong className={AMBER}>Projects</strong>
      </p>
    ),
  },
  {
    layout: 'text-left',
    image: '/page4.webp',
    content: (
      <p className="text-sm text-white/80 leading-relaxed">
        <strong className={AMBER}>Artifacts</strong> can be associated with{' '}
        <strong className={AMBER}>Tasks</strong> or{' '}
        <strong className={AMBER}>Projects</strong> and range from research and design files to feedback notes or video links.
      </p>
    ),
  },
  {
    layout: 'text-top',
    image: '/page5.webp',
    textClassName: 'pt-[calc(var(--spacing)*30)] max-w-[850px]',
    content: (
      <p className="text-base text-white/80 leading-relaxed">
        The <strong className={AMBER}>Overview</strong> page preps you for stand-up each day, showing{' '}
        <strong className={AMBER}>active projects</strong> that contain tasks and a 48 hour recap of{' '}
        <strong className={AMBER}>recent progress</strong>. Hit the{' '}
        <strong className={AMBER}>Standup</strong> button to generate a ready-to-read summary of what you worked on yesterday.
      </p>
    ),
  },
  {
    layout: 'text-top',
    image: '/page6.webp',
    textClassName: 'pt-[calc(var(--spacing)*30)] max-w-[550px]',
    content: (
      <p className="text-base text-white/80 leading-relaxed">
        The <strong className={AMBER}>Capacity</strong> page displays your project timelines, allowing for workload analysis at a glance.
      </p>
    ),
  },
];

export default function Onboarding({ onComplete, demoMode }: OnboardingProps) {
  const [step, setStep] = useState(0);

  async function handleComplete() {
    if (!demoMode) {
      try {
        await supabase.auth.updateUser({ data: { has_seen_onboarding: true } });
      } catch { /* best-effort */ }
    }
    onComplete();
  }

  const isLast = step === TOTAL_STEPS - 1;
  const slide = slides[step]!;

  const variants = {
    enter: { opacity: 0, x: 40 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
  };

  return (
    <DialogPrimitive.Root open onOpenChange={() => handleComplete()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed left-[50%] top-[50%] z-50 w-[calc(100vw-120px)] max-w-[1100px] h-[calc(100vh-100px)] max-h-[800px] translate-x-[-50%] translate-y-[-50%] rounded-2xl border border-border/50 bg-[#0a0a0a] shadow-2xl overflow-hidden duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <div className="relative flex flex-col h-full">
            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-8 pt-5">
              <div className="w-24">
                {step > 0 && (
                  <button
                    onClick={() => setStep(s => s - 1)}
                    className="text-sm font-light text-white/60 hover:text-white/80 transition-colors"
                  >
                    Back
                  </button>
                )}
              </div>
              <div className="flex gap-1.5">
                {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-2 rounded-full transition-all duration-300',
                      i === step ? 'w-6 bg-[#bf7535]' : 'w-2 bg-white/20'
                    )}
                  />
                ))}
              </div>
              <button
                onClick={handleComplete}
                className="text-sm font-light text-white/60 hover:text-white/80 transition-colors"
              >
                Skip
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="absolute inset-0"
                >
                  {slide.layout === 'text-top' ? (
                    /* ── Text top, image anchored bottom-left ── */
                    <div className="flex flex-col h-full">
                      <div className={cn('shrink-0 pl-[calc(var(--spacing)*20)] pr-10 pt-20 pb-6 max-w-[780px]', slide.textClassName)}>
                        {slide.content}
                      </div>
                      <div className="flex-1 min-h-0 overflow-hidden flex items-end pr-24">
                        <img
                          src={slide.image}
                          alt=""
                          className="max-w-full max-h-full object-contain object-left-bottom"
                        />
                      </div>
                    </div>
                  ) : (
                    /* ── Side-by-side: text + image ── */
                    <div className={cn(
                      'flex h-full',
                      slide.layout === 'text-right' && 'flex-row-reverse'
                    )}>
                      {/* Text */}
                      <div className={cn(
                        'w-[350px] shrink-0 flex items-center pt-12',
                        slide.layout === 'text-left' ? 'pl-[calc(var(--spacing)*20)] pr-4' : 'pr-[calc(var(--spacing)*20)] pl-4'
                      )}>
                        <div>{slide.content}</div>
                      </div>
                      {/* Image */}
                      <div className="flex-1 min-w-0 pt-16 pr-16 pl-2 overflow-hidden flex items-end justify-center">
                        <img
                          src={slide.image}
                          alt=""
                          className="max-w-[88%] max-h-[90%] object-contain object-bottom"
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Next / Get started button */}
            {isLast ? (
              <button
                autoFocus
                onClick={handleComplete}
                className="absolute right-6 top-1/2 -translate-y-1/2 z-20 flex items-center gap-2 rounded-full bg-[#bf7535] px-5 py-3 text-sm font-medium text-white hover:bg-[#bf7535]/90 transition-colors shadow-lg"
              >
                Get started
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                autoFocus
                onClick={() => setStep(s => s + 1)}
                className="absolute right-6 top-1/2 -translate-y-1/2 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-[#bf7535] text-white hover:bg-[#bf7535]/90 transition-colors shadow-lg"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
