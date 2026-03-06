import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Camera, Check, Waves } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/app/supabase-client';
import { cn } from '@/app/lib/utils';
import { Button } from '@/app/components/ui/button';

interface AvatarSelectionProps {
  onComplete: () => void;
}

const AVATAR_COLORS = [
  'bg-teal-500',
  'bg-cyan-500',
  'bg-emerald-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-purple-500',
  'bg-fuchsia-500',
  'bg-pink-500',
  'bg-rose-500',
  'bg-red-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-yellow-500',
  'bg-lime-500',
  'bg-green-500',
  'bg-sky-500',
  'bg-blue-600',
  'bg-slate-500',
  'bg-zinc-500',
];

const AVATAR_INITIALS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K',
  'L', 'M', 'N', 'P', 'R', 'S', 'T', 'U', 'V', 'W',
];

export default function AvatarSelection({ onComplete }: AvatarSelectionProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [customPreview, setCustomPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCustomPreview(reader.result as string);
      setSelectedIndex(null);
    };
    reader.readAsDataURL(file);
  }

  async function handleContinue() {
    setLoading(true);
    try {
      let avatarUrl = '';

      if (customPreview) {
        avatarUrl = customPreview;
      } else if (selectedIndex !== null) {
        avatarUrl = `preset:${selectedIndex}`;
      }

      await supabase.auth.updateUser({
        data: { has_seen_avatar: true, avatar_url: avatarUrl },
      });

      onComplete();
    } catch {
      toast.error('Failed to save avatar');
    } finally {
      setLoading(false);
    }
  }

  async function handleSkip() {
    try {
      await supabase.auth.updateUser({ data: { has_seen_avatar: true } });
    } catch {
      /* best-effort */
    }
    onComplete();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/95 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="mx-4 flex w-full max-w-lg flex-col items-center gap-8 rounded-2xl border border-white/10 bg-gray-900/80 p-8 backdrop-blur-xl"
      >
        {/* Header */}
        <div className="text-center">
          <div className="mb-3 inline-flex items-center gap-2">
            <Waves className="h-6 w-6 text-teal-400" />
            <span className="text-xl font-bold text-white">Hierarch</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Choose Your Avatar</h2>
          <p className="mt-1 text-sm text-gray-400">Pick one or upload your own</p>
        </div>

        {/* Avatar grid */}
        <div className="grid grid-cols-5 gap-3">
          {AVATAR_COLORS.map((color, i) => (
            <button
              key={i}
              onClick={() => {
                setSelectedIndex(i);
                setCustomPreview(null);
              }}
              className={cn(
                'relative flex h-14 w-14 items-center justify-center rounded-full text-sm font-bold text-white transition-all',
                color,
                selectedIndex === i
                  ? 'ring-2 ring-teal-400 ring-offset-2 ring-offset-gray-900 scale-110'
                  : 'opacity-80 hover:opacity-100 hover:scale-105'
              )}
            >
              {selectedIndex === i ? (
                <Check className="h-5 w-5" />
              ) : (
                AVATAR_INITIALS[i]
              )}
            </button>
          ))}
        </div>

        {/* Custom upload */}
        <div className="flex flex-col items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed transition-colors',
              customPreview
                ? 'border-teal-400 ring-2 ring-teal-400 ring-offset-2 ring-offset-gray-900'
                : 'border-gray-600 hover:border-gray-400'
            )}
          >
            {customPreview ? (
              <img
                src={customPreview}
                alt="Custom avatar"
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <Camera className="h-5 w-5 text-gray-400" />
            )}
          </button>
          <span className="text-xs text-gray-500">Upload custom</span>
        </div>

        {/* Actions */}
        <div className="flex w-full gap-3">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="flex-1 text-gray-400 hover:text-white"
          >
            Skip
          </Button>
          <Button
            onClick={handleContinue}
            disabled={loading || (selectedIndex === null && !customPreview)}
            className="flex-1 bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Continue'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
