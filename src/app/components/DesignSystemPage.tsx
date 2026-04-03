import { useState } from 'react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card'
import { Checkbox } from './ui/checkbox'
import { Switch } from './ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs'
import { Separator } from './ui/separator'
import {
  Sun, Moon, Plus, Trash2, Edit, Check, X, ChevronRight, ChevronDown,
  AlertCircle, AlertTriangle, CheckCircle, Circle, Clock, Search,
  FileText, PenLine, MessageSquare, FlaskConical, Link2, Play, Image,
  Video, FileCode, Figma, ListTodo, Compass, Timer, BarChart3,
  Settings, User, Plug, Copy, Share, Star, ArrowRight, Loader2,
  Eye, EyeOff, Calendar, GripVertical, MoreHorizontal
} from 'lucide-react'

const SECTION_NAV = [
  { id: 'brand', label: 'Brand' },
  { id: 'colors', label: 'Colors' },
  { id: 'typography', label: 'Typography' },
  { id: 'spacing', label: 'Spacing' },
  { id: 'radii', label: 'Border Radii' },
  { id: 'elevation', label: 'Elevation' },
  { id: 'buttons', label: 'Buttons' },
  { id: 'inputs', label: 'Inputs' },
  { id: 'badges', label: 'Badges' },
  { id: 'cards', label: 'Cards' },
  { id: 'icons', label: 'Icons' },
  { id: 'phases', label: 'Phases & Statuses' },
  { id: 'artifacts', label: 'Artifact Types' },
]

function ColorSwatch({ name, value, cssVar }: { name: string; value: string; cssVar: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      className="group text-left"
      onClick={() => { navigator.clipboard.writeText(cssVar); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
    >
      <div
        className="h-16 w-full rounded-lg border border-border/40 mb-2 transition-transform group-hover:scale-105"
        style={{ backgroundColor: value }}
      />
      <p className="text-xs font-medium text-foreground truncate">{name}</p>
      <p className="text-[11px] text-muted-foreground font-mono truncate">
        {copied ? 'Copied!' : cssVar}
      </p>
    </button>
  )
}

function SectionHeader({ id, title, description }: { id: string; title: string; description: string }) {
  return (
    <div id={id} className="scroll-mt-24 mb-6">
      <h2 className="text-xl font-semibold tracking-tight text-foreground mb-1">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

export function DesignSystemPage() {
  const [activeSection, setActiveSection] = useState('brand')

  const scrollTo = (id: string) => {
    setActiveSection(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="flex h-full">
      {/* Sticky side nav */}
      <nav className="hidden lg:flex flex-col w-48 shrink-0 sticky top-0 h-screen pt-8 pl-2 pr-4 border-r border-border/40">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">Sections</p>
        {SECTION_NAV.map(s => (
          <button
            key={s.id}
            onClick={() => scrollTo(s.id)}
            className={`text-left text-[13px] px-2 py-1.5 rounded-md transition-colors ${
              activeSection === s.id
                ? 'bg-accent text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
            }`}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-16">

          {/* ── Header ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <img src="/logo.svg" alt="Hierarch" className="h-10 w-10" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Hierarch Design System</h1>
                <p className="text-sm text-muted-foreground">Components, tokens, and patterns</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Brand ── */}
          <section>
            <SectionHeader id="brand" title="Brand" description="Logo, wordmark, and brand colors." />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Logo on dark */}
              <div className="rounded-xl border border-border/40 p-8 flex flex-col items-center gap-4 bg-[#0F0E0D]">
                <img src="/logo.svg" alt="Hierarch logo" className="h-20 w-20" />
                <p className="text-sm font-medium text-[#EAE7E1]">Logo on dark</p>
                <p className="text-xs text-[#8A857E] font-mono">#BF7535</p>
              </div>
              {/* Logo on light */}
              <div className="rounded-xl border border-border/40 p-8 flex flex-col items-center gap-4 bg-[#FEFEFE]">
                <img src="/logo.svg" alt="Hierarch logo" className="h-20 w-20" />
                <p className="text-sm font-medium text-[#2c2720]">Logo on light</p>
                <p className="text-xs text-[#78726A] font-mono">#BF7535</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="h-16 w-full rounded-lg mb-2" style={{ backgroundColor: '#bf7535' }} />
                <p className="text-xs font-medium">Primary Amber</p>
                <p className="text-[11px] text-muted-foreground font-mono">#BF7535</p>
              </div>
              <div>
                <div className="h-16 w-full rounded-lg mb-2" style={{ backgroundColor: '#cd8a3a' }} />
                <p className="text-xs font-medium">Primary Amber (Dark)</p>
                <p className="text-[11px] text-muted-foreground font-mono">#CD8A3A</p>
              </div>
              <div>
                <div className="h-16 w-full rounded-lg mb-2" style={{ backgroundColor: '#0F0E0D' }} />
                <p className="text-xs font-medium">Dark Background</p>
                <p className="text-[11px] text-muted-foreground font-mono">#0F0E0D</p>
              </div>
              <div>
                <div className="h-16 w-full rounded-lg border border-border/40 mb-2" style={{ backgroundColor: '#FEFEFE' }} />
                <p className="text-xs font-medium">Light Background</p>
                <p className="text-[11px] text-muted-foreground font-mono">#FEFEFE</p>
              </div>
            </div>

            <div className="mt-8">
              <p className="text-sm font-medium mb-2">Font</p>
              <p className="text-3xl tracking-tight" style={{ fontFeatureSettings: "'cv02', 'cv03', 'cv04', 'cv11'" }}>
                Inter Variable
              </p>
              <p className="text-sm text-muted-foreground mt-1 font-mono">
                font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11'
              </p>
            </div>
          </section>

          <Separator />

          {/* ── Colors ── */}
          <section>
            <SectionHeader id="colors" title="Colors" description="All CSS custom properties. Click any swatch to copy the variable name." />

            <Tabs defaultValue="dark">
              <TabsList className="mb-6">
                <TabsTrigger value="dark" className="gap-1.5"><Moon className="h-3.5 w-3.5" /> Dark</TabsTrigger>
                <TabsTrigger value="light" className="gap-1.5"><Sun className="h-3.5 w-3.5" /> Light</TabsTrigger>
              </TabsList>

              <TabsContent value="dark">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Core</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 mb-8">
                  <ColorSwatch name="Background" value="#0F0E0D" cssVar="var(--background)" />
                  <ColorSwatch name="Foreground" value="#EAE7E1" cssVar="var(--foreground)" />
                  <ColorSwatch name="Primary" value="#cd8a3a" cssVar="var(--primary)" />
                  <ColorSwatch name="Primary FG" value="#FFFFFF" cssVar="var(--primary-foreground)" />
                  <ColorSwatch name="Destructive" value="#E5484D" cssVar="var(--destructive)" />
                  <ColorSwatch name="Ring" value="#cd8a3a" cssVar="var(--ring)" />
                </div>

                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Surfaces</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 mb-8">
                  <ColorSwatch name="Card" value="#1A1917" cssVar="var(--card)" />
                  <ColorSwatch name="Popover" value="#1E1C1A" cssVar="var(--popover)" />
                  <ColorSwatch name="Shell" value="#262624" cssVar="var(--shell)" />
                  <ColorSwatch name="Drawer" value="#1c1c1a" cssVar="var(--drawer)" />
                  <ColorSwatch name="Surface" value="rgba(255,255,255,0.04)" cssVar="var(--surface)" />
                  <ColorSwatch name="Surface Hover" value="rgba(255,255,255,0.07)" cssVar="var(--surface-hover)" />
                </div>

                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Borders & Muted</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                  <ColorSwatch name="Border" value="#2C2925" cssVar="var(--border)" />
                  <ColorSwatch name="Input" value="#2C2925" cssVar="var(--input)" />
                  <ColorSwatch name="Accent" value="#2E2B27" cssVar="var(--accent)" />
                  <ColorSwatch name="Muted" value="#262320" cssVar="var(--muted)" />
                  <ColorSwatch name="Muted FG" value="#8A857E" cssVar="var(--muted-foreground)" />
                  <ColorSwatch name="Attention" value="#fbbf24" cssVar="var(--attention)" />
                </div>
              </TabsContent>

              <TabsContent value="light">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Core</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 mb-8">
                  <ColorSwatch name="Background" value="#FEFEFE" cssVar="var(--background)" />
                  <ColorSwatch name="Foreground" value="#2c2720" cssVar="var(--foreground)" />
                  <ColorSwatch name="Primary" value="#bf7535" cssVar="var(--primary)" />
                  <ColorSwatch name="Primary FG" value="#FFFFFF" cssVar="var(--primary-foreground)" />
                  <ColorSwatch name="Destructive" value="#c4453a" cssVar="var(--destructive)" />
                  <ColorSwatch name="Ring" value="#bf7535" cssVar="var(--ring)" />
                </div>

                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Surfaces</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 mb-8">
                  <ColorSwatch name="Card" value="#f5f3ef" cssVar="var(--card)" />
                  <ColorSwatch name="Popover" value="#f7f5f1" cssVar="var(--popover)" />
                  <ColorSwatch name="Shell" value="#ede9e1" cssVar="var(--shell)" />
                  <ColorSwatch name="Drawer" value="#f8f6f2" cssVar="var(--drawer)" />
                  <ColorSwatch name="Surface" value="#ede9e1" cssVar="var(--surface)" />
                  <ColorSwatch name="Surface Hover" value="#e4dfd5" cssVar="var(--surface-hover)" />
                </div>

                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Borders & Muted</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                  <ColorSwatch name="Border" value="#cec8bc" cssVar="var(--border)" />
                  <ColorSwatch name="Input" value="#cec8bc" cssVar="var(--input)" />
                  <ColorSwatch name="Accent" value="#d6d0c4" cssVar="var(--accent)" />
                  <ColorSwatch name="Muted" value="#ddd8ce" cssVar="var(--muted)" />
                  <ColorSwatch name="Muted FG" value="#78726A" cssVar="var(--muted-foreground)" />
                  <ColorSwatch name="Attention" value="#92400e" cssVar="var(--attention)" />
                </div>
              </TabsContent>
            </Tabs>
          </section>

          <Separator />

          {/* ── Typography ── */}
          <section>
            <SectionHeader id="typography" title="Typography" description="Inter Variable with stylistic alternates. Letter spacing tightened for headings." />

            <div className="space-y-6">
              <div className="space-y-4">
                {[
                  { label: 'text-2xl / 24px', className: 'text-2xl font-bold tracking-tight', sample: 'The quick brown fox jumps over the lazy dog' },
                  { label: 'text-xl / 20px', className: 'text-xl font-semibold tracking-tight', sample: 'The quick brown fox jumps over the lazy dog' },
                  { label: 'text-lg / 18px', className: 'text-lg font-semibold', sample: 'The quick brown fox jumps over the lazy dog' },
                  { label: 'text-base / 16px', className: 'text-base font-medium', sample: 'The quick brown fox jumps over the lazy dog' },
                  { label: 'text-sm / 14px (default)', className: 'text-sm', sample: 'The quick brown fox jumps over the lazy dog. This is the default body text size used throughout the app.' },
                  { label: 'text-xs / 12px', className: 'text-xs', sample: 'The quick brown fox jumps over the lazy dog. Used for labels and secondary information.' },
                  { label: 'text-[11px]', className: 'text-[11px] text-muted-foreground', sample: 'Smallest text. Used for timestamps, hints, and meta info.' },
                ].map(t => (
                  <div key={t.label} className="flex items-baseline gap-6">
                    <span className="text-[11px] font-mono text-muted-foreground w-40 shrink-0 text-right">{t.label}</span>
                    <p className={t.className}>{t.sample}</p>
                  </div>
                ))}
              </div>

              <Separator className="my-6" />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Font Weights</p>
                  <p className="font-normal">400 Normal (body text)</p>
                  <p className="font-medium">500 Medium (buttons, labels)</p>
                  <p className="font-semibold">600 Semibold (section heads)</p>
                  <p className="font-bold">700 Bold (page titles)</p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Letter Spacing</p>
                  <p style={{ letterSpacing: '-0.024em' }}>-0.024em (headings)</p>
                  <p style={{ letterSpacing: '-0.011em' }}>-0.011em (body)</p>
                  <p style={{ letterSpacing: '0.05em' }} className="text-xs uppercase">0.05em (overline labels)</p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Feature Settings</p>
                  <p className="font-mono text-xs text-muted-foreground">cv02, cv03, cv04, cv11</p>
                  <p>Regular: a g l 1 4</p>
                  <p style={{ fontFeatureSettings: "'cv02', 'cv03', 'cv04', 'cv11'" }}>Stylistic: a g l 1 4</p>
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* ── Spacing ── */}
          <section>
            <SectionHeader id="spacing" title="Spacing" description="4px base unit. Tailwind utility classes." />

            <div className="space-y-3">
              {[
                { label: '4px', tw: 'gap-1 / p-1', width: 'w-4' },
                { label: '8px', tw: 'gap-2 / p-2', width: 'w-8' },
                { label: '12px', tw: 'gap-3 / p-3', width: 'w-12' },
                { label: '16px', tw: 'gap-4 / p-4', width: 'w-16' },
                { label: '24px', tw: 'gap-6 / p-6', width: 'w-24' },
                { label: '32px', tw: 'gap-8 / p-8', width: 'w-32' },
                { label: '48px', tw: 'gap-12 / p-12', width: 'w-48' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-4">
                  <span className="text-[11px] font-mono text-muted-foreground w-16 text-right shrink-0">{s.label}</span>
                  <div className={`h-6 ${s.width} rounded bg-primary/30 border border-primary/50`} />
                  <span className="text-xs text-muted-foreground font-mono">{s.tw}</span>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          {/* ── Border Radii ── */}
          <section>
            <SectionHeader id="radii" title="Border Radii" description="Scale from 4px to full circle." />

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
              {[
                { label: 'radius-sm', value: '4px', tw: 'rounded-sm', r: 'rounded-sm' },
                { label: 'radius-md', value: '6px', tw: 'rounded-md', r: 'rounded-md' },
                { label: 'radius-lg', value: '8px', tw: 'rounded-lg', r: 'rounded-lg' },
                { label: 'radius-xl', value: '12px', tw: 'rounded-xl', r: 'rounded-xl' },
                { label: '2xl', value: '16px', tw: 'rounded-2xl', r: 'rounded-2xl' },
                { label: 'full', value: '9999px', tw: 'rounded-full', r: 'rounded-full' },
              ].map(r => (
                <div key={r.label} className="flex flex-col items-center gap-2">
                  <div className={`h-20 w-20 bg-surface border border-border ${r.r}`} />
                  <p className="text-xs font-medium">{r.value}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{r.tw}</p>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          {/* ── Elevation ── */}
          <section>
            <SectionHeader id="elevation" title="Elevation" description="Shadow scale for layering UI elements." />

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: 'None', tw: 'shadow-none', usage: 'Flat elements' },
                { label: 'Small', tw: 'shadow-sm', usage: 'Subtle lift' },
                { label: 'Default', tw: 'shadow', usage: 'Cards' },
                { label: 'Medium', tw: 'shadow-md', usage: 'Popovers' },
                { label: 'Large', tw: 'shadow-lg', usage: 'Dropdowns, modals' },
                { label: '2XL', tw: 'shadow-2xl', usage: 'Floating drawers' },
              ].map(s => (
                <div key={s.label} className={`h-28 rounded-xl bg-card border border-border/40 ${s.tw} flex flex-col items-center justify-center gap-1`}>
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{s.tw}</p>
                  <p className="text-[11px] text-muted-foreground">{s.usage}</p>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          {/* ── Buttons ── */}
          <section>
            <SectionHeader id="buttons" title="Buttons" description="Six variants, four sizes. Built on shadcn/ui with CVA." />

            <div className="space-y-8">
              {/* Variants */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Variants</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button>Default</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="link">Link</Button>
                </div>
              </div>

              {/* Sizes */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Sizes</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm">Small</Button>
                  <Button size="default">Default</Button>
                  <Button size="lg">Large</Button>
                  <Button size="icon"><Plus className="h-4 w-4" /></Button>
                </div>
              </div>

              {/* States */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">States</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button>Enabled</Button>
                  <Button disabled>Disabled</Button>
                  <Button disabled><Loader2 className="h-4 w-4 animate-spin" /> Loading</Button>
                </div>
              </div>

              {/* With icons */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">With Icons</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button><Plus className="h-4 w-4" /> New Task</Button>
                  <Button variant="outline"><Edit className="h-4 w-4" /> Edit</Button>
                  <Button variant="destructive"><Trash2 className="h-4 w-4" /> Delete</Button>
                  <Button variant="ghost"><Share className="h-4 w-4" /> Share</Button>
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* ── Inputs ── */}
          <section>
            <SectionHeader id="inputs" title="Inputs & Controls" description="Form elements with consistent sizing and focus states." />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Text Inputs</p>
                <Input placeholder="Default input" />
                <Input placeholder="Disabled input" disabled />
                <Input type="password" placeholder="Password input" />
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search..." />
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Toggles</p>
                  <div className="flex items-center gap-3">
                    <Checkbox id="check-demo" />
                    <label htmlFor="check-demo" className="text-sm">Checkbox</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox id="check-checked" defaultChecked />
                    <label htmlFor="check-checked" className="text-sm">Checked</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch id="switch-demo" />
                    <label htmlFor="switch-demo" className="text-sm">Switch</label>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* ── Badges ── */}
          <section>
            <SectionHeader id="badges" title="Badges" description="Compact labels for status, type, and metadata." />

            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Variants</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge>Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                  <Badge variant="outline">Outline</Badge>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Status Colors</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="bg-slate-500 text-white border-transparent">To Do</Badge>
                  <Badge className="bg-blue-500 text-white border-transparent">In Progress</Badge>
                  <Badge className="bg-orange-500 text-white border-transparent">Review</Badge>
                  <Badge className="bg-emerald-500 text-white border-transparent">Done</Badge>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Phase Colors</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="bg-rose-500 text-white border-transparent">Research</Badge>
                  <Badge className="bg-violet-500 text-white border-transparent">Explore</Badge>
                  <Badge className="bg-blue-500 text-white border-transparent">Design</Badge>
                  <Badge className="bg-amber-500 text-white border-transparent">Iterate</Badge>
                  <Badge className="bg-orange-500 text-white border-transparent">Review</Badge>
                  <Badge className="bg-emerald-500 text-white border-transparent">Handoff</Badge>
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* ── Cards ── */}
          <section>
            <SectionHeader id="cards" title="Cards" description="Container component for grouped content." />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Default Card</CardTitle>
                  <CardDescription>bg-card with border and shadow</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Cards use rounded-xl, the card background color, and a subtle shadow.</p>
                </CardContent>
              </Card>

              <Card className="bg-surface border-border/40">
                <CardHeader>
                  <CardTitle>Surface Card</CardTitle>
                  <CardDescription>bg-surface variant</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Used for inline sections and picker items within drawers.</p>
                </CardContent>
              </Card>

              <Card className="bg-shell border-shell-border">
                <CardHeader>
                  <CardTitle>Shell Card</CardTitle>
                  <CardDescription>bg-shell variant</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Used for sidebar-like containers and secondary panels.</p>
                </CardContent>
              </Card>
            </div>
          </section>

          <Separator />

          {/* ── Icons ── */}
          <section>
            <SectionHeader id="icons" title="Icons" description="Lucide React icon library. Default size: h-4 w-4 (16px)." />

            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Navigation</p>
                <div className="flex flex-wrap gap-4">
                  {[
                    { icon: Compass, name: 'Compass' },
                    { icon: ListTodo, name: 'ListTodo' },
                    { icon: BarChart3, name: 'BarChart3' },
                    { icon: Timer, name: 'Timer' },
                    { icon: Figma, name: 'Figma' },
                    { icon: Plug, name: 'Plug' },
                    { icon: Settings, name: 'Settings' },
                    { icon: User, name: 'User' },
                  ].map(({ icon: Icon, name }) => (
                    <div key={name} className="flex flex-col items-center gap-2 w-16">
                      <div className="h-10 w-10 rounded-lg bg-surface flex items-center justify-center">
                        <Icon className="h-5 w-5 text-foreground" />
                      </div>
                      <span className="text-[10px] text-muted-foreground text-center">{name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Actions</p>
                <div className="flex flex-wrap gap-4">
                  {[
                    { icon: Plus, name: 'Plus' },
                    { icon: Edit, name: 'Edit' },
                    { icon: Trash2, name: 'Trash2' },
                    { icon: Copy, name: 'Copy' },
                    { icon: Share, name: 'Share' },
                    { icon: Search, name: 'Search' },
                    { icon: Check, name: 'Check' },
                    { icon: X, name: 'X' },
                    { icon: MoreHorizontal, name: 'More' },
                    { icon: GripVertical, name: 'Grip' },
                  ].map(({ icon: Icon, name }) => (
                    <div key={name} className="flex flex-col items-center gap-2 w-16">
                      <div className="h-10 w-10 rounded-lg bg-surface flex items-center justify-center">
                        <Icon className="h-5 w-5 text-foreground" />
                      </div>
                      <span className="text-[10px] text-muted-foreground text-center">{name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Status & Feedback</p>
                <div className="flex flex-wrap gap-4">
                  {[
                    { icon: CheckCircle, name: 'CheckCircle' },
                    { icon: AlertCircle, name: 'AlertCircle' },
                    { icon: AlertTriangle, name: 'AlertTriangle' },
                    { icon: Circle, name: 'Circle' },
                    { icon: Clock, name: 'Clock' },
                    { icon: Loader2, name: 'Loader2' },
                    { icon: Eye, name: 'Eye' },
                    { icon: EyeOff, name: 'EyeOff' },
                    { icon: Star, name: 'Star' },
                    { icon: Calendar, name: 'Calendar' },
                  ].map(({ icon: Icon, name }) => (
                    <div key={name} className="flex flex-col items-center gap-2 w-16">
                      <div className="h-10 w-10 rounded-lg bg-surface flex items-center justify-center">
                        <Icon className="h-5 w-5 text-foreground" />
                      </div>
                      <span className="text-[10px] text-muted-foreground text-center">{name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Icon Sizes</p>
                <div className="flex items-end gap-6">
                  {[
                    { size: 'h-3.5 w-3.5', label: '14px', px: '14' },
                    { size: 'h-4 w-4', label: '16px (default)', px: '16' },
                    { size: 'h-5 w-5', label: '20px', px: '20' },
                    { size: 'h-6 w-6', label: '24px', px: '24' },
                  ].map(s => (
                    <div key={s.px} className="flex flex-col items-center gap-2">
                      <Star className={`${s.size} text-foreground`} />
                      <span className="text-[10px] text-muted-foreground">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* ── Phases & Statuses ── */}
          <section>
            <SectionHeader id="phases" title="Phases & Statuses" description="Two-level system: projects have phases, tasks have statuses." />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Project Phases (6-step design workflow)</p>
                <div className="space-y-2">
                  {[
                    { name: 'Research', color: 'bg-rose-500', hex: '#f43f5e' },
                    { name: 'Explore', color: 'bg-violet-500', hex: '#8b5cf6' },
                    { name: 'Design', color: 'bg-blue-500', hex: '#3b82f6' },
                    { name: 'Iterate', color: 'bg-amber-500', hex: '#f59e0b' },
                    { name: 'Review', color: 'bg-orange-500', hex: '#f97316' },
                    { name: 'Handoff', color: 'bg-emerald-500', hex: '#10b981' },
                  ].map(p => (
                    <div key={p.name} className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full ${p.color} flex items-center justify-center`}>
                        <span className="text-white text-xs font-semibold">{p.name[0]}</span>
                      </div>
                      <span className="text-sm font-medium w-20">{p.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">{p.hex}</span>
                      <span className="text-xs text-muted-foreground font-mono">{p.color}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-center gap-1">
                  {['bg-rose-500', 'bg-violet-500', 'bg-blue-500', 'bg-amber-500', 'bg-orange-500', 'bg-emerald-500'].map((c, i) => (
                    <div key={c} className="flex items-center">
                      <div className={`h-3 w-3 rounded-full ${c}`} />
                      {i < 5 && <ArrowRight className="h-3 w-3 text-muted-foreground mx-0.5" />}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Task Statuses (4-step workflow)</p>
                <div className="space-y-2">
                  {[
                    { name: 'To Do', color: 'bg-slate-500', hex: '#64748b', id: 'todo' },
                    { name: 'In Progress', color: 'bg-blue-500', hex: '#3b82f6', id: 'in-progress' },
                    { name: 'Review', color: 'bg-orange-500', hex: '#f97316', id: 'feedback' },
                    { name: 'Done', color: 'bg-emerald-500', hex: '#10b981', id: 'done' },
                  ].map(s => (
                    <div key={s.id} className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full ${s.color} flex items-center justify-center`}>
                        {s.id === 'done' ? <Check className="h-4 w-4 text-white" /> : <span className="text-white text-xs font-semibold">{s.name[0]}</span>}
                      </div>
                      <span className="text-sm font-medium w-24">{s.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">{s.hex}</span>
                      <span className="text-xs text-muted-foreground font-mono">{s.color}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-center gap-1">
                  {['bg-slate-500', 'bg-blue-500', 'bg-orange-500', 'bg-emerald-500'].map((c, i) => (
                    <div key={c} className="flex items-center">
                      <div className={`h-3 w-3 rounded-full ${c}`} />
                      {i < 3 && <ArrowRight className="h-3 w-3 text-muted-foreground mx-0.5" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* ── Artifact Types ── */}
          <section>
            <SectionHeader id="artifacts" title="Artifact Types" description="10 content types for design documentation." />

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {[
                { name: 'Freeform', icon: FileText, color: 'bg-blue-500/15 text-blue-500' },
                { name: 'Decision', icon: PenLine, color: 'bg-amber-500/15 text-amber-500' },
                { name: 'Feedback', icon: MessageSquare, color: 'bg-emerald-500/15 text-emerald-500' },
                { name: 'Research', icon: FlaskConical, color: 'bg-violet-500/15 text-violet-500' },
                { name: 'Link', icon: Link2, color: 'bg-sky-500/15 text-sky-500' },
                { name: 'Figma', icon: Figma, color: 'bg-pink-500/15 text-pink-500' },
                { name: 'Prototype', icon: Play, color: 'bg-orange-500/15 text-orange-500' },
                { name: 'Screenshot', icon: Image, color: 'bg-teal-500/15 text-teal-500' },
                { name: 'Video', icon: Video, color: 'bg-red-500/15 text-red-500' },
                { name: 'Doc', icon: FileCode, color: 'bg-slate-500/15 text-slate-500' },
              ].map(({ name, icon: Icon, color }) => (
                <div key={name} className="rounded-xl border border-border/40 p-4 flex flex-col items-center gap-3">
                  <div className={`h-12 w-12 rounded-lg ${color} flex items-center justify-center`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-medium">{name}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Footer */}
          <div className="pt-8 pb-16 text-center">
            <p className="text-xs text-muted-foreground">Hierarch Design System v1.0</p>
          </div>
        </div>
      </div>
    </div>
  )
}
