import { useState, useEffect, useCallback } from 'react'

import { formatDistanceToNow } from 'date-fns'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import {
  ExternalLink, Figma, Plus, RefreshCw, ChevronDown,
  Link2, X, Loader2, Layers, Video,
} from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ScrollArea } from './ui/scroll-area'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from './ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from './ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { PickerPopover } from './TaskDetailsDrawer'
import { AnimatePresence } from 'motion/react'
import { Separator } from './ui/separator'
import { cn } from '../lib/utils'
import * as jiraApi from '../api/jira'
import type { JiraIssue, JiraProject, JiraStatus, JiraTransition, JiraUser, DesignMeta } from '../api/jira'
import { useJiraToken } from '../hooks/use-jira-token'

const PROJECT_KEY = 'hierarch-jira-project'
const JIRA_BLUE = '#0052CC'

// ── Figma preview helper ─────────────────────────────────────────────────────

const FIGMA_URL_REGEX = /figma\.com\/(file|design|proto|board)\//

function FigmaPreview({ url }: { url: string }) {
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`https://www.figma.com/api/oembed?url=${encodeURIComponent(url)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => setThumbnail(data?.thumbnail_url || null))
      .catch(() => setThumbnail(null))
      .finally(() => setLoading(false))
  }, [url])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 rounded-lg border border-border bg-accent/50">
        <Loader2 className="h-5 w-5 text-muted-foreground/40 animate-spin" />
      </div>
    )
  }

  if (thumbnail) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block group/thumb rounded-lg overflow-hidden border border-border hover:border-pink-400/30 transition-colors"
      >
        <img src={thumbnail} alt="Figma preview" className="w-full object-cover" style={{ maxHeight: 240 }} />
        <div className="flex items-center gap-1.5 px-3 py-2 bg-accent/50 text-xs text-muted-foreground/60 group-hover/thumb:text-pink-400/80 transition-colors">
          <Figma className="h-3 w-3" />
          Open in Figma
        </div>
      </a>
    )
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-3 rounded-lg border border-border bg-accent/50 text-xs text-muted-foreground/60 hover:text-pink-400/80 hover:border-pink-400/30 transition-colors">
      <Figma className="h-4 w-4 text-pink-400/60" />
      <span className="flex-1 truncate">{url}</span>
      <ExternalLink className="h-3 w-3 shrink-0" />
    </a>
  )
}

// ── Video embed helpers ──────────────────────────────────────────────────────

function getVideoEmbed(url: string): { embed: string; provider: string } | null {
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/)
  if (ytMatch) return { embed: `https://www.youtube.com/embed/${ytMatch[1]}`, provider: 'YouTube' }
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return { embed: `https://player.vimeo.com/video/${vimeoMatch[1]}`, provider: 'Vimeo' }
  const loomMatch = url.match(/loom\.com\/share\/([a-f0-9]+)/)
  if (loomMatch) return { embed: `https://www.loom.com/embed/${loomMatch[1]}`, provider: 'Loom' }
  return null
}

// ── Linkify helper ──────────────────────────────────────────────────────────

const URL_REGEX = /(https?:\/\/[^\s<]+)/g

function Linkify({ text }: { text: string }) {
  const parts = text.split(URL_REGEX)
  const videoEmbeds: { embed: string; provider: string }[] = []
  const figmaUrls: string[] = []

  for (const part of parts) {
    if (URL_REGEX.test(part)) {
      const embed = getVideoEmbed(part)
      if (embed) videoEmbeds.push(embed)
      else if (FIGMA_URL_REGEX.test(part)) figmaUrls.push(part)
    }
  }

  return (
    <>
      {parts.map((part, i) =>
        URL_REGEX.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{part}</a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
      {(videoEmbeds.length > 0 || figmaUrls.length > 0) && (
        <div className="mt-3 space-y-3">
          {videoEmbeds.map((embed, i) => (
            <div key={`video-${i}`} className="rounded-lg overflow-hidden border border-border">
              <iframe src={embed.embed} title={embed.provider} className="w-full aspect-video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              <div className="flex items-center gap-1.5 px-3 py-2 bg-accent/50 text-xs text-muted-foreground/60">
                <Video className="h-3 w-3" />
                {embed.provider}
              </div>
            </div>
          ))}
          {figmaUrls.map((url, i) => (
            <FigmaPreview key={`figma-${i}`} url={url} />
          ))}
        </div>
      )}
    </>
  )
}

// ── Priority Badge ──────────────────────────────────────────────────────────

function PriorityDot({ priorityId }: { priorityId?: string }) {
  if (!priorityId) return null
  const entry = jiraApi.PRIORITY_LABELS[priorityId]
  if (!entry) return null
  const filled = 6 - Number(priorityId)
  const color = entry.color
  return (
    <span className={cn('inline-flex items-end gap-[2px]', color)} title={entry.label}>
      {[1, 2, 3].map(bar => (
        <span
          key={bar}
          className={cn('w-[3px] rounded-sm', bar <= filled ? 'bg-current' : 'bg-current opacity-20')}
          style={{ height: `${8 + (bar - 1) * 3}px` }}
        />
      ))}
    </span>
  )
}

// ── Status color helper ─────────────────────────────────────────────────────

function statusColor(status: JiraStatus): string {
  return jiraApi.STATUS_CATEGORY_COLORS[status.statusCategory?.key] ?? '#94a3b8'
}

// ── Jira SVG Icon ───────────────────────────────────────────────────────────

function JiraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.35V2.84a.84.84 0 0 0-.84-.84H11.53ZM6.77 6.8a4.36 4.36 0 0 0 4.34 4.34h1.8v1.72a4.36 4.36 0 0 0 4.34 4.34V7.63a.84.84 0 0 0-.84-.84H6.77ZM2 11.6a4.35 4.35 0 0 0 4.35 4.35h1.78v1.7c0 2.4 1.95 4.35 4.35 4.35v-9.56a.84.84 0 0 0-.84-.84H2Z" />
    </svg>
  )
}

// ── Issue Detail Drawer ─────────────────────────────────────────────────────

function IssueDrawer({
  issue,
  members,
  token,
  cloudId,
  onClose,
  onUpdate,
}: {
  issue: JiraIssue
  members: JiraUser[]
  token: string
  cloudId: string
  onClose: () => void
  onUpdate: (updated: JiraIssue) => void
}) {
  const [saving, setSaving] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [assigneeOpen, setAssigneeOpen] = useState(false)
  const [transitions, setTransitions] = useState<JiraTransition[]>([])
  const [figmaUrl, setFigmaUrl] = useState('')

  // Load available transitions
  useEffect(() => {
    jiraApi.getTransitions(token, cloudId, issue.key)
      .then(setTransitions)
      .catch(() => {})
  }, [issue.key, token, cloudId])

  // Load design meta
  useEffect(() => {
    const meta = jiraApi.getDesignMeta(issue.key)
    if (meta.figmaUrl) setFigmaUrl(meta.figmaUrl)
  }, [issue.key])

  const handleTransition = async (transitionId: string) => {
    setSaving(true)
    try {
      await jiraApi.transitionIssue(token, cloudId, issue.key, transitionId)
      const updated = await jiraApi.getIssue(token, cloudId, issue.key)
      onUpdate(updated)
      // Reload transitions for new state
      jiraApi.getTransitions(token, cloudId, issue.key).then(setTransitions).catch(() => {})
      toast.success('Status updated')
    } catch {
      toast.error('Failed to update status')
    } finally {
      setSaving(false)
    }
  }

  const handleAssigneeChange = async (accountId: string) => {
    setSaving(true)
    try {
      await jiraApi.updateIssue(token, cloudId, issue.key, {
        assignee: { accountId },
      })
      const updated = await jiraApi.getIssue(token, cloudId, issue.key)
      onUpdate(updated)
      toast.success('Assignee updated')
    } catch {
      toast.error('Failed to update assignee')
    } finally {
      setSaving(false)
    }
  }

  const saveFigmaUrl = () => {
    jiraApi.saveDesignMeta(issue.key, { ...jiraApi.getDesignMeta(issue.key), figmaUrl: figmaUrl.trim() || undefined })
  }

  const priorityEntry = issue.fields.priority ? jiraApi.PRIORITY_LABELS[issue.fields.priority.id] : null
  const memberItems = members.map(m => ({ id: m.accountId, label: m.displayName, secondary: m.emailAddress }))
  const issueUrl = `https://${cloudId}.atlassian.net/browse/${issue.key}`

  // Extract description text (Jira ADF or plain string)
  const descriptionText = typeof issue.fields.description === 'string'
    ? issue.fields.description
    : issue.fields.description?.content
      ?.flatMap((block: any) => block.content?.map((c: any) => c.text).filter(Boolean) ?? [])
      .join('\n') ?? ''

  return (
    <AnimatePresence>
      {/* Floating close button */}
      <motion.button
        key="jira-drawer-close"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 0.85, x: 0 }}
        exit={{ opacity: 0, x: 40, transition: { type: 'spring', stiffness: 420, damping: 32, mass: 0.7 } }}
        whileHover={{ opacity: 1 }}
        transition={{ delay: 0.25, type: 'spring', stiffness: 320, damping: 28 }}
        onClick={onClose}
        className="fixed top-8 right-[460px] z-50 flex h-[60px] w-8 items-center justify-center rounded-full bg-drawer text-muted-foreground shadow-lg border border-border hover:text-foreground transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </motion.button>

      {/* Drawer shell */}
      <motion.div
        key="jira-drawer"
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.88 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.7 }}
        style={{ transformOrigin: 'top right' }}
        className="fixed top-8 right-8 bottom-8 z-50 w-[420px] rounded-2xl bg-drawer shadow-2xl border border-border overflow-hidden flex flex-col"
      >
        {/* Navigation bar */}
        <div className="shrink-0 flex items-center gap-2 px-4 pt-4 pb-2">
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Jira Issue</span>
        </div>

        {/* Header */}
        <div className="px-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-mono text-muted-foreground">{issue.key}</span>
            <div className="flex items-center gap-2">
              {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
              <a href={issueUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </a>
            </div>
          </div>
          <h2 className="text-base font-semibold">{issue.fields.summary}</h2>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-6 py-4 space-y-6">

            {/* Status + Priority + Assignee row */}
            <div className="flex flex-wrap gap-4">
              {/* Status picker (transitions) */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Status</label>
                <Popover open={statusOpen} onOpenChange={setStatusOpen}>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-surface hover:bg-surface-hover transition-colors">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: statusColor(issue.fields.status) }}
                      />
                      {issue.fields.status.name}
                      <ChevronDown className="h-2.5 w-2.5 opacity-40" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[240px] p-1.5" sideOffset={4}>
                    <div className="grid grid-cols-2 gap-0.5">
                      {transitions.map(t => (
                        <button
                          key={t.id}
                          onClick={() => { handleTransition(t.id); setStatusOpen(false) }}
                          className={cn(
                            'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs transition-colors',
                            'text-muted-foreground hover:bg-surface hover:text-foreground',
                          )}
                        >
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: statusColor(t.to) }} />
                          {t.name}
                        </button>
                      ))}
                    </div>
                    {transitions.length === 0 && (
                      <p className="text-xs text-muted-foreground/50 text-center py-3">No transitions available</p>
                    )}
                  </PopoverContent>
                </Popover>
              </div>

              {/* Priority */}
              {issue.fields.priority && priorityEntry && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Priority</label>
                  <div className="flex items-center gap-2 h-8">
                    <PriorityDot priorityId={issue.fields.priority.id} />
                    <span className={cn('text-xs font-medium', priorityEntry.color)}>{priorityEntry.label}</span>
                  </div>
                </div>
              )}

              {/* Assignee picker */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Assignee</label>
                <PickerPopover
                  open={assigneeOpen}
                  onOpenChange={setAssigneeOpen}
                  trigger={
                    <button className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs bg-surface hover:bg-surface-hover transition-colors">
                      {issue.fields.assignee ? (
                        <>
                          {issue.fields.assignee.avatarUrls?.['24x24'] ? (
                            <img src={issue.fields.assignee.avatarUrls['24x24']} className="w-4 h-4 rounded-full" alt="" />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-[#0052CC]/20 flex items-center justify-center text-[8px] font-semibold text-[#0052CC]">
                              {issue.fields.assignee.displayName[0]}
                            </div>
                          )}
                          <span className="font-medium">{issue.fields.assignee.displayName}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground/40">Unassigned</span>
                      )}
                      <ChevronDown className="h-2.5 w-2.5 opacity-40" />
                    </button>
                  }
                  items={memberItems}
                  selectedId={issue.fields.assignee?.accountId}
                  onSelect={handleAssigneeChange}
                  placeholder="Search members…"
                  emptyLabel="No members found"
                />
              </div>
            </div>

            {/* Labels */}
            {issue.fields.labels && issue.fields.labels.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Labels</label>
                <div className="flex gap-1.5 flex-wrap">
                  {issue.fields.labels.map(l => (
                    <span key={l} className="text-xs px-2 py-0.5 rounded-full bg-accent text-muted-foreground">{l}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Figma Link */}
            <Separator />
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
                <Figma className="inline h-3 w-3 mr-1" />
                Figma File
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://figma.com/file/…"
                  value={figmaUrl}
                  onChange={e => setFigmaUrl(e.target.value)}
                  onBlur={saveFigmaUrl}
                  className="text-sm font-mono"
                />
                {figmaUrl && (
                  <a href={figmaUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                )}
              </div>
              {figmaUrl && FIGMA_URL_REGEX.test(figmaUrl) && (
                <div className="mt-3">
                  <FigmaPreview url={figmaUrl} />
                </div>
              )}
            </div>

            {/* Description */}
            {descriptionText && (
              <>
                <Separator />
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Description</label>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap"><Linkify text={descriptionText} /></p>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </motion.div>
    </AnimatePresence>
  )
}

// ── Create Issue Dialog ─────────────────────────────────────────────────────

function CreateIssueDialog({
  token,
  cloudId,
  projectKey,
  onClose,
  onCreate,
}: {
  token: string
  cloudId: string
  projectKey: string
  onClose: () => void
  onCreate: (issue: JiraIssue) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('3')
  const [designType, setDesignType] = useState<DesignMeta['designType']>(undefined)
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!title.trim()) return
    setLoading(true)
    try {
      const issue = await jiraApi.createIssue(token, cloudId, {
        projectKey,
        summary: title.trim(),
        description: description.trim() || undefined,
        priorityId: priority,
      })
      if (designType) {
        jiraApi.saveDesignMeta(issue.key, { designType })
      }
      onCreate(issue)
      toast.success('Issue created')
      onClose()
    } catch {
      toast.error('Failed to create issue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Jira Issue</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <Input
            placeholder="Issue summary…"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
            className="text-base"
          />

          <textarea
            placeholder="Description (optional)…"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          />

          <div className="grid grid-cols-2 gap-3">
            {/* Priority */}
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Priority</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                    <span className={cn('text-xs font-medium', jiraApi.PRIORITY_LABELS[priority]?.color)}>
                      {jiraApi.PRIORITY_LABELS[priority]?.label}
                    </span>
                    <ChevronDown className="h-3 w-3 ml-auto text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {Object.entries(jiraApi.PRIORITY_LABELS).map(([p, { label, color }]) => (
                    <DropdownMenuItem key={p} onClick={() => setPriority(p)}>
                      <span className={cn('text-sm', color)}>{label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Design type */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Design Type</label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(jiraApi.DESIGN_TYPES).map(([key, { label, color }]) => (
                <button
                  key={key}
                  onClick={() => setDesignType(designType === key as DesignMeta['designType'] ? undefined : key as DesignMeta['designType'])}
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-full font-medium transition-all border',
                    designType === key
                      ? cn(color, 'border-transparent')
                      : 'border-border text-muted-foreground hover:border-[#0052CC]/50'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!title.trim() || loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Issue'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Board ──────────────────────────────────────────────────────────────

function JiraBoard({
  token,
  cloudId,
  onDisconnect,
}: {
  token: string
  cloudId: string
  onDisconnect: () => void
}) {
  const [issues, setIssues] = useState<JiraIssue[]>([])
  const [members, setMembers] = useState<JiraUser[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIssue, setSelectedIssue] = useState<JiraIssue | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const iss = await jiraApi.getMyIssues(token, cloudId)
      setIssues(iss)
    } catch (err) {
      console.error('Jira load error:', err)
      toast.error(`Failed to load issues: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [token, cloudId])

  useEffect(() => { load() }, [load])

  const handleRefresh = () => { setRefreshing(true); load() }

  const handleIssueUpdate = (updated: JiraIssue) => {
    setIssues(prev => prev.map(i => i.id === updated.id ? updated : i))
    if (selectedIssue?.id === updated.id) setSelectedIssue(updated)
  }

  const handleIssueCreate = (issue: JiraIssue) => {
    setIssues(prev => [issue, ...prev])
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading issues…</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-[#0052CC]/20 flex items-center justify-center">
            <Layers className="h-3.5 w-3.5 text-[#0052CC]" />
          </div>
          <span className="font-semibold text-sm">My Issues</span>
          <span className="text-xs text-muted-foreground">Jira</span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onDisconnect} className="text-destructive">
                Disconnect Jira
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-background">
            <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
              <th className="w-[28px] px-3 py-3"></th>
              <th className="text-left font-medium px-3 py-3 w-[90px]">Key</th>
              <th className="text-left font-medium px-3 py-3">Summary</th>
              <th className="text-left font-medium px-3 py-3 w-[130px]">Status</th>
              <th className="text-left font-medium px-3 py-3 w-[100px]">Type</th>
              <th className="text-left font-medium px-3 py-3 w-[140px]">Assignee</th>
              <th className="text-left font-medium px-3 py-3 w-[100px]">Updated</th>
            </tr>
          </thead>
          <tbody>
            {issues.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-muted-foreground py-16">
                  No issues found
                </td>
              </tr>
            ) : (
              issues.map(issue => {
                const meta = jiraApi.getDesignMeta(issue.key)
                return (
                  <motion.tr
                    key={issue.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => setSelectedIssue(issue)}
                    className="border-b border-border/40 hover:bg-accent/20 cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-3 w-[28px]">
                      <PriorityDot priorityId={issue.fields.priority?.id} />
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {issue.key}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate font-medium text-foreground">{issue.fields.summary}</span>
                        {meta.figmaUrl && (
                          <Figma className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                        )}
                        {issue.fields.labels && issue.fields.labels.length > 0 && (
                          <div className="flex gap-1 shrink-0">
                            {issue.fields.labels.slice(0, 2).map(l => (
                              <span key={l} className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-accent text-muted-foreground">
                                {l}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: statusColor(issue.fields.status) }} />
                        <span className="text-xs text-muted-foreground">{issue.fields.status.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {meta.designType && (
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', jiraApi.DESIGN_TYPES[meta.designType]?.color)}>
                          {jiraApi.DESIGN_TYPES[meta.designType]?.label}
                        </span>
                      )}
                      {!meta.designType && issue.fields.issuetype && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-accent/50 text-muted-foreground">
                          {issue.fields.issuetype.name}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {issue.fields.assignee ? (
                        <div className="flex items-center gap-2">
                          {issue.fields.assignee.avatarUrls?.['24x24'] ? (
                            <img src={issue.fields.assignee.avatarUrls['24x24']} className="w-5 h-5 rounded-full" alt="" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-[#0052CC]/20 flex items-center justify-center text-[9px] font-semibold text-[#0052CC]">
                              {issue.fields.assignee.displayName[0]}
                            </div>
                          )}
                          <span className="text-xs text-muted-foreground">{issue.fields.assignee.displayName}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground/60 whitespace-nowrap">
                      {formatDistanceToNow(new Date(issue.fields.updated), { addSuffix: true })}
                    </td>
                  </motion.tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Issue drawer */}
      {selectedIssue && (
        <IssueDrawer
          issue={selectedIssue}
          members={members}
          token={token}
          cloudId={cloudId}
          onClose={() => setSelectedIssue(null)}
          onUpdate={handleIssueUpdate}
        />
      )}
    </div>
  )
}

// ── Root JiraView ───────────────────────────────────────────────────────────

export function JiraView() {
  const { token, isConnected, isLoading, cloudId, disconnect } = useJiraToken()

  const handleDisconnect = async () => {
    await disconnect()
    toast.success('Disconnected from Jira')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    )
  }

  if (!isConnected || !token || !cloudId) return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4 text-center px-4">
      <JiraIcon className="h-8 w-8 opacity-40" />
      <p className="text-sm text-muted-foreground">Jira is not connected. Connect it from the Integrations page.</p>
    </div>
  )

  return (
    <JiraBoard
      token={token}
      cloudId={cloudId}
      onDisconnect={handleDisconnect}
    />
  )
}
