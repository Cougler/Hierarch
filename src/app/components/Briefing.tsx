import { useMemo } from 'react'
import { format, formatDistanceToNow, isToday, subDays, isBefore, startOfDay } from 'date-fns'
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
} from 'lucide-react'
import type { Task, Project, StatusConfig, PhaseTransition } from '@/app/types'
import type { Artifact } from '@/app/components/NoteDrawer'
import { getIconComponent } from '@/app/components/IconPicker'

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
  onNewTask?: () => void
  artifacts: Artifact[]
  onArtifactCreate: (projectId: string) => void
  onArtifactClick: (note: Artifact) => void
  onProjectUpdate?: (id: string, updates: Partial<Project>) => void
  previewProject: Project | null
  onPreviewProjectChange: (project: Project | null) => void
  onDrawerTaskClick?: (task: Task) => void
  onDrawerArtifactClick?: (artifact: Artifact) => void
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

export function Briefing({
  tasks,
  projects,
  statuses,
  userName,
  onTaskClick,
  onTaskCreate,
  onViewChange,
  onNewTask,
  artifacts,
  onArtifactCreate,
  onArtifactClick,
  previewProject,
  onPreviewProjectChange,
  onProjectUpdate,
  onDrawerTaskClick,
  onDrawerArtifactClick,
}: BriefingProps) {
  const firstName = userName.split(' ')[0]
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
  type ActivityItem =
    | { type: 'phase'; timestamp: string; task: Task; transition: PhaseTransition; projectName?: string }
    | { type: 'note-created'; timestamp: string; note: Artifact; projectName?: string }
    | { type: 'note-edited'; timestamp: string; note: Artifact; projectName?: string }
    | { type: 'project-created'; timestamp: string; project: Project }
    | { type: 'task-created'; timestamp: string; task: Task; projectName?: string }

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

    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [tasks, projects, artifacts])

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

      // In review phase
      const phase = statusMap.get(task.status)
      if (phase?.isFeedback) {
        items.push({ task, reason: 'In review', urgency: 'feedback' })
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
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              {onNewTask && (
                <Button
                  size="sm"
                  className="h-9 gap-2 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={onNewTask}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add task
                </Button>
              )}
            </div>
          </div>

          {/* ─── Stat Cards ─── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
            <div className="border-t border-b border-border px-4 py-3">
              <p className="text-xl font-medium tracking-tight text-foreground/80">{projectCount}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">Projects</p>
            </div>
            <div className="border-t border-b border-border px-4 py-3">
              <p className="text-xl font-medium tracking-tight text-foreground/80">{activeTasks.length}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">Active Tasks</p>
            </div>
            <div className="border-t border-b border-border px-4 py-3">
              <p className="text-xl font-medium tracking-tight text-attention">{needsAttention.length}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">Needs Attention</p>
            </div>
            <div className="border-t border-b border-border px-4 py-3">
              <p className="text-xl font-medium tracking-tight text-emerald-400/80">{completedTasks.length}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">Completed</p>
            </div>
          </div>

          {/* ─── Two-Column Layout ─── */}
          <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_360px] gap-10 items-stretch pb-[60px]">

            {/* ─── Left Column ─── */}
            <div className="flex flex-col min-h-0 min-w-0 overflow-y-auto overflow-x-hidden">
              {/* ─── Active Projects ─── */}
              <section>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-sm font-semibold">Active Projects</h2>
                  <button
                    onClick={() => onViewChange('tasks')}
                    className="text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    View all
                  </button>
                </div>

                {!hasActiveProjects ? (
                  <div className="rounded-xl border border-border/30 bg-card/20 px-5 py-10 text-center">
                    <p className="text-sm text-muted-foreground">No active projects yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeProjects.map(({ project, taskCount, lastActivity }) => {
                      const projectAttention = attentionByProject.get(project.id) || []
                      const projectNotes = notesByProject.get(project.id) || []
                      const ProjectIcon = getIconComponent(project.metadata?.icon)
                      const iconColor = project.metadata?.color
                      return (
                        <div
                          key={project.id}
                          className="rounded-xl border border-border bg-card overflow-hidden"
                        >
                          {/* Project row */}
                          <div
                            onClick={() => setPreviewProject(project)}
                            className="group flex items-center gap-3 py-2.5 px-3 cursor-pointer transition-colors hover:bg-accent/20"
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
                              {projectAttention.length > 0 ? (
                                <span className="text-[10px] text-attention">
                                  {projectAttention.length} needs attention
                                </span>
                              ) : null}
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30" />
                            </div>
                          </div>
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
                          <span className="text-xs text-foreground/70 truncate">{item.task.title}</span>
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
                <div className="rounded-xl border border-border/30 bg-card/20 px-5 py-10 text-center">
                  <p className="text-sm text-muted-foreground">No recent activity.</p>
                </div>
              ) : (
                <div className="flex-1 min-h-0 rounded-xl border border-border/30 bg-card/20 backdrop-blur-xl overflow-hidden">
                  <div className="h-full overflow-y-auto p-2 scrollbar-auto-hide">
                    {recentActivity.map((item, idx) => {
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
                                    Moved to review
                                    {linkedNote && (
                                      <> with <span
                                        role="link"
                                        onClick={(e) => { e.stopPropagation(); onArtifactClick(linkedNote) }}
                                        className="text-primary hover:underline cursor-pointer"
                                      >note</span></>
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

                      return null
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

    </div>
  )
}
