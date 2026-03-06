'use client';

import { cn } from '@/app/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Label } from '@/app/components/ui/label';
import { Switch } from '@/app/components/ui/switch';
import { Separator } from '@/app/components/ui/separator';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { Settings, Sun, Moon, Monitor, FolderOpen } from 'lucide-react';
import { useTheme } from '@/app/components/ThemeProvider';

interface SettingsPageProps {
  showProjectIcons: boolean;
  onShowProjectIconsChange: (show: boolean) => void;
}

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

export function SettingsPage({ showProjectIcons, onShowProjectIconsChange }: SettingsPageProps) {
  const { theme, setTheme } = useTheme();

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Customize your Hierarch experience
            </p>
          </div>
        </div>

        {/* Theme */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Appearance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label>Theme</Label>
              <RadioGroup
                value={theme}
                onValueChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}
                className="grid grid-cols-3 gap-3"
              >
                {THEME_OPTIONS.map((opt) => (
                  <Label
                    key={opt.value}
                    htmlFor={`theme-${opt.value}`}
                    className={cn(
                      'flex cursor-pointer flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-accent/50',
                      theme === opt.value && 'border-primary bg-primary/5',
                    )}
                  >
                    <RadioGroupItem
                      value={opt.value}
                      id={`theme-${opt.value}`}
                      className="sr-only"
                    />
                    <opt.icon className={cn(
                      'h-5 w-5',
                      theme === opt.value ? 'text-primary' : 'text-muted-foreground',
                    )} />
                    <span className={cn(
                      'text-sm font-medium',
                      theme === opt.value ? 'text-primary' : 'text-muted-foreground',
                    )}>
                      {opt.label}
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Sidebar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="project-icons" className="cursor-pointer">
                    Show project icons
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Display icons next to project names in the sidebar
                  </p>
                </div>
              </div>
              <Switch
                id="project-icons"
                checked={showProjectIcons}
                onCheckedChange={onShowProjectIconsChange}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
