import { useState, useEffect, useCallback } from 'react'

import { formatDistanceToNow } from 'date-fns'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import {
  ExternalLink, Figma, Plus, RefreshCw, ChevronDown,
  Link2, AlertCircle, X, Check, Loader2, Layers, Video,
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
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from './ui/sheet'
import { AnimatePresence } from 'motion/react'
import { Separator } from './ui/separator'
import { cn } from '../lib/utils'
import * as linearApi from '../api/linear'
import type { LinearIssue, LinearTeam, LinearStatus, DesignMeta } from '../api/linear'
import { useLinearToken } from '../hooks/use-linear-token'

const TEAM_KEY = 'hierarch-linear-team'

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

  // Collect rich previews from URLs in the text
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
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline break-all"
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
      {(videoEmbeds.length > 0 || figmaUrls.length > 0) && (
        <div className="mt-3 space-y-3">
          {videoEmbeds.map((embed, i) => (
            <div key={`video-${i}`} className="rounded-lg overflow-hidden border border-border">
              <iframe
                src={embed.embed}
                title={embed.provider}
                className="w-full aspect-video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
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

function PriorityDot({ priority }: { priority: number }) {
  if (priority === 0) return null
  // Priority 1 = Urgent (4 bars), 2 = High (3), 3 = Medium (2), 4 = Low (1)
  const filledBars = 5 - priority
  const entry = linearApi.PRIORITY_LABELS[priority] ?? linearApi.PRIORITY_LABELS[0]
  const color = entry?.color ?? 'text-muted-foreground'
  return (
    <span className={cn('inline-flex items-end gap-[2px]', color)} title={entry?.label}>
      {[1, 2, 3].map(bar => (
        <span
          key={bar}
          className={cn(
            'w-[3px] rounded-sm',
            bar <= filledBars ? 'bg-current' : 'bg-current opacity-20'
          )}
          style={{ height: `${8 + (bar - 1) * 3}px` }}
        />
      ))}
    </span>
  )
}

// ── Issue Detail Drawer ─────────────────────────────────────────────────────

function IssueDrawer({
  issue,
  statuses,
  members,
  token,
  onClose,
  onUpdate,
}: {
  issue: LinearIssue
  statuses: LinearStatus[]
  members: linearApi.LinearUser[]
  token: string
  onClose: () => void
  onUpdate: (updated: LinearIssue) => void
}) {
  const [saving, setSaving] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [assigneeOpen, setAssigneeOpen] = useState(false)
  const [attachments, setAttachments] = useState<{ id: string; url: string; title: string }[]>([])
  const [figmaUrl, setFigmaUrl] = useState('')
  const [figmaAttachmentId, setFigmaAttachmentId] = useState<string | null>(null)

  // Load attachments from Linear
  useEffect(() => {
    linearApi.getAttachments(token, issue.id)
      .then(atts => {
        setAttachments(atts)
        const figma = atts.find(a => a.url.includes('figma.com'))
        if (figma) {
          setFigmaUrl(figma.url)
          setFigmaAttachmentId(figma.id)
        }
      })
      .catch(() => {})
  }, [issue.id, token])

  const syncFigmaToLinear = async () => {
    const url = figmaUrl.trim()
    if (!url) {
      if (figmaAttachmentId) {
        try {
          await linearApi.deleteAttachment(token, figmaAttachmentId)
          setFigmaAttachmentId(null)
          setAttachments(prev => prev.filter(a => a.id !== figmaAttachmentId))
        } catch { /* ignore */ }
      }
      return
    }
    try {
      if (figmaAttachmentId) {
        await linearApi.deleteAttachment(token, figmaAttachmentId).catch(() => {})
      }
      const attachment = await linearApi.createAttachment(token, issue.id, url, 'Figma Design')
      setFigmaAttachmentId(attachment.id)
      setAttachments(prev => [
        ...prev.filter(a => a.id !== figmaAttachmentId),
        { id: attachment.id, url, title: 'Figma Design' },
      ])
      toast.success('Figma link synced to Linear')
    } catch {
      toast.error('Failed to sync Figma link to Linear')
    }
  }

  const handleStatusChange = async (statusId: string) => {
    setSaving(true)
    try {
      const updated = await linearApi.updateIssue(token, issue.id, { stateId: statusId })
      onUpdate(updated)
      toast.success('Status updated')
    } catch {
      toast.error('Failed to update status')
    } finally {
      setSaving(false)
    }
  }

  const handleAssigneeChange = async (userId: string) => {
    setSaving(true)
    try {
      const updated = await linearApi.updateIssue(token, issue.id, { assigneeId: userId })
      onUpdate(updated)
      toast.success('Assignee updated')
    } catch {
      toast.error('Failed to update assignee')
    } finally {
      setSaving(false)
    }
  }

  const priorityEntry = linearApi.PRIORITY_LABELS[issue.priority]
  const memberItems = members.map(m => ({ id: m.id, label: m.name, secondary: m.email }))

  return (
    <AnimatePresence>
      {/* Floating close button */}
      <motion.button
        key="linear-drawer-close"
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
        key="linear-drawer"
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.88 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.7 }}
        style={{ transformOrigin: 'top right' }}
        className="fixed top-8 right-8 bottom-8 z-50 w-[420px] rounded-2xl bg-drawer shadow-2xl border border-border overflow-hidden flex flex-col"
      >
        {/* Navigation bar */}
        <div className="shrink-0 flex items-center gap-2 px-4 pt-4 pb-2">
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Linear Issue</span>
        </div>

        {/* Header */}
        <div className="px-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-mono text-muted-foreground">{issue.identifier}</span>
            <div className="flex items-center gap-2">
              {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
              <a href={issue.url} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </a>
            </div>
          </div>
          <h2 className="text-base font-semibold">{issue.title}</h2>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-6 py-4 space-y-6">

            {/* Status + Priority + Assignee row */}
            <div className="flex flex-wrap gap-4">
              {/* Status picker */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Status</label>
                <Popover open={statusOpen} onOpenChange={setStatusOpen}>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-surface hover:bg-surface-hover transition-colors">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: issue.status.color }}
                      />
                      {issue.status.name}
                      <ChevronDown className="h-2.5 w-2.5 opacity-40" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[240px] p-1.5" sideOffset={4}>
                    <div className="grid grid-cols-2 gap-0.5">
                      {statuses.map(s => (
                        <button
                          key={s.id}
                          onClick={() => { handleStatusChange(s.id); setStatusOpen(false) }}
                          className={cn(
                            'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs transition-colors',
                            issue.status.id === s.id
                              ? 'bg-accent/50 text-foreground font-medium'
                              : 'text-muted-foreground hover:bg-surface hover:text-foreground',
                          )}
                        >
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: s.color }} />
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Priority */}
              {issue.priority > 0 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Priority</label>
                  <div className="flex items-center gap-2 h-8">
                    <PriorityDot priority={issue.priority} />
                    <span className={cn('text-xs font-medium', priorityEntry?.color)}>{priorityEntry?.label}</span>
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
                      {issue.assignee ? (
                        <>
                          {issue.assignee.avatarUrl ? (
                            <img src={issue.assignee.avatarUrl} className="w-4 h-4 rounded-full" alt="" />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-[#5E6AD2]/20 flex items-center justify-center text-[8px] font-semibold text-[#5E6AD2]">
                              {issue.assignee.name[0]}
                            </div>
                          )}
                          <span className="font-medium">{issue.assignee.name}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground/40">Unassigned</span>
                      )}
                      <ChevronDown className="h-2.5 w-2.5 opacity-40" />
                    </button>
                  }
                  items={memberItems}
                  selectedId={issue.assignee?.id}
                  onSelect={handleAssigneeChange}
                  placeholder="Search members…"
                  emptyLabel="No members found"
                />
              </div>
            </div>

            {/* Labels */}
            {issue.labels.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Labels</label>
                <div className="flex gap-1.5 flex-wrap">
                  {issue.labels.map(l => (
                    <span
                      key={l.id}
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: `${l.color}22`, color: l.color }}
                    >
                      {l.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Figma Link (syncs to Linear as attachment) */}
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
                  onBlur={syncFigmaToLinear}
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
            {issue.description && (
              <>
                <Separator />
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Description</label>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap"><Linkify text={issue.description} /></p>
                </div>
              </>
            )}

            {/* Attachments from Linear (Figma previews, etc.) */}
            {attachments.length > 0 && (
              <>
                <Separator />
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Attachments</label>
                  <div className="space-y-3">
                    {attachments.map(att => {
                      const isFigma = att.url.includes('figma.com')
                      if (isFigma && FIGMA_URL_REGEX.test(att.url)) {
                        return <FigmaPreview key={att.id} url={att.url} />
                      }
                      return (
                        <a
                          key={att.id}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-accent/30 text-sm text-foreground/80 hover:bg-accent/50 transition-colors"
                        >
                          <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="flex-1 truncate">{att.title || att.url}</span>
                          <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                        </a>
                      )
                    })}
                  </div>
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
  statuses,
  token,
  teamId,
  onClose,
  onCreate,
}: {
  statuses: LinearStatus[]
  token: string
  teamId: string
  onClose: () => void
  onCreate: (issue: LinearIssue) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [statusId, setStatusId] = useState(statuses[0]?.id || '')
  const [priority, setPriority] = useState(0)
  const [designType, setDesignType] = useState<DesignMeta['designType']>(undefined)
  const [loading, setLoading] = useState(false)

  const selectedStatus = statuses.find(s => s.id === statusId)

  const handleCreate = async () => {
    if (!title.trim()) return
    setLoading(true)
    try {
      const issue = await linearApi.createIssue(token, {
        teamId,
        title: title.trim(),
        description: description.trim() || undefined,
        stateId: statusId || undefined,
        priority,
      })
      if (designType) {
        linearApi.saveDesignMeta(issue.id, {
          designType,
          checklist: [...linearApi.DEFAULT_DESIGN_CHECKLIST.map(c => ({ ...c }))],
        })
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
          <DialogTitle>New Design Issue</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <Input
            placeholder="Issue title…"
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
            {/* Status */}
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Status</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: selectedStatus?.color }}
                    />
                    {selectedStatus?.name || 'Select…'}
                    <ChevronDown className="h-3 w-3 ml-auto text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {statuses.map(s => (
                    <DropdownMenuItem key={s.id} onClick={() => setStatusId(s.id)} className="gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                      {s.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Priority */}
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Priority</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                    <span className={cn('text-xs font-medium', linearApi.PRIORITY_LABELS[priority]?.color)}>
                      {linearApi.PRIORITY_LABELS[priority]?.label}
                    </span>
                    <ChevronDown className="h-3 w-3 ml-auto text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {Object.entries(linearApi.PRIORITY_LABELS).map(([p, { label, color }]) => (
                    <DropdownMenuItem key={p} onClick={() => setPriority(Number(p))}>
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
              {Object.entries(linearApi.DESIGN_TYPES).map(([key, { label, color }]) => (
                <button
                  key={key}
                  onClick={() => setDesignType(designType === key as DesignMeta['designType'] ? undefined : key as DesignMeta['designType'])}
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-full font-medium transition-all border',
                    designType === key
                      ? cn(color, 'border-transparent')
                      : 'border-border text-muted-foreground hover:border-[#5E6AD2]/50'
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

function LinearBoard({
  token,
  team,
  onDisconnect,
}: {
  token: string
  team: LinearTeam
  onDisconnect: () => void
}) {
  const [issues, setIssues] = useState<LinearIssue[]>([])
  const [statuses, setStatuses] = useState<LinearStatus[]>([])
  const [members, setMembers] = useState<linearApi.LinearUser[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIssue, setSelectedIssue] = useState<LinearIssue | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const [iss, stats, mems] = await Promise.all([
        linearApi.getIssues(token, team.id),
        linearApi.getTeamStatuses(token, team.id),
        linearApi.getTeamMembers(token, team.id),
      ])
      setMembers(mems)
      setIssues(iss)
      setStatuses(stats.sort((a, b) => {
        const order = ['triage', 'backlog', 'unstarted', 'started', 'inReview', 'completed', 'cancelled']
        return (order.indexOf(a.type) || 0) - (order.indexOf(b.type) || 0)
      }))
    } catch {
      toast.error('Failed to load Linear issues')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [token, team.id])

  useEffect(() => { load() }, [load])

  const handleRefresh = () => { setRefreshing(true); load() }

  const handleIssueUpdate = (updated: LinearIssue) => {
    setIssues(prev => prev.map(i => i.id === updated.id ? updated : i))
    if (selectedIssue?.id === updated.id) setSelectedIssue(updated)
  }

  const handleIssueCreate = (issue: LinearIssue) => {
    setIssues(prev => [issue, ...prev])
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading design board…</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-[#5E6AD2]/20 flex items-center justify-center">
            <Layers className="h-3.5 w-3.5 text-[#5E6AD2]" />
          </div>
          <span className="font-semibold text-sm">{team.name}</span>
          <span className="text-xs text-muted-foreground">Design Board</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5" />
            New Issue
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onDisconnect} className="text-destructive">
                Disconnect Linear
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
              <th className="text-left font-medium px-3 py-3 w-[80px]">ID</th>
              <th className="text-left font-medium px-3 py-3">Title</th>
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
                const meta = linearApi.getDesignMeta(issue.id)
                return (
                  <motion.tr
                    key={issue.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => setSelectedIssue(issue)}
                    className="border-b border-border/40 hover:bg-accent/20 cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-3 w-[28px]">
                      <PriorityDot priority={issue.priority} />
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {issue.identifier}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate font-medium text-foreground">{issue.title}</span>
                        {meta.figmaUrl && (
                          <Figma className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                        )}
                        {issue.labels.length > 0 && (
                          <div className="flex gap-1 shrink-0">
                            {issue.labels.slice(0, 2).map(l => (
                              <span
                                key={l.id}
                                className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                                style={{ background: `${l.color}22`, color: l.color }}
                              >
                                {l.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: issue.status.color }}
                        />
                        <span className="text-xs text-muted-foreground">{issue.status.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {meta.designType && (
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', linearApi.DESIGN_TYPES[meta.designType]?.color)}>
                          {linearApi.DESIGN_TYPES[meta.designType]?.label}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {issue.assignee ? (
                        <div className="flex items-center gap-2">
                          {issue.assignee.avatarUrl ? (
                            <img src={issue.assignee.avatarUrl} className="w-5 h-5 rounded-full" alt="" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-[#5E6AD2]/20 flex items-center justify-center text-[9px] font-semibold text-[#5E6AD2]">
                              {issue.assignee.name[0]}
                            </div>
                          )}
                          <span className="text-xs text-muted-foreground">{issue.assignee.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground/60 whitespace-nowrap">
                      {formatDistanceToNow(new Date(issue.updatedAt), { addSuffix: true })}
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
          statuses={statuses}
          members={members}
          token={token}
          onClose={() => setSelectedIssue(null)}
          onUpdate={handleIssueUpdate}
        />
      )}

      {/* Create dialog */}
      {showCreate && (
        <CreateIssueDialog
          statuses={statuses}
          token={token}
          teamId={team.id}
          onClose={() => setShowCreate(false)}
          onCreate={handleIssueCreate}
        />
      )}
    </div>
  )
}

// ── Team Selector ───────────────────────────────────────────────────────────

function TeamSelector({
  teams,
  onSelect,
}: {
  teams: LinearTeam[]
  onSelect: (team: LinearTeam) => void
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-6 px-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-1">Select a Team</h2>
        <p className="text-sm text-muted-foreground">Choose which Linear team to view</p>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        {teams.map(team => (
          <button
            key={team.id}
            onClick={() => onSelect(team)}
            className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:border-[#5E6AD2]/50 hover:bg-accent/30 transition-all text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-[#5E6AD2]/20 flex items-center justify-center text-sm font-bold text-[#5E6AD2]">
              {team.name[0]}
            </div>
            <span className="font-medium">{team.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Root LinearView ─────────────────────────────────────────────────────────

export function LinearView() {
  const { token, isConnected, isLoading, disconnect } = useLinearToken()
  const [teams, setTeams] = useState<LinearTeam[]>([])
  const [selectedTeam, setSelectedTeam] = useState<LinearTeam | null>(() => {
    const saved = localStorage.getItem(TEAM_KEY)
    return saved ? JSON.parse(saved) : null
  })
  const [loadingTeams, setLoadingTeams] = useState(false)

  useEffect(() => {
    if (!token) return
    if (selectedTeam) return
    setLoadingTeams(true)
    linearApi.getTeams(token)
      .then(t => {
        setTeams(t)
        if (t.length === 1) {
          setSelectedTeam(t[0] ?? null)
          localStorage.setItem(TEAM_KEY, JSON.stringify(t[0]))
        }
      })
      .catch(() => toast.error('Failed to load teams'))
      .finally(() => setLoadingTeams(false))
  }, [token, selectedTeam])

  const handleTeamSelect = (team: LinearTeam) => {
    setSelectedTeam(team)
    localStorage.setItem(TEAM_KEY, JSON.stringify(team))
  }

  const handleDisconnect = async () => {
    await disconnect()
    localStorage.removeItem(TEAM_KEY)
    setSelectedTeam(null)
    setTeams([])
    toast.success('Disconnected from Linear')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    )
  }

  if (!isConnected || !token) return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4 text-center px-4">
      <img src="/linear.svg" alt="Linear" className="h-8 w-8 opacity-40 invert-on-light" />
      <p className="text-sm text-muted-foreground">Linear is not connected. Connect it from the Integrations page.</p>
    </div>
  )

  if (loadingTeams) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Connecting…</span>
      </div>
    )
  }

  if (!selectedTeam) {
    return <TeamSelector teams={teams} onSelect={handleTeamSelect} />
  }

  return (
    <LinearBoard
      token={token}
      team={selectedTeam}
      onDisconnect={handleDisconnect}
    />
  )
}
