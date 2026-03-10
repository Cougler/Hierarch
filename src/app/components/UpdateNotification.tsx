import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const POLL_INTERVAL = 2 * 60 * 1000;

export function UpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const etagRef = useRef<string | null>(null);

  const checkForUpdate = useCallback(async () => {
    try {
      const res = await fetch('/', { method: 'HEAD', cache: 'no-cache' });
      const etag = res.headers.get('etag');
      if (!etag) return;

      if (etagRef.current === null) {
        etagRef.current = etag;
        return;
      }

      if (etag !== etagRef.current) {
        etagRef.current = etag;
        setUpdateAvailable(true);
      }
    } catch {
      // Network error — skip this check
    }
  }, []);

  useEffect(() => {
    checkForUpdate();
    const id = setInterval(checkForUpdate, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [checkForUpdate]);

  const visible = updateAvailable && !dismissed;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed bottom-4 right-4 z-50"
        >
          <Card className="w-80 shadow-lg border-primary/20">
            <CardContent className="flex items-start gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <RefreshCw className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-sm font-medium">New version available</p>
                <p className="text-xs text-muted-foreground">
                  A new version of Hierarch is ready. Refresh to get the latest updates.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={() => window.location.reload()}
                  >
                    <RefreshCw className="h-3 w-3" />
                    Refresh Now
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => setDismissed(true)}
                  >
                    Later
                  </Button>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-muted-foreground"
                onClick={() => setDismissed(true)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
