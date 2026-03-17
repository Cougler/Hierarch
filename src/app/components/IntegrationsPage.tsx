import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, MessageSquare, Figma, Plug, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/app/lib/utils';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import * as linearApi from '@/app/api/linear';

const TOKEN_KEY = 'hierarch-linear-token';

interface IntegrationsPageProps {
  onViewChange: (view: string) => void;
}

export function IntegrationsPage({ onViewChange }: IntegrationsPageProps) {
  const [hasLinear, setHasLinear] = useState(() => !!localStorage.getItem(TOKEN_KEY));
  const [connectDrawer, setConnectDrawer] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const tokenRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (connectDrawer) {
      setTimeout(() => tokenRef.current?.focus(), 200);
    }
  }, [connectDrawer]);

  const handleLinearConnect = async () => {
    const t = token.trim();
    if (!t) return;
    setLoading(true);
    try {
      await linearApi.getViewer(t);
      localStorage.setItem(TOKEN_KEY, t);
      setHasLinear(true);
      setConnectDrawer(null);
      setToken('');
      toast.success('Connected to Linear');
    } catch {
      toast.error('Invalid API key — check your Linear personal token');
    } finally {
      setLoading(false);
    }
  };

  const closeDrawer = () => {
    setConnectDrawer(null);
    setToken('');
  };

  const integrations = [
    {
      id: 'linear',
      name: 'Linear',
      description: 'Sync issues and track design work alongside your team.',
      icon: <img src="/linear.svg" alt="Linear" className="h-4 w-4 invert-on-light" />,
      connected: hasLinear,
      onClick: () => hasLinear ? onViewChange('linear') : setConnectDrawer('linear'),
    },
    {
      id: 'jira',
      name: 'Jira',
      description: 'Pull in Jira issues and keep design tasks in sync.',
      icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.35V2.84a.84.84 0 0 0-.84-.84H11.53ZM6.77 6.8a4.36 4.36 0 0 0 4.34 4.34h1.8v1.72a4.36 4.36 0 0 0 4.34 4.34V7.63a.84.84 0 0 0-.84-.84H6.77ZM2 11.6a4.35 4.35 0 0 0 4.35 4.35h1.78v1.7c0 2.4 1.95 4.35 4.35 4.35v-9.56a.84.84 0 0 0-.84-.84H2Z" /></svg>,
      connected: false,
      comingSoon: true,
      onClick: () => {},
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Get notifications and share updates with your team.',
      icon: <MessageSquare className="h-5 w-5" />,
      connected: false,
      comingSoon: true,
      onClick: () => {},
    },
    {
      id: 'figma',
      name: 'Figma',
      description: 'Link design files and preview embeds on tasks.',
      icon: <Figma className="h-5 w-5" />,
      connected: false,
      comingSoon: true,
      onClick: () => {},
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
            <Plug className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="font-semibold text-sm">Integrations</span>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
          {integrations.map((integration) => (
            <button
              key={integration.id}
              onClick={integration.onClick}
              disabled={'comingSoon' in integration && integration.comingSoon}
              className={cn(
                'flex items-start gap-4 rounded-xl border p-4 text-left transition-colors',
                integration.connected
                  ? 'border-primary/30 bg-primary/[0.04] hover:bg-primary/[0.08] cursor-pointer'
                  : 'comingSoon' in integration && integration.comingSoon
                    ? 'border-border bg-muted/50 opacity-60 cursor-default'
                    : 'border-border bg-accent/30 hover:bg-accent/50 cursor-pointer',
              )}
            >
              <div className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                integration.connected ? 'bg-primary/15 text-primary' : 'bg-accent text-muted-foreground',
              )}>
                {integration.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{integration.name}</span>
                  {integration.connected && (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-500">
                      Connected
                    </span>
                  )}
                  {'comingSoon' in integration && integration.comingSoon && (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-muted-foreground/60">
                      Coming soon
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground/70 leading-relaxed">
                  {integration.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Connect drawer */}
      <AnimatePresence>
        {connectDrawer && (
          <>
            {/* Close button */}
            <motion.button
              key="connect-drawer-close"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 0.85, x: 0 }}
              exit={{ opacity: 0, x: 40, transition: { type: 'spring', stiffness: 420, damping: 32, mass: 0.7 } }}
              whileHover={{ opacity: 1 }}
              transition={{ delay: 0.25, type: 'spring', stiffness: 320, damping: 28 }}
              onClick={closeDrawer}
              className="fixed top-8 right-[460px] z-50 flex h-[60px] w-8 items-center justify-center rounded-full bg-card text-muted-foreground shadow-lg border border-border hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </motion.button>

            {/* Drawer panel */}
            <motion.div
              key="connect-drawer"
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.7 }}
              style={{ transformOrigin: 'top right' }}
              className="fixed top-8 right-8 bottom-8 z-50 w-[420px] rounded-2xl bg-card shadow-2xl border border-border overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="shrink-0 px-5 pt-5 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                    <img src="/linear.svg" alt="Linear" className="h-5 w-5 invert-on-light" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Connect to Linear</h3>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      Sync issues and track design work alongside your team.
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 px-5 py-5 space-y-5">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 block mb-2">
                    Personal API key
                  </label>
                  <Input
                    ref={tokenRef}
                    type="password"
                    placeholder="lin_api_..."
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLinearConnect()}
                    className="font-mono text-sm bg-surface border-border placeholder:text-muted-foreground/50 focus-visible:ring-ring/30"
                  />
                  <p className="text-[11px] text-muted-foreground/50 mt-2">
                    Get it at <span className="font-mono text-[#5E6AD2]">linear.app &rarr; Settings &rarr; API &rarr; Personal API keys</span>
                  </p>
                </div>

                <Button
                  onClick={handleLinearConnect}
                  disabled={loading || !token.trim()}
                  className="w-full bg-[#bf7535] hover:bg-[#bf7535]/90 text-white disabled:opacity-40"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Connect
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
