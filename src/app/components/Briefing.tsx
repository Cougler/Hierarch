import { useMemo, useState } from 'react'
import { format, formatDistanceToNow as _fdtn, isToday, subDays, isBefore, startOfDay } from 'date-fns'

const formatDistanceToNow: typeof _fdtn = (date, opts) =>
  _fdtn(date, opts).replace(/^about /, '')
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/app/lib/utils'
import { Button } from '@/app/components/ui/button'
import {
  MessageSquarePlus,
  MessageSquare,
  ChevronRight,
  Plus,
  X,
  Folder,
  FileText,
  PenLine,
  FolderPlus,
  ListPlus,
  ArrowRight,
  Figma,
  Trash2,
} from 'lucide-react'
import { PROJECT_PHASES } from '@/app/types'
import type { Task, Project, StatusConfig, PhaseTransition } from '@/app/types'
import type { Artifact } from '@/app/components/NoteDrawer'
import { getIconComponent } from '@/app/components/IconPicker'
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger,
} from '@/app/components/ui/context-menu'

const BG_TO_HEX: Record<string, string> = {
  'bg-violet-500': '#8b5cf6',
  'bg-blue-500': '#3b82f6',
  'bg-amber-500': '#f59e0b',
  'bg-orange-500': '#f97316',
  'bg-emerald-500': '#10b981',
  'bg-slate-500': '#64748b',
  'bg-red-500': '#ef4444',
  'bg-pink-500': '#ec4899',
  'bg-cyan-500': '#06b6d4',
  'bg-teal-500': '#14b8a6',
  'bg-indigo-500': '#6366f1',
  'bg-lime-500': '#84cc16',
  'bg-yellow-500': '#eab308',
  'bg-rose-500': '#f43f5e',
  'bg-fuchsia-500': '#d946ef',
  'bg-purple-500': '#a855f7',
  'bg-sky-500': '#0ea5e9',
  'bg-green-500': '#22c55e',
}

interface BriefingProps {
  tasks: Task[]
  projects: Project[]
  statuses: StatusConfig[]
  userName: string
  onTaskClick: (task: Task) => void
  onTaskCreate: (task: Partial<Task>) => void
  onViewChange: (view: string) => void
  onStandupCreate?: (text: string) => void
  artifacts: Artifact[]
  onArtifactCreate: (projectId: string) => void
  onArtifactClick: (note: Artifact) => void
  onProjectUpdate?: (id: string, updates: Partial<Project>) => void
  previewProject: Project | null
  onPreviewProjectChange: (project: Project | null) => void
  onDrawerTaskClick?: (task: Task) => void
  onDrawerArtifactClick?: (artifact: Artifact) => void
  onProjectCreate?: () => void
  recentLinearEvents?: { id: string; action: string; type: string; title: string; identifier: string; status_name: string; status_color: string; assignee_name: string; actor_name: string; url: string; created_at: string }[]
  recentFigmaComments?: { id: string; message: string; file_name: string; figma_user_handle: string; created_at: string }[]
  recentJiraEvents?: { id: string; action: string; type: string; title: string; identifier: string; status_name: string; status_color: string; assignee_name: string; actor_name: string; url: string; created_at: string }[]
}

function getTimeOfDay(): string {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function getPhaseColor(phaseId: string, statuses: StatusConfig[]): string {
  const phase = statuses.find(s => s.id === phaseId)
  if (!phase) return '#64748b'
  return BG_TO_HEX[phase.color] ?? '#64748b'
}

function getPhaseTitle(phaseId: string, statuses: StatusConfig[]): string {
  return statuses.find(s => s.id === phaseId)?.title ?? phaseId
}

type ActivityItem =
  | { type: 'phase'; timestamp: string; task: Task; transition: PhaseTransition; projectName?: string }
  | { type: 'note-created'; timestamp: string; note: Artifact; projectName?: string }
  | { type: 'note-edited'; timestamp: string; note: Artifact; projectName?: string }
  | { type: 'project-created'; timestamp: string; project: Project }
  | { type: 'task-created'; timestamp: string; task: Task; projectName?: string }
  | { type: 'linear-event'; timestamp: string; event: { id: string; action: string; eventType: string; title: string; identifier: string; status_name: string; status_color: string; assignee_name: string; actor_name: string } }
  | { type: 'jira-event'; timestamp: string; event: { id: string; action: string; eventType: string; title: string; identifier: string; status_name: string; status_color: string; assignee_name: string; actor_name: string } }
  | { type: 'figma-comment'; timestamp: string; comment: { id: string; message: string; file_name: string; figma_user_handle: string } }

function generateStandup(activity: ActivityItem[], projects: Project[], statuses: StatusConfig[]): string {
  const sentences: string[] = []

  // Collect sentences per project for grouping
  const byProject = new Map<string, string[]>()
  const general: string[] = []

  for (const item of activity) {
    if (item.type === 'phase') {
      const toPhase = statuses.find(s => s.id === item.transition.toPhase)
      const bucket = item.projectName || ''
      const arr = byProject.get(bucket) || []

      if (toPhase?.isFeedback) {
        arr.push(`I sent "${item.task.title}" out for review.`)
      } else if (toPhase?.isDone) {
        arr.push(`I finished "${item.task.title}".`)
      } else if (toPhase?.title?.toLowerCase().includes('progress')) {
        arr.push(`I started working on "${item.task.title}".`)
      } else {
        arr.push(`I made progress on "${item.task.title}".`)
      }
      byProject.set(bucket, arr)
    }

    if (item.type === 'task-created') {
      const bucket = item.projectName || ''
      const arr = byProject.get(bucket) || []
      arr.push(`I added "${item.task.title}" to the backlog.`)
      byProject.set(bucket, arr)
    }

    if (item.type === 'note-created') {
      const bucket = item.projectName || ''
      const arr = byProject.get(bucket) || []
      arr.push(item.note.title
        ? `I wrote up notes on "${item.note.title}".`
        : 'I wrote up some notes.')
      byProject.set(bucket, arr)
    }

    if (item.type === 'note-edited') {
      const bucket = item.projectName || ''
      const arr = byProject.get(bucket) || []
      arr.push(item.note.title
        ? `I updated my notes on "${item.note.title}".`
        : 'I updated some notes.')
      byProject.set(bucket, arr)
    }

    if (item.type === 'project-created') {
      general.push(`I kicked off a new project called "${item.project.name}".`)
    }

    if (item.type === 'linear-event') {
      const evt = item.event
      if (evt.eventType === 'Comment') {
        general.push(`I got feedback from ${evt.actor_name || 'a teammate'} on "${evt.title}".`)
      } else if (evt.action === 'create') {
        general.push(`I created a new issue in Linear: "${evt.title}".`)
      } else if (evt.status_name) {
        general.push(`I moved "${evt.title}" to ${evt.status_name} in Linear.`)
      }
    }

    if (item.type === 'jira-event') {
      const evt = item.event
      if (evt.eventType === 'Comment') {
        general.push(`I got feedback from ${evt.actor_name || 'a teammate'} on "${evt.title}".`)
      } else if (evt.action === 'created') {
        general.push(`I created a new issue in Jira: "${evt.title}".`)
      } else if (evt.status_name) {
        general.push(`I moved "${evt.title}" to ${evt.status_name} in Jira.`)
      }
    }

    if (item.type === 'figma-comment') {
      general.push(`I got design feedback from ${item.comment.figma_user_handle} on ${item.comment.file_name}.`)
    }
  }

  // Build the standup as HTML list grouped by project
  const html: string[] = []

  for (const [projectName, items] of byProject) {
    const unique = [...new Set(items)]
    if (projectName) {
      html.push(`<p><strong>${projectName}</strong></p>`)
    }
    for (const line of unique) {
      html.push(`<p>${line}</p>`)
    }
    html.push('<p><br></p>')
  }

  if (general.length > 0) {
    const unique = [...new Set(general)]
    for (const line of unique) {
      html.push(`<p>${line}</p>`)
    }
  }

  if (html.length === 0) {
    return '<p>Nothing to report from the last 24 hours.</p>'
  }

  // Remove trailing empty paragraph
  if (html[html.length - 1] === '<p><br></p>') html.pop()

  return html.join('')
}

export function Briefing({
  tasks,
  projects,
  statuses,
  userName,
  onTaskClick,
  onTaskCreate,
  onViewChange,
  onStandupCreate,
  artifacts,
  onArtifactCreate,
  onArtifactClick,
  previewProject,
  onPreviewProjectChange,
  onProjectUpdate,
  onDrawerTaskClick,
  onDrawerArtifactClick,
  onProjectCreate,
  recentLinearEvents = [],
  recentFigmaComments = [],
  recentJiraEvents = [],
}: BriefingProps) {
  const firstName = userName.split(' ')[0]
  const [dismissedItems, setDismissedItems] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('hierarch-dismissed-activity')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch { return new Set() }
  })

  const dismissItem = (key: string) => {
    setDismissedItems(prev => {
      const next = new Set(prev)
      next.add(key)
      localStorage.setItem('hierarch-dismissed-activity', JSON.stringify([...next]))
      return next
    })
  }
  const setPreviewProject = onPreviewProjectChange
  const statusMap = new Map(statuses.map(s => [s.id, s]))
  const doneStatuses = useMemo(
    () => new Set(statuses.filter(s => s.isDone).map(s => s.id)),
    [statuses],
  )

  // ─── Notes grouped by project ───
  const notesByProject = useMemo(() => {
    const map = new Map<string, Artifact[]>()
    for (const note of artifacts) {
      const key = note.projectId || ''
      const arr = map.get(key) || []
      arr.push(note)
      map.set(key, arr)
    }
    return map
  }, [artifacts])

  // ─── Recent Activity (unified feed from last 48h) ───
  const recentActivity = useMemo(() => {
    const cutoff = subDays(new Date(), 2)
    const items: ActivityItem[] = []

    // Phase transitions
    for (const task of tasks) {
      if (!task.phaseHistory?.length) continue
      const project = projects.find(p => p.id === task.project || p.name === task.project)
      for (const t of task.phaseHistory) {
        if (new Date(t.timestamp) >= cutoff) {
          items.push({ type: 'phase', timestamp: t.timestamp, task, transition: t, projectName: project?.name })
        }
      }
    }

    // Task creation
    for (const task of tasks) {
      if (!task.createdAt) continue
      if (new Date(task.createdAt) >= cutoff) {
        const project = projects.find(p => p.id === task.project || p.name === task.project)
        items.push({ type: 'task-created', timestamp: task.createdAt, task, projectName: project?.name })
      }
    }

    // Note creation & editing
    for (const note of artifacts) {
      const project = note.projectId ? projects.find(p => p.id === note.projectId) : undefined
      if (new Date(note.timestamp) >= cutoff) {
        items.push({ type: 'note-created', timestamp: note.timestamp, note, projectName: project?.name })
      }
      if (note.updatedAt && note.updatedAt !== note.timestamp && new Date(note.updatedAt) >= cutoff) {
        items.push({ type: 'note-edited', timestamp: note.updatedAt, note, projectName: project?.name })
      }
    }

    // Project creation
    for (const project of projects) {
      if (project.created_at && new Date(project.created_at) >= cutoff) {
        items.push({ type: 'project-created', timestamp: project.created_at, project })
      }
    }

    // Linear webhook events
    for (const event of recentLinearEvents) {
      if (new Date(event.created_at) >= cutoff) {
        items.push({ type: 'linear-event', timestamp: event.created_at, event: { ...event, eventType: event.type } })
      }
    }

    // Jira webhook events
    for (const event of recentJiraEvents) {
      if (new Date(event.created_at) >= cutoff) {
        items.push({ type: 'jira-event', timestamp: event.created_at, event: { ...event, eventType: event.type } })
      }
    }

    // Figma comments
    for (const comment of recentFigmaComments) {
      if (new Date(comment.created_at) >= cutoff) {
        items.push({ type: 'figma-comment', timestamp: comment.created_at, comment })
      }
    }

    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [tasks, projects, artifacts, recentLinearEvents, recentJiraEvents, recentFigmaComments])

  // ─── Active Projects (projects with non-done tasks, sorted by most recent activity) ───
  const activeProjects = useMemo(() => {
    const projectActivity = new Map<string, { project: Project; taskCount: number; phases: Map<string, number>; lastActivity: Date }>()

    for (const task of tasks) {
      if (doneStatuses.has(task.status)) continue
      if (!task.project) continue

      const project = projects.find(p => p.id === task.project || p.name === task.project)
      if (!project) continue

      let entry = projectActivity.get(project.id)
      if (!entry) {
        entry = { project, taskCount: 0, phases: new Map(), lastActivity: new Date(0) }
        projectActivity.set(project.id, entry)
      }

      entry.taskCount++
      entry.phases.set(task.status, (entry.phases.get(task.status) || 0) + 1)

      // Check phase history for latest activity
      if (task.phaseHistory?.length) {
        const latest = task.phaseHistory[task.phaseHistory.length - 1]!
        const ts = new Date(latest.timestamp)
        if (ts > entry.lastActivity) entry.lastActivity = ts
      }
    }

    return [...projectActivity.values()]
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
  }, [tasks, projects, doneStatuses])

  // ─── Needs Attention ───
  const needsAttention = useMemo(() => {
    const items: { task: Task; reason: string; urgency: 'blocked' | 'feedback' | 'overdue' | 'stale' }[] = []
    const today = startOfDay(new Date())
    const staleThreshold = subDays(new Date(), 7)
    const blockerStaleThreshold = subDays(new Date(), 3)

    for (const task of tasks) {
      if (doneStatuses.has(task.status)) continue

      // Has active blockers
      const activeBlockers = (task.blockers ?? []).filter(b => !b.resolvedAt)
      if (activeBlockers.length > 0) {
        const staleBlocker = activeBlockers.find(b => new Date(b.createdAt) < blockerStaleThreshold)
        const reason = staleBlocker
          ? `Blocked for ${formatDistanceToNow(new Date(staleBlocker.createdAt))}`
          : `${activeBlockers.length} blocker${activeBlockers.length > 1 ? 's' : ''}`
        items.push({ task, reason, urgency: 'blocked' })
        continue
      }

      // Awaiting feedback
      const phase = statusMap.get(task.status)
      if (phase?.isFeedback) {
        items.push({ task, reason: 'Awaiting feedback', urgency: 'feedback' })
        continue
      }

      // Overdue
      if (task.dueDate) {
        const due = new Date(task.dueDate)
        if (isBefore(due, today) && !isToday(due)) {
          items.push({ task, reason: `Overdue since ${format(due, 'MMM d')}`, urgency: 'overdue' })
          continue
        }
      }

      // Stale — no phase change in 7+ days
      if (task.phaseHistory?.length) {
        const lastTransition = task.phaseHistory[task.phaseHistory.length - 1]!
        if (new Date(lastTransition.timestamp) < staleThreshold) {
          items.push({ task, reason: `In ${getPhaseTitle(task.status, statuses)} for ${formatDistanceToNow(new Date(lastTransition.timestamp))}`, urgency: 'stale' })
        }
      }
    }

    // Sort: blocked first, then overdue, feedback, stale
    const order = { blocked: 0, overdue: 1, feedback: 2, stale: 3 }
    return items.sort((a, b) => order[a.urgency] - order[b.urgency])
  }, [tasks, statuses, doneStatuses])

  // ─── Attention grouped by project ───
  const attentionByProject = useMemo(() => {
    const map = new Map<string, typeof needsAttention>()
    for (const item of needsAttention) {
      const projId = item.task.project || ''
      const project = projId ? projects.find(p => p.id === projId || p.name === projId) : undefined
      const key = project?.id || ''
      const arr = map.get(key) || []
      arr.push(item)
      map.set(key, arr)
    }
    return map
  }, [needsAttention, projects])

  const unassignedAttention = attentionByProject.get('') || []

  // ─── Render ───
  const hasActivity = recentActivity.length > 0
  const hasActiveProjects = activeProjects.length > 0

  // Summary counts
  const activeTasks = tasks.filter(t => !doneStatuses.has(t.status))
  const completedTasks = tasks.filter(t => doneStatuses.has(t.status))
  const projectCount = projects.length

  return (
    <div className="flex h-full flex-col overflow-hidden px-10 pt-10 pb-0">

          {/* ─── Header ─── */}
          <div className="flex items-start justify-between mb-10">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Good {getTimeOfDay()}, {firstName}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {format(new Date(), 'EEEE, MMMM d')}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span><strong className="text-foreground font-medium">{projectCount}</strong> projects</span>
                <span><strong className="text-foreground font-medium">{activeTasks.length}</strong> active</span>
                {needsAttention.length > 0 && (
                  <span><strong className="text-attention font-medium">{needsAttention.length}</strong> attention</span>
                )}
                <span><strong className="text-emerald-600 dark:text-emerald-400 font-medium">{completedTasks.length}</strong> done</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              {onStandupCreate && (
                <Button
                  size="sm"
                  className="h-9 gap-2 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => {
                    const text = generateStandup(recentActivity, projects, statuses)
                    onStandupCreate(text)
                  }}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Standup
                </Button>
              )}
            </div>
          </div>

          {/* ─── Two-Column Layout ─── */}
          <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_360px] gap-10 items-stretch pb-[60px]">

            {/* ─── Left Column ─── */}
            <div className="flex flex-col min-h-0 min-w-0 overflow-y-auto overflow-x-hidden">
              {/* ─── Active Projects ─── */}
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <h2 className="text-sm font-semibold">Active Projects</h2>
                </div>

                {!hasActiveProjects ? (
                  <div className="rounded-xl border border-border/30 bg-card/20 px-8 py-14 flex flex-col items-center text-center">
                    <div className="relative mb-6">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Folder className="h-7 w-7 text-primary/40" />
                      </div>
                      <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                        <Plus className="h-3.5 w-3.5 text-emerald-500/60" />
                      </div>
                    </div>
                    <h3 className="text-sm font-medium text-foreground mb-1.5">No active projects yet</h3>
                    <p className="text-xs text-muted-foreground/70 leading-relaxed max-w-[280px] mb-5">
                      Create a project and add tasks to see your work organized here with statuses and progress tracking.
                    </p>
                    {onProjectCreate && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        onClick={onProjectCreate}
                      >
                        <Plus className="h-3 w-3" />
                        Create a project
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeProjects.map(({ project, taskCount, lastActivity }, index) => {
                      const projectAttention = attentionByProject.get(project.id) || []
                      const projectNotes = notesByProject.get(project.id) || []
                      const ProjectIcon = getIconComponent(project.metadata?.icon)
                      const iconColor = project.metadata?.color
                      return (
                        <div key={project.id}>
                          {/* Project row */}
                          <div
                            onClick={() => setPreviewProject(project)}
                            className="group flex items-center gap-3 py-2 px-3 cursor-pointer transition-colors bg-accent/[0.20] hover:bg-accent/30 rounded-lg"
                          >
                            <div className="flex-1 min-w-0 flex items-center gap-2">
                              <ProjectIcon className="h-3.5 w-3.5 shrink-0 text-foreground/50" />
                              <span className="text-sm font-medium text-foreground truncate">{project.name}</span>
                              <span className="text-[10px] text-muted-foreground/60 shrink-0">
                                {taskCount}
                                {lastActivity.getTime() > 0 && (
                                  <> · {formatDistanceToNow(lastActivity, { addSuffix: true })}</>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30" />
                            </div>
                          </div>
                          {/* Nested attention tasks */}
                          {projectAttention.length > 0 && (
                            <div className="ml-2 mb-1">
                              {projectAttention.map(item => (
                                <button
                                  key={item.task.id}
                                  onClick={() => onDrawerTaskClick ? onDrawerTaskClick(item.task) : onTaskClick(item.task)}
                                  className="w-full flex items-center gap-2 py-1.5 pl-2 rounded-md text-left transition-colors hover:bg-accent/20"
                                >
                                  <img src="/anglearrow.svg" alt="" className="h-3 w-3 shrink-0 opacity-40 invert-on-light" />
                                  <span className="text-[13px] text-foreground/80 truncate">{item.task.title}</span>
                                  <span className="text-xs text-muted-foreground/70 shrink-0 ml-auto">{item.reason}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Unassigned needs-attention tasks */}
                {unassignedAttention.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border/20">
                    <p className="text-xs text-muted-foreground/60 mb-2 px-3">Unassigned</p>
                    <div className="space-y-0.5">
                      {unassignedAttention.map(item => (
                        <button
                          key={item.task.id}
                          onClick={() => onDrawerTaskClick ? onDrawerTaskClick(item.task) : (setPreviewProject(null), onTaskClick(item.task))}
                          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-left transition-colors hover:bg-accent/20"
                        >
                          <div
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{
                              backgroundColor: item.urgency === 'overdue'
                                ? '#f87171'
                                : item.urgency === 'feedback'
                                  ? '#fb923c'
                                  : '#64748b',
                            }}
                          />
                          <span className="text-[13px] text-foreground/70 truncate">{item.task.title}</span>
                          <span className="text-[10px] text-muted-foreground/50 shrink-0 ml-auto">{item.reason}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </section>

            </div>

            {/* ─── Right Column: Recent Progress ─── */}
            <div className="flex flex-col min-h-0">
              <h2 className="text-sm font-semibold mb-4 shrink-0">Recent Progress</h2>

              {!hasActivity ? (
                <div className="rounded-xl border border-border/30 bg-card/20 overflow-hidden">
                  <div className="p-2 opacity-30 pointer-events-none select-none">
                    {/* Faded example: status change */}
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
                      <div className="w-2 h-2 rounded-full shrink-0 bg-blue-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground truncate">Draft the navigation structure</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">To Do <ArrowRight className="inline h-2.5 w-2.5" /> In Progress</p>
                      </div>
                      <span className="text-xs text-muted-foreground/60 shrink-0">2h ago</span>
                    </div>
                    {/* Faded example: task created */}
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
                      <ListPlus className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground truncate">Review competitor analysis</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Task created <span className="ml-1.5 text-muted-foreground/60">· Research</span></p>
                      </div>
                      <span className="text-xs text-muted-foreground/60 shrink-0">5h ago</span>
                    </div>
                    {/* Faded example: note created */}
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
                      <FileText className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground truncate">User interview insights</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Note created <span className="ml-1.5 text-muted-foreground/60">· Discovery</span></p>
                      </div>
                      <span className="text-xs text-muted-foreground/60 shrink-0">1d ago</span>
                    </div>
                    {/* Faded example: note edited */}
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
                      <PenLine className="h-3.5 w-3.5 text-attention shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground truncate">Design system decisions</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Note edited</p>
                      </div>
                      <span className="text-xs text-muted-foreground/60 shrink-0">1d ago</span>
                    </div>
                  </div>
                  <div className="px-5 pb-5 pt-2 text-center">
                    <p className="text-xs text-muted-foreground/60">Your activity from the last 48 hours will appear here.</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-h-0 rounded-xl border border-border/30 bg-card/20 backdrop-blur-xl overflow-hidden">
                  <div className="h-full overflow-y-auto p-2 scrollbar-auto-hide">
                    {recentActivity.map(item => {
                      const itemKey = item.type === 'phase' ? `phase-${item.transition.id}`
                        : item.type === 'task-created' ? `task-${item.task.id}`
                        : item.type === 'note-created' ? `note-new-${item.note.id}`
                        : item.type === 'note-edited' ? `note-edit-${item.note.id}-${item.timestamp}`
                        : item.type === 'project-created' ? `proj-${item.project.id}`
                        : item.type === 'linear-event' ? `linear-${item.event.id}`
                        : item.type === 'jira-event' ? `jira-${item.event.id}`
                        : item.type === 'figma-comment' ? `figma-${item.comment.id}`
                        : `unknown-${(item as any).timestamp}`
                      return { ...item, _key: itemKey }
                    }).filter(item => !dismissedItems.has(item._key)).map((item) => {

                      if (item.type === 'phase') {
                        const isFeedbackTransition = statuses.find(s => s.id === item.transition.toPhase)?.isFeedback
                        const linkedNote = isFeedbackTransition
                          ? artifacts.find(n => n.taskId === item.task.id && n.type === 'feedback')
                          : undefined
                        return (
                          <button
                            key={`phase-${item.transition.id}`}
                            onClick={() => onTaskClick(item.task)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-accent/50"
                          >
                            <div
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: getPhaseColor(item.transition.toPhase, statuses) }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-foreground truncate">{item.task.title}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {isFeedbackTransition ? (
                                  <>
                                    Moved to feedback
                                    {linkedNote && (
                                      <> with <span
                                        role="link"
                                        onClick={(e) => { e.stopPropagation(); onArtifactClick(linkedNote) }}
                                        className="text-primary hover:underline cursor-pointer"
                                      >feedback</span></>
                                    )}
                                  </>
                                ) : (
                                  <>{getPhaseTitle(item.transition.fromPhase, statuses)} <ArrowRight className="inline h-2.5 w-2.5" /> {getPhaseTitle(item.transition.toPhase, statuses)}</>
                                )}
                                {item.projectName && <span className="ml-1.5 text-muted-foreground/60">· {item.projectName}</span>}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground/60 shrink-0">
                              {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                            </span>
                          </button>
                        )
                      }

                      if (item.type === 'task-created') {
                        return (
                          <button
                            key={`task-${item.task.id}`}
                            onClick={() => onTaskClick(item.task)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-accent/50"
                          >
                            <ListPlus className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-foreground truncate">{item.task.title}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Task created
                                {item.projectName && <span className="ml-1.5 text-muted-foreground/60">· {item.projectName}</span>}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground/60 shrink-0">
                              {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                            </span>
                          </button>
                        )
                      }

                      if (item.type === 'note-created') {
                        return (
                          <button
                            key={`note-new-${item.note.id}`}
                            onClick={() => onArtifactClick(item.note)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-accent/50"
                          >
                            <FileText className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-foreground truncate">{item.note.title || 'Untitled note'}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Note created
                                {item.projectName && <span className="ml-1.5 text-muted-foreground/60">· {item.projectName}</span>}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground/60 shrink-0">
                              {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                            </span>
                          </button>
                        )
                      }

                      if (item.type === 'note-edited') {
                        return (
                          <button
                            key={`note-edit-${item.note.id}-${item.timestamp}`}
                            onClick={() => onArtifactClick(item.note)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-accent/50"
                          >
                            <PenLine className="h-3.5 w-3.5 text-attention shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-foreground truncate">{item.note.title || 'Untitled note'}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Note edited
                                {item.projectName && <span className="ml-1.5 text-muted-foreground/60">· {item.projectName}</span>}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground/60 shrink-0">
                              {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                            </span>
                          </button>
                        )
                      }

                      if (item.type === 'project-created') {
                        return (
                          <button
                            key={`proj-${item.project.id}`}
                            onClick={() => onViewChange(`project:${item.project.id}`)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-accent/50"
                          >
                            <FolderPlus className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground truncate">{item.project.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">Project created</p>
                            </div>
                            <span className="text-xs text-muted-foreground/60 shrink-0">
                              {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                            </span>
                          </button>
                        )
                      }

                      if (item.type === 'linear-event') {
                        const evt = item.event
                        let reason = ''
                        if (evt.eventType === 'Comment') reason = `Comment by ${evt.actor_name || 'someone'}`
                        else if (evt.action === 'create') reason = 'Issue created'
                        else if (evt.status_name) reason = `Changed to ${evt.status_name}`
                        else if (evt.assignee_name) reason = `Assigned to ${evt.assignee_name}`
                        else reason = 'Updated'
                        return (
                          <button
                            key={`linear-${evt.id}`}
                            onClick={() => onViewChange('linear')}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-accent/50"
                          >
                            <img src="/linear.svg" alt="Linear" className="h-3.5 w-3.5 shrink-0 opacity-50 invert-on-light" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-foreground truncate">{evt.title}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {reason}
                                {evt.identifier && <span className="ml-1.5 text-muted-foreground/60">· {evt.identifier}</span>}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground/60 shrink-0">
                              {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                            </span>
                          </button>
                        )
                      }

                      if (item.type === 'jira-event') {
                        const evt = item.event
                        let reason = ''
                        if (evt.eventType === 'Comment') reason = `Comment by ${evt.actor_name || 'someone'}`
                        else if (evt.action === 'created') reason = 'Issue created'
                        else if (evt.status_name) reason = `Changed to ${evt.status_name}`
                        else if (evt.assignee_name) reason = `Assigned to ${evt.assignee_name}`
                        else reason = 'Updated'
                        return (
                          <button
                            key={`jira-${evt.id}`}
                            onClick={() => onViewChange('jira')}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-accent/50"
                          >
                            <svg className="h-3.5 w-3.5 shrink-0 opacity-50" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.35V2.84a.84.84 0 0 0-.84-.84H11.53ZM6.77 6.8a4.36 4.36 0 0 0 4.34 4.34h1.8v1.72a4.36 4.36 0 0 0 4.34 4.34V7.63a.84.84 0 0 0-.84-.84H6.77ZM2 11.6a4.35 4.35 0 0 0 4.35 4.35h1.78v1.7c0 2.4 1.95 4.35 4.35 4.35v-9.56a.84.84 0 0 0-.84-.84H2Z" />
                            </svg>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-foreground truncate">{evt.title}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {reason}
                                {evt.identifier && <span className="ml-1.5 text-muted-foreground/60">· {evt.identifier}</span>}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground/60 shrink-0">
                              {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                            </span>
                          </button>
                        )
                      }

                      if (item.type === 'figma-comment') {
                        return (
                          <button
                            key={`figma-${item.comment.id}`}
                            onClick={() => onViewChange('figma')}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-accent/50"
                          >
                            <Figma className="h-3.5 w-3.5 shrink-0 opacity-50" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-foreground truncate">{item.comment.message}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Comment from {item.comment.figma_user_handle}
                                <span className="ml-1.5 text-muted-foreground/60">· {item.comment.file_name}</span>
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground/60 shrink-0">
                              {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                            </span>
                          </button>
                        )
                      }

                      return null
                    }).filter(Boolean).map((el, i) => {
                      // Wrap each rendered item with a context menu for dismissal
                      const key = (el as React.ReactElement)?.key || `activity-${i}`
                      return (
                        <ContextMenu key={`ctx-${key}`}>
                          <ContextMenuTrigger asChild>
                            {el}
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem
                              onClick={() => {
                                const k = typeof key === 'string' ? key : `activity-${i}`
                                dismissItem(k)
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" /> Remove from feed
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

    </div>
  )
}
