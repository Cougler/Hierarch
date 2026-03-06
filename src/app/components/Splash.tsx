import { motion } from 'motion/react';


interface SplashProps {
  message?: string;
}

export default function Splash({ message = 'Loading Workspace...' }: SplashProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500/8 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 flex flex-col items-center gap-8"
      >
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="flex items-center gap-3"
        >
          <img src="/logo.svg" className="h-10 w-10" alt="Hierarch" />
          <span className="text-5xl font-bold tracking-tight text-white">Hierarch</span>
        </motion.div>

        <div className="flex flex-col items-center gap-4">
          <motion.div
            className="h-8 w-8 rounded-full border-2 border-teal-400/30 border-t-teal-400"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-sm text-gray-400"
          >
            {message}
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
