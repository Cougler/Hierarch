import { useState } from 'react';
import { Loader2, MessageSquare, Figma, Plug } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/app/lib/utils';
import { useLinearToken } from '@/app/hooks/use-linear-token';
import { useFigmaToken } from '@/app/hooks/use-figma-token';
import { useJiraToken } from '@/app/hooks/use-jira-token';

interface IntegrationsPageProps {
  onViewChange: (view: string) => void;
}

export function IntegrationsPage({ onViewChange }: IntegrationsPageProps) {
  const linear = useLinearToken();
  const figma = useFigmaToken();
  const jira = useJiraToken();
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const handleConnect = async (id: string, startOAuth: () => Promise<void>) => {
    setConnectingId(id);
    try {
      await startOAuth();
    } catch {
      toast.error(`Failed to start ${id} connection`);
      setConnectingId(null);
    }
  };

  const handleDisconnect = async (e: React.MouseEvent, id: string, disconnect: () => Promise<void>) => {
    e.stopPropagation();
    try {
      await disconnect();
      toast.success(`Disconnected from ${id}`);
    } catch {
      toast.error('Failed to disconnect');
    }
  };

  const integrations = [
    {
      id: 'linear',
      name: 'Linear',
      description: linear.isConnected && linear.viewer
        ? `Connected as ${linear.viewer.name}`
        : 'Sync issues and track design work alongside your team.',
      icon: <img src="/linear.svg" alt="Linear" className="h-4 w-4 invert-on-light" />,
      connected: linear.isConnected,
      loading: linear.isLoading,
      onClick: () => linear.isConnected ? onViewChange('linear') : handleConnect('linear', linear.startOAuth),
      onDisconnect: (e: React.MouseEvent) => handleDisconnect(e, 'Linear', linear.disconnect),
    },
    {
      id: 'figma',
      name: 'Figma',
      description: figma.isConnected && figma.viewer
        ? `Connected as ${figma.viewer.name}`
        : 'Browse files, link designs to tasks, and sync comments.',
      icon: <Figma className="h-5 w-5" />,
      connected: figma.isConnected,
      loading: figma.isLoading,
      comingSoon: window.location.hostname !== 'localhost',
      onClick: () => figma.isConnected ? onViewChange('figma') : handleConnect('figma', figma.startOAuth),
      onDisconnect: (e: React.MouseEvent) => handleDisconnect(e, 'Figma', figma.disconnect),
    },
    {
      id: 'jira',
      name: 'Jira',
      description: jira.isConnected && jira.viewer
        ? `Connected as ${jira.viewer.name}`
        : 'Pull in Jira issues and keep design tasks in sync.',
      icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.35V2.84a.84.84 0 0 0-.84-.84H11.53ZM6.77 6.8a4.36 4.36 0 0 0 4.34 4.34h1.8v1.72a4.36 4.36 0 0 0 4.34 4.34V7.63a.84.84 0 0 0-.84-.84H6.77ZM2 11.6a4.35 4.35 0 0 0 4.35 4.35h1.78v1.7c0 2.4 1.95 4.35 4.35 4.35v-9.56a.84.84 0 0 0-.84-.84H2Z" /></svg>,
      connected: jira.isConnected,
      loading: jira.isLoading,
      onClick: () => jira.isConnected ? onViewChange('jira') : handleConnect('jira', jira.startOAuth),
      onDisconnect: (e: React.MouseEvent) => handleDisconnect(e, 'Jira', jira.disconnect),
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Get notifications and share updates with your team.',
      icon: <MessageSquare className="h-5 w-5" />,
      connected: false,
      loading: false,
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
          {integrations.map((integration) => {
            const isConnecting = connectingId === integration.id;
            const isDisabled = ('comingSoon' in integration && integration.comingSoon) || isConnecting || integration.loading;

            return (
              <button
                key={integration.id}
                onClick={integration.onClick}
                disabled={isDisabled}
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
                  {isConnecting || integration.loading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : integration.icon}
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
                  {integration.connected && 'onDisconnect' in integration && (
                    <button
                      onClick={integration.onDisconnect}
                      className="mt-2 text-[11px] text-muted-foreground/50 hover:text-destructive transition-colors"
                    >
                      Disconnect
                    </button>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
