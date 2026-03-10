import { useMemo } from 'react'
import { format, formatDistanceToNow, isToday, subDays, isBefore, startOfDay } from 'date-fns'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/app/lib/utils'
import { Button } from '@/app/components/ui/button'
import {
  MessageSquarePlus,
  ChevronRight,
  Plus,
  Search,
  X,
  Folder,
  FileText,
  PenLine,
  FolderPlus,
  ListPlus,
  ArrowRight,
} from 'lucide-react'
import type { Task, Project, StatusConfig, PhaseTransition } from '@/app/types'
import type { DesignNote } from '@/app/components/NoteDrawer'
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
  designNotes: DesignNote[]
  onNoteCreate: (projectId: string) => void
  onNoteClick: (note: DesignNote) => void
  onProjectUpdate?: (id: string, updates: Partial<Project>) => void
  previewProject: Project | null
  onPreviewProjectChange: (project: Project | null) => void
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
  designNotes,
  onNoteCreate,
  onNoteClick,
  previewProject,
  onPreviewProjectChange,
  onProjectUpdate,
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
    const map = new Map<string, DesignNote[]>()
    for (const note of designNotes) {
      const key = note.projectId || ''
      const arr = map.get(key) || []
      arr.push(note)
      map.set(key, arr)
    }
    return map
  }, [designNotes])

  // ─── Recent Activity (unified feed from last 48h) ───
  type ActivityItem =
    | { type: 'phase'; timestamp: string; task: Task; transition: PhaseTransition; projectName?: string }
    | { type: 'note-created'; timestamp: string; note: DesignNote; projectName?: string }
    | { type: 'note-edited'; timestamp: string; note: DesignNote; projectName?: string }
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
    for (const note of designNotes) {
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
  }, [tasks, projects, designNotes])

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
    const items: { task: Task; reason: string; urgency: 'feedback' | 'overdue' | 'stale' }[] = []
    const today = startOfDay(new Date())
    const staleThreshold = subDays(new Date(), 7)

    for (const task of tasks) {
      if (doneStatuses.has(task.status)) continue

      // In feedback phase
      const phase = statusMap.get(task.status)
      if (phase?.isFeedback) {
        items.push({ task, reason: 'Waiting for feedback', urgency: 'feedback' })
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

    // Sort: overdue first, then feedback, then stale
    const order = { overdue: 0, feedback: 1, stale: 2 }
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
                <span className="mx-2 text-border">·</span>
                {activeTasks.length} active task{activeTasks.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 text-xs border-border/50 text-muted-foreground hover:text-foreground"
                onClick={() => onViewChange('tasks')}
              >
                <Search className="h-3.5 w-3.5" />
                Search
              </Button>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl px-5 py-5">
              <p className="text-3xl font-semibold tracking-tight">{activeTasks.length}</p>
              <p className="text-xs text-muted-foreground mt-1.5">Active Tasks</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl px-5 py-5">
              <p className="text-3xl font-semibold tracking-tight">{projectCount}</p>
              <p className="text-xs text-muted-foreground mt-1.5">Projects</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl px-5 py-5">
              <p className="text-3xl font-semibold tracking-tight text-orange-400">{needsAttention.length}</p>
              <p className="text-xs text-muted-foreground mt-1.5">Needs Attention</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl px-5 py-5">
              <p className="text-3xl font-semibold tracking-tight text-emerald-400">{completedTasks.length}</p>
              <p className="text-xs text-muted-foreground mt-1.5">Completed</p>
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
                  <div>
                    {activeProjects.map(({ project, taskCount, lastActivity }, i) => {
                      const projectAttention = attentionByProject.get(project.id) || []
                      const projectNotes = notesByProject.get(project.id) || []
                      return (
                        <div key={project.id} className={i > 0 ? 'border-t border-border/50' : ''}>
                          {/* Project row */}
                          <div
                            onClick={() => setPreviewProject(project)}
                            className="group flex items-center gap-3 py-2 -mx-2 px-2 rounded-md cursor-pointer transition-colors hover:bg-accent/20"
                          >
                            <div className="flex-1 min-w-0 flex items-center gap-2">
                              <span className="text-xs font-medium text-foreground truncate">{project.name}</span>
                              <span className="text-[10px] text-muted-foreground/60 shrink-0">
                                {taskCount}
                                {lastActivity.getTime() > 0 && (
                                  <> · {formatDistanceToNow(lastActivity, { addSuffix: true })}</>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {projectNotes.length > 0 && (
                                <span className="text-[10px] text-muted-foreground/50 tabular-nums">
                                  {projectNotes.length}
                                </span>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onNoteCreate(project.id)
                                }}
                                className="p-1 rounded text-muted-foreground/30 hover:text-foreground hover:bg-accent/30 transition-colors"
                                title="Add design note"
                              >
                                <MessageSquarePlus className="h-3 w-3" />
                              </button>
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30" />
                            </div>
                          </div>

                          {/* Needs attention tasks for this project */}
                          {projectAttention.length > 0 && (
                            <div className="ml-3 mb-1.5 space-y-0">
                              {projectAttention.map(item => (
                                <button
                                  key={item.task.id}
                                  onClick={() => { setPreviewProject(null); onTaskClick(item.task) }}
                                  className="w-full flex items-center gap-1.5 px-2 py-1 rounded text-left transition-colors hover:bg-accent/20"
                                >
                                  <div
                                    className="w-1 h-1 rounded-full shrink-0"
                                    style={{
                                      backgroundColor: item.urgency === 'overdue'
                                        ? '#f87171'
                                        : item.urgency === 'feedback'
                                          ? '#fb923c'
                                          : '#64748b',
                                    }}
                                  />
                                  <span className="text-[11px] text-foreground/60 truncate">{item.task.title}</span>
                                  <span className="text-[10px] text-muted-foreground/40 shrink-0 ml-auto">{item.reason}</span>
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
                          onClick={() => { setPreviewProject(null); onTaskClick(item.task) }}
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
                <div className="flex-1 min-h-0 rounded-xl border border-white/[0.08] bg-white/[0.07] backdrop-blur-xl overflow-hidden">
                  <div className="h-full overflow-y-auto p-2 scrollbar-auto-hide">
                    {recentActivity.map((item, idx) => {
                      if (item.type === 'phase') {
                        return (
                          <button
                            key={`phase-${item.transition.id}`}
                            onClick={() => onTaskClick(item.task)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-white/[0.04]"
                          >
                            <div
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: getPhaseColor(item.transition.toPhase, statuses) }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground truncate">{item.task.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {getPhaseTitle(item.transition.fromPhase, statuses)} <ArrowRight className="inline h-2.5 w-2.5" /> {getPhaseTitle(item.transition.toPhase, statuses)}
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
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-white/[0.04]"
                          >
                            <ListPlus className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground truncate">{item.task.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
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
                            onClick={() => onNoteClick(item.note)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-white/[0.04]"
                          >
                            <FileText className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground truncate">{item.note.title || 'Untitled note'}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
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
                            onClick={() => onNoteClick(item.note)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-white/[0.04]"
                          >
                            <PenLine className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground truncate">{item.note.title || 'Untitled note'}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
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
                            onClick={() => onViewChange(`project:${item.project.name}`)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-white/[0.04]"
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

      {/* ─── Project Preview Drawer ─── */}
      <AnimatePresence>
        {previewProject && (() => {
          const proj = previewProject
          const projTasks = tasks.filter(t => t.project === proj.id || t.project === proj.name)
          const projActiveTasks = projTasks.filter(t => !doneStatuses.has(t.status))
          const projDoneTasks = projTasks.filter(t => doneStatuses.has(t.status))
          const projNotes = notesByProject.get(proj.id) || []
          const projAttention = attentionByProject.get(proj.id) || []

          return (
            <>
              {/* Close button */}
              <motion.button
                key="project-drawer-close"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 0.85, x: 0 }}
                exit={{ opacity: 0, x: 40, transition: { type: 'spring', stiffness: 420, damping: 32, mass: 0.7 } }}
                whileHover={{ opacity: 1 }}
                transition={{ delay: 0.25, type: 'spring', stiffness: 320, damping: 28 }}
                onClick={() => setPreviewProject(null)}
                style={{ backgroundColor: '#1c1c1a' }}
                className="fixed top-8 right-[460px] z-50 flex h-[60px] w-8 items-center justify-center rounded-full text-muted-foreground shadow-lg border border-white/[0.08] hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </motion.button>

              {/* Drawer panel */}
              <motion.div
                key="project-drawer"
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.88 }}
                transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.7 }}
                style={{ backgroundColor: '#1c1c1a', transformOrigin: 'top right' }}
                className="fixed top-8 right-8 bottom-8 z-50 w-[420px] rounded-2xl shadow-2xl border border-white/[0.08] overflow-hidden flex flex-col"
              >
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <div className="p-5 space-y-6">
                    {/* Header */}
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        {(() => {
                          const IconComp = proj.metadata?.icon ? getIconComponent(proj.metadata.icon) : Folder
                          return <IconComp className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                        })()}
                        <h2 className="text-lg font-semibold text-foreground truncate">{proj.name}</h2>
                      </div>
                      {proj.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed mt-2">{proj.description}</p>
                      )}
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5">
                        <p className="text-lg font-semibold">{projActiveTasks.length}</p>
                        <p className="text-[10px] text-muted-foreground">Active</p>
                      </div>
                      <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5">
                        <p className="text-lg font-semibold text-emerald-400">{projDoneTasks.length}</p>
                        <p className="text-[10px] text-muted-foreground">Done</p>
                      </div>
                      <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5">
                        <p className="text-lg font-semibold">{projNotes.length}</p>
                        <p className="text-[10px] text-muted-foreground">Notes</p>
                      </div>
                    </div>

                    {/* Needs attention */}
                    {projAttention.length > 0 && (
                      <div>
                        <h3 className="text-xs font-medium text-muted-foreground mb-2">Needs Attention</h3>
                        <div className="space-y-1">
                          {projAttention.map(item => (
                            <button
                              key={item.task.id}
                              onClick={() => { setPreviewProject(null); onTaskClick(item.task) }}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors hover:bg-white/[0.04]"
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
                              <span className="text-xs text-foreground/80 truncate">{item.task.title}</span>
                              <span className="text-[10px] text-muted-foreground/50 shrink-0 ml-auto">{item.reason}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Active tasks */}
                    {projActiveTasks.length > 0 && (
                      <div>
                        <h3 className="text-xs font-medium text-muted-foreground mb-2">
                          Active Tasks
                          <span className="ml-1.5 text-muted-foreground/50 tabular-nums">{projActiveTasks.length}</span>
                        </h3>
                        <div className="space-y-0.5">
                          {projActiveTasks.map(task => {
                            const sc = statuses.find(s => s.id === task.status)
                            return (
                              <button
                                key={task.id}
                                onClick={() => { setPreviewProject(null); onTaskClick(task) }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors hover:bg-white/[0.04]"
                              >
                                <span className={cn('h-2 w-2 rounded-full shrink-0', sc?.color ?? 'bg-slate-500')} />
                                <span className="text-xs text-foreground truncate">{task.title}</span>
                                {task.dueDate && (
                                  <span className="text-[10px] text-muted-foreground/50 shrink-0 ml-auto">
                                    {format(new Date(task.dueDate), 'MMM d')}
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Design notes */}
                    {projNotes.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xs font-medium text-muted-foreground">Design Notes</h3>
                          <button
                            onClick={() => { setPreviewProject(null); onNoteCreate(proj.id) }}
                            className="text-[10px] text-primary hover:text-primary/80 transition-colors"
                          >
                            + Add
                          </button>
                        </div>
                        <div className="space-y-1">
                          {projNotes.slice(0, 5).map(note => (
                            <button
                              key={note.id}
                              onClick={() => { setPreviewProject(null); onNoteClick(note) }}
                              className="w-full px-3 py-2 rounded-lg text-left transition-colors hover:bg-white/[0.04]"
                            >
                              <p className="text-xs text-foreground/80 truncate">
                                {note.title || note.text || 'Untitled note'}
                              </p>
                              <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                                {isToday(new Date(note.updatedAt || note.timestamp))
                                  ? format(new Date(note.updatedAt || note.timestamp), 'h:mm a')
                                  : format(new Date(note.updatedAt || note.timestamp), 'MMM d')}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Footer: open full view */}
                    <button
                      onClick={() => { setPreviewProject(null); onViewChange(`project:${proj.name}`) }}
                      className="w-full text-center py-2.5 text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      Open full project view →
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )
        })()}
      </AnimatePresence>

    </div>
  )
}
