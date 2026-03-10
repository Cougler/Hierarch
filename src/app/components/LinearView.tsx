import { useState, useEffect, useCallback, useRef } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import {
  ExternalLink, Figma, Plus, RefreshCw, ChevronDown,
  Link2, Pencil, AlertCircle, X, Check, Loader2, Layers,
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
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from './ui/sheet'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { cn } from '../lib/utils'
import * as linearApi from '../api/linear'
import type { LinearIssue, LinearTeam, LinearStatus, DesignMeta } from '../api/linear'

const TOKEN_KEY = 'hierarch-linear-token'
const TEAM_KEY = 'hierarch-linear-team'

// ── Setup Screen ────────────────────────────────────────────────────────────

function LinearSetup({ onConnect }: { onConnect: (token: string) => void }) {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    const t = token.trim()
    if (!t) return
    setLoading(true)
    try {
      await linearApi.getViewer(t)
      localStorage.setItem(TOKEN_KEY, t)
      onConnect(t)
      toast.success('Connected to Linear')
    } catch {
      toast.error('Invalid API key — check your Linear personal token')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-6 px-4">
      <div className="flex flex-col items-center gap-3 text-center max-w-sm">
        <div className="w-12 h-12 rounded-2xl bg-[#5E6AD2]/20 flex items-center justify-center">
          <Layers className="h-6 w-6 text-[#5E6AD2]" />
        </div>
        <h2 className="text-xl font-semibold">Connect to Linear</h2>
        <p className="text-sm text-muted-foreground">
          Enter your Linear personal API key to manage design work alongside your team's issues.
        </p>
        <p className="text-xs text-muted-foreground">
          Get it at{' '}
          <span className="font-mono text-[#5E6AD2]">linear.app → Settings → API → Personal API keys</span>
        </p>
      </div>

      <div className="w-full max-w-sm flex gap-2">
        <Input
          type="password"
          placeholder="lin_api_…"
          value={token}
          onChange={e => setToken(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleConnect()}
          className="font-mono text-sm"
        />
        <Button onClick={handleConnect} disabled={loading || !token.trim()} className="shrink-0">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Connect'}
        </Button>
      </div>
    </div>
  )
}

// ── Priority Badge ──────────────────────────────────────────────────────────

function PriorityDot({ priority }: { priority: number }) {
  const entry = linearApi.PRIORITY_LABELS[priority] ?? linearApi.PRIORITY_LABELS[0]
  const color = entry?.color ?? ''
  if (priority === 0) return null
  return (
    <span className={cn('text-xs font-medium', color)}>
      P{priority}
    </span>
  )
}

// ── Issue Detail Drawer ─────────────────────────────────────────────────────

function IssueDrawer({
  issue,
  statuses,
  token,
  onClose,
  onUpdate,
}: {
  issue: LinearIssue
  statuses: LinearStatus[]
  token: string
  onClose: () => void
  onUpdate: (updated: LinearIssue) => void
}) {
  const [meta, setMeta] = useState<DesignMeta>(() => {
    const saved = linearApi.getDesignMeta(issue.id)
    return {
      figmaUrl: saved.figmaUrl || '',
      designType: saved.designType,
      checklist: saved.checklist || [...linearApi.DEFAULT_DESIGN_CHECKLIST.map(c => ({ ...c }))],
    }
  })
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState(issue.title)
  const figmaAttachmentId = useRef<string | null>(null)

  // Load existing Figma attachment from Linear on mount
  useEffect(() => {
    linearApi.getAttachments(token, issue.id)
      .then(attachments => {
        const figma = attachments.find(a => a.url.includes('figma.com'))
        if (figma) {
          figmaAttachmentId.current = figma.id
          if (!meta.figmaUrl) {
            setMeta(prev => ({ ...prev, figmaUrl: figma.url }))
            linearApi.saveDesignMeta(issue.id, { ...meta, figmaUrl: figma.url })
          }
        }
      })
      .catch(() => { /* ignore — attachment fetch is best-effort */ })
  }, [issue.id, token])

  const saveMeta = useCallback((updated: DesignMeta) => {
    setMeta(updated)
    linearApi.saveDesignMeta(issue.id, updated)
  }, [issue.id])

  const syncFigmaToLinear = async () => {
    const url = meta.figmaUrl?.trim()
    if (!url) {
      // Clear attachment if URL was removed
      if (figmaAttachmentId.current) {
        try {
          await linearApi.deleteAttachment(token, figmaAttachmentId.current)
          figmaAttachmentId.current = null
        } catch { /* ignore */ }
      }
      return
    }
    try {
      // Delete old attachment first if it exists
      if (figmaAttachmentId.current) {
        await linearApi.deleteAttachment(token, figmaAttachmentId.current).catch(() => {})
      }
      const attachment = await linearApi.createAttachment(token, issue.id, url, 'Figma Design')
      figmaAttachmentId.current = attachment.id
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

  const handleTitleBlur = async () => {
    if (title === issue.title) return
    setSaving(true)
    try {
      const updated = await linearApi.updateIssue(token, issue.id, { title })
      onUpdate(updated)
    } catch {
      toast.error('Failed to update title')
      setTitle(issue.title)
    } finally {
      setSaving(false)
    }
  }

  const toggleCheck = (id: string) => {
    const updated = (meta.checklist || []).map(c => c.id === id ? { ...c, done: !c.done } : c)
    saveMeta({ ...meta, checklist: updated })
  }

  return (
    <Sheet open onOpenChange={open => !open && onClose()}>
      <SheetContent className="w-[420px] sm:w-[520px] overflow-y-auto flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between gap-2">
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
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            className="text-base font-semibold border-0 p-0 shadow-none focus-visible:ring-0 bg-transparent h-auto"
          />
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-4 space-y-6">

            {/* Status */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Status</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: issue.status.color }}
                    />
                    {issue.status.name}
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {statuses.map(s => (
                    <DropdownMenuItem
                      key={s.id}
                      onClick={() => handleStatusChange(s.id)}
                      className="gap-2"
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                      {s.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Separator />

            {/* Design Type */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
                Design Type
              </label>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(linearApi.DESIGN_TYPES).map(([key, { label, color }]) => (
                  <button
                    key={key}
                    onClick={() => saveMeta({ ...meta, designType: key as DesignMeta['designType'] })}
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-full font-medium transition-all border',
                      meta.designType === key
                        ? cn(color, 'border-transparent')
                        : 'border-border text-muted-foreground hover:border-[#5E6AD2]/50'
                    )}
                  >
                    {label}
                  </button>
                ))}
                {meta.designType && (
                  <button
                    onClick={() => saveMeta({ ...meta, designType: undefined })}
                    className="text-xs px-2 py-1 rounded-full text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Figma Link */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
                <Figma className="inline h-3 w-3 mr-1" />
                Figma File
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://figma.com/file/…"
                  value={meta.figmaUrl || ''}
                  onChange={e => saveMeta({ ...meta, figmaUrl: e.target.value })}
                  onBlur={syncFigmaToLinear}
                  className="text-sm font-mono"
                />
                {meta.figmaUrl && (
                  <a href={meta.figmaUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                )}
              </div>
            </div>

            <Separator />

            {/* Design Review Checklist */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-3">
                Design Review Checklist
              </label>
              <div className="space-y-2">
                {(meta.checklist || []).map(item => (
                  <button
                    key={item.id}
                    onClick={() => toggleCheck(item.id)}
                    className="flex items-center gap-2.5 w-full text-left group"
                  >
                    <div className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all',
                      item.done
                        ? 'bg-[#5E6AD2] border-[#5E6AD2]'
                        : 'border-border group-hover:border-[#5E6AD2]/50'
                    )}>
                      {item.done && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                    <span className={cn('text-sm', item.done && 'line-through text-muted-foreground')}>
                      {item.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            {issue.description && (
              <>
                <Separator />
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Description</label>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{issue.description}</p>
                </div>
              </>
            )}

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

            {/* Assignee */}
            {issue.assignee && (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Assignee</label>
                <div className="flex items-center gap-2">
                  {issue.assignee.avatarUrl ? (
                    <img src={issue.assignee.avatarUrl} className="w-6 h-6 rounded-full" alt="" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#5E6AD2]/20 flex items-center justify-center text-[10px] font-semibold text-[#5E6AD2]">
                      {issue.assignee.name[0]}
                    </div>
                  )}
                  <span className="text-sm">{issue.assignee.name}</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
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
  const [loading, setLoading] = useState(true)
  const [selectedIssue, setSelectedIssue] = useState<LinearIssue | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const [iss, stats] = await Promise.all([
        linearApi.getIssues(token, team.id),
        linearApi.getTeamStatuses(token, team.id),
      ])
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
              <th className="text-left font-medium px-6 py-3 w-[80px]">ID</th>
              <th className="text-left font-medium px-3 py-3">Title</th>
              <th className="text-left font-medium px-3 py-3 w-[130px]">Status</th>
              <th className="text-left font-medium px-3 py-3 w-[70px]">Priority</th>
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
                    <td className="px-6 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
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
                      <PriorityDot priority={issue.priority} />
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
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
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

  const handleConnect = (t: string) => {
    setToken(t)
    setSelectedTeam(null)
  }

  const handleTeamSelect = (team: LinearTeam) => {
    setSelectedTeam(team)
    localStorage.setItem(TEAM_KEY, JSON.stringify(team))
  }

  const handleDisconnect = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(TEAM_KEY)
    setToken(null)
    setSelectedTeam(null)
    setTeams([])
    toast.success('Disconnected from Linear')
  }

  if (!token) return <LinearSetup onConnect={handleConnect} />

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
