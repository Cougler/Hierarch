import { useState, useEffect, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Toaster, toast } from 'sonner'
import { supabase } from './supabase-client'
import type { Task, Project, StatusConfig, TimeEntry, Blocker, BlockerType, PhaseTransition } from './types'
import { DEFAULT_STATUSES } from './types'
import * as api from './api/data'
import { DEMO_USER, DEMO_PROJECTS, DEMO_TASKS, DEMO_TIME_ENTRIES, DEMO_DESIGN_NOTES, STARTER_PROJECTS, STARTER_TASKS, STARTER_DESIGN_NOTES } from './demo-data'
import { ThemeProvider } from './components/ThemeProvider'
import { TooltipProvider } from './components/ui/tooltip'
import { useIsMobile } from './hooks/use-mobile'
import { handleLinearOAuthCallback } from './hooks/use-linear-token'
import { handleFigmaOAuthCallback } from './hooks/use-figma-token'

import Login from './components/Login'
import Signup from './components/Signup'
import Splash from './components/Splash'
import Onboarding from './components/Onboarding'
import AvatarSelection from './components/AvatarSelection'
import { Sidebar } from './components/Sidebar'
import { Briefing } from './components/Briefing'
import { TaskBoard } from './components/TaskBoard'
import { TaskDetailsDrawer } from './components/TaskDetailsDrawer'
import { NewTaskDrawer } from './components/NewTaskDrawer'
import { ProjectDetails } from './components/ProjectDetails'
import { ArtifactsView } from './components/ArtifactsView'
import { TimeTrackingView } from './components/TimeTrackingView'
import { FigmaView } from './components/FigmaView'
import { AppsDashboard } from './components/AppsDashboard'
import { AccountSettings } from './components/AccountSettings'
import { SettingsPage } from './components/SettingsPage'
import { UpdateNotification } from './components/UpdateNotification'
import { CapacityView } from './components/CapacityView'
import { FocusTimerView } from './components/FocusTimerView'
import { LinearView } from './components/LinearView'
import { IntegrationsPage } from './components/IntegrationsPage'
import { NoteDrawer } from './components/NoteDrawer'
import type { Artifact } from './components/NoteDrawer'
import { UnifiedDrawer } from './components/UnifiedDrawer'
import type { DrawerFrame } from './components/UnifiedDrawer'

type AuthState = 'loading' | 'unauthenticated' | 'onboarding' | 'authenticated'
type AuthView = 'login' | 'signup'

export default function App() {
  const isMobile = useIsMobile()

  const [authState, setAuthState] = useState<AuthState>('loading')
  const [authView, setAuthView] = useState<AuthView>('login')
  const [user, setUser] = useState<any>(null)

  const [activeView, setActiveView] = useState('today')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [dataLoading, setDataLoading] = useState(true)

  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [statuses, setStatuses] = useState<StatusConfig[]>(() => {
    const saved = localStorage.getItem('hierarch-statuses')
    if (!saved) return DEFAULT_STATUSES
    const parsed: StatusConfig[] = JSON.parse(saved)
    // Reset to defaults if saved statuses don't match current phase IDs
    const defaultIds = new Set(DEFAULT_STATUSES.map(s => s.id))
    const savedIds = new Set(parsed.map(s => s.id))
    if (DEFAULT_STATUSES.some(s => !savedIds.has(s.id)) || parsed.some(s => !defaultIds.has(s.id))) {
      localStorage.setItem('hierarch-statuses', JSON.stringify(DEFAULT_STATUSES))
      return DEFAULT_STATUSES
    }
    return parsed
  })
  const [showProjectIcons, setShowProjectIcons] = useState(() => {
    return localStorage.getItem('hierarch-show-project-icons') !== 'false'
  })

  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  // Drawer navigation stack — tracks history for back navigation
  const [drawerStack, setDrawerStack] = useState<DrawerFrame[]>([])
  const [drawerDirection, setDrawerDirection] = useState<1 | -1>(1)
  const [newTaskDrawerOpen, setNewTaskDrawerOpen] = useState(false)
  const [newTaskDefaultProjectId, setNewTaskDefaultProjectId] = useState<string | undefined>(undefined)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [demoMode, setDemoMode] = useState(false)
  const [focusTask, setFocusTask] = useState<Task | null>(null)

  // Artifacts
  const [artifacts, setArtifacts] = useState<Artifact[]>(() => {
    // Check new key first, fall back to old key for migration
    const saved = localStorage.getItem('hierarch-artifacts') || localStorage.getItem('hierarch-artifacts')
    if (!saved) return []
    const parsed = JSON.parse(saved)
    return parsed.map((n: any) => ({
      ...n,
      title: n.title || '',
      type: n.type || 'freeform',
      updatedAt: n.updatedAt || n.timestamp,
    }))
  })
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null)
  const [previewProject, setPreviewProject] = useState<Project | null>(null)

  const tempIdMapping = useRef<Record<string, string>>({})
  const savingTaskIds = useRef<Set<string>>(new Set())

  const handleDemoLogin = () => {
    setDemoMode(true)
    localStorage.setItem('hierarch-demo', 'true')
    setUser(DEMO_USER)
    setProjects([...DEMO_PROJECTS])
    setTasks([...DEMO_TASKS])

    setTimeEntries([...DEMO_TIME_ENTRIES])
    setArtifacts([...DEMO_DESIGN_NOTES])
    setDataLoading(false)
    setAuthState('onboarding')
  }

  const restoreDemoSession = () => {
    setDemoMode(true)
    setUser(DEMO_USER)
    setProjects([...DEMO_PROJECTS])
    setTasks([...DEMO_TASKS])

    setTimeEntries([...DEMO_TIME_ENTRIES])
    setArtifacts([...DEMO_DESIGN_NOTES])
    setDataLoading(false)
    setAuthState('authenticated')
  }

  // Auth initialization
  useEffect(() => {
    if (localStorage.getItem('hierarch-demo') === 'true') {
      restoreDemoSession()
      return
    }

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user)
          determineAuthState(session.user)
        } else {
          setAuthState('unauthenticated')
        }
      } catch {
        setAuthState('unauthenticated')
      }
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        determineAuthState(session.user)
      } else if (event === 'SIGNED_OUT' || (event as string) === 'USER_DELETED') {
        setUser(null)
        setAuthState('unauthenticated')
        resetAppState()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Handle OAuth callbacks
  useEffect(() => {
    const path = window.location.pathname
    if (path === '/auth/linear/callback') {
      handleLinearOAuthCallback()
        .then((success) => {
          if (success) {
            toast.success('Connected to Linear')
            setActiveView('linear')
          }
        })
        .catch(() => {
          toast.error('Failed to connect to Linear')
          window.history.replaceState({}, '', '/')
        })
    } else if (path === '/auth/figma/callback') {
      handleFigmaOAuthCallback()
        .then((success) => {
          if (success) {
            toast.success('Connected to Figma')
            setActiveView('figma')
          }
        })
        .catch(() => {
          toast.error('Failed to connect to Figma')
          window.history.replaceState({}, '', '/')
        })
    }
  }, [])

  const determineAuthState = async (u: any) => {
    // Auto-skip avatar step: mark it seen immediately for all new users.
    // Google users already have avatar_url set by Supabase; email users use initials.
    if (!u.user_metadata?.has_seen_avatar) {
      try {
        await supabase.auth.updateUser({ data: { has_seen_avatar: true } })
      } catch { /* best-effort */ }
    }
    if (!u.user_metadata?.has_seen_onboarding) {
      setAuthState('onboarding')
    } else {
      setAuthState('authenticated')
    }
  }

  const resetAppState = () => {
    setProjects([])
    setTasks([])
    setTimeEntries([])
    setActiveView('today')
    setSelectedTask(null)
    setDrawerStack([])
  }

  // Load data when authenticated or onboarding (dialog overlays real app)
  useEffect(() => {
    if (authState !== 'authenticated' && authState !== 'onboarding') return
    loadData()
  }, [authState])

  const loadData = async () => {
    if (demoMode) { setDataLoading(false); return }
    setDataLoading(true)

    // Run one-time migration from waitingFor to blockers (non-blocking)
    api.migrateWaitingForToBlockers().catch(() => {})

    const [projectsData, tasksData, blockersData] = await Promise.all([
      api.getProjects(),
      api.getTasks(),
      api.getBlockersForUser(),
    ])

    // New accounts start empty — no seeding, clear any stale localStorage artifacts
    if ((!projectsData || projectsData.length === 0) && (!tasksData || tasksData.length === 0)) {
      setProjects([])
      setTasks([])
      setArtifacts([])
      localStorage.removeItem('hierarch-artifacts')
      setDataLoading(false)
      loadTimeEntries()
      return
    }

    if (projectsData) setProjects(projectsData)
    if (tasksData) {
      // Attach blockers to their tasks
      const blockersByTask = new Map<string, Blocker[]>()
      for (const b of blockersData) {
        const list = blockersByTask.get(b.taskId) || []
        list.push(b)
        blockersByTask.set(b.taskId, list)
      }
      setTasks(tasksData.map(t => {
        const taskBlockers = blockersByTask.get(t.id)
        return taskBlockers ? { ...t, blockers: taskBlockers } : t
      }))
    }
    setDataLoading(false)
    loadTimeEntries()
  }

  const seedStarterData = async () => {
    // Create projects and get back real UUIDs
    const projectMap: Record<string, string> = {}
    for (const dp of STARTER_PROJECTS) {
      const created = await api.createProject(
        dp.name,
        dp.metadata,
        dp.metadata?.start_date,
        dp.metadata?.end_date,
        dp.description
      )
      if (created) projectMap[dp.id] = created.id
    }

    // Create tasks, mapping demo project/task IDs to real UUIDs
    const taskMap: Record<string, string> = {}
    for (const dt of STARTER_TASKS) {
      const realProjectId = dt.project ? projectMap[dt.project] : undefined
      const created = await api.createTask(
        { ...dt, project: realProjectId },
        realProjectId
      )
      if (created) taskMap[dt.id] = created.id
    }

    // Seed design notes into localStorage
    const savedNotes = localStorage.getItem('hierarch-artifacts')
    if (!savedNotes || JSON.parse(savedNotes).length === 0) {
      const seededNotes = STARTER_DESIGN_NOTES.map(n => ({
        ...n,
        projectId: n.projectId ? (projectMap[n.projectId] || n.projectId) : undefined,
        taskId: n.taskId ? (taskMap[n.taskId] || n.taskId) : undefined,
      }))
      localStorage.setItem('hierarch-artifacts', JSON.stringify(seededNotes))
      setArtifacts(seededNotes)
    }

    // Reload from DB to get canonical state
    const [projectsData, tasksData] = await Promise.all([
      api.getProjects(),
      api.getTasks(),
    ])
    if (projectsData) setProjects(projectsData)
    if (tasksData) setTasks(tasksData)
  }

  const loadTimeEntries = async () => {
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) return
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/time-entries`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.ok) {
        const data = await res.json()
        setTimeEntries(data || [])
      }
    } catch (e) {
      console.error('Failed to load time entries:', e)
    }
  }

  // Persist statuses
  useEffect(() => {
    localStorage.setItem('hierarch-statuses', JSON.stringify(statuses))
  }, [statuses])

  useEffect(() => {
    localStorage.setItem('hierarch-show-project-icons', String(showProjectIcons))
  }, [showProjectIcons])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        handleTaskCreate({ title: '', status: statuses[0]?.id || 'explore' })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Project operations
  const handleProjectCreate = async (name: string, metadata?: any) => {
    const newProject: Project = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      metadata,
      created_at: new Date().toISOString(),
    }
    setProjects(prev => [...prev, newProject])
    if (demoMode) return

    const result = await api.createProject(name, metadata)
    if (result) {
      setProjects(prev => prev.map(p => p.id === newProject.id ? { ...p, id: result.id } : p))
    } else {
      toast.error('Failed to create project')
      setProjects(prev => prev.filter(p => p.id !== newProject.id))
    }
  }

  const handleProjectUpdate = async (id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
    if (demoMode) return

    const result = await api.updateProject(id, updates)
    if (!result) toast.error('Failed to update project')
  }

  const handleProjectDelete = async (id: string) => {
    const prev = projects
    setProjects(p => p.filter(pr => pr.id !== id))
    setTasks(t => t.filter(task => {
      const project = prev.find(pr => pr.id === id)
      return task.project !== project?.name
    }))
    if (demoMode) { toast.success('Project deleted'); return }

    const result = await api.deleteProject(id)
    if (!result) {
      toast.error('Failed to delete project')
      setProjects(prev)
    } else {
      toast.success('Project deleted')
    }
  }

  const handleProjectsReorder = (reordered: Project[]) => {
    setProjects(reordered)
    if (demoMode) return
    reordered.forEach((p, i) => {
      api.updateProject(p.id, { metadata: { ...p.metadata, order: i } })
    })
  }

  // Task operations
  const handleTaskCreate = async (taskData: Partial<Task> & { pendingBlockers?: { type: BlockerType; title: string; owner?: string }[] }) => {
    const tempId = Math.random().toString(36).substr(2, 9)
    const pendingBlockers = taskData.pendingBlockers
    const newTask: Task = {
      id: tempId,
      title: taskData.title || '',
      description: taskData.description || '',
      status: taskData.status || statuses[0]?.id || 'explore',
      tags: taskData.tags || [],
      dueDate: taskData.dueDate || '',
      assignees: taskData.assignees || [],
      order: tasks.length,
      project: taskData.project,
    }

    setTasks(prev => [...prev, newTask])
    if (demoMode) return

    if (savingTaskIds.current.has(tempId)) return
    savingTaskIds.current.add(tempId)

    const projectId = taskData.project
      ? projects.find(p => p.name === taskData.project)?.id
      : undefined

    const result = await api.createTask(newTask, projectId)
    savingTaskIds.current.delete(tempId)

    if (result) {
      tempIdMapping.current[tempId] = result.id
      // Create any pending blockers for the new task
      if (pendingBlockers?.length) {
        const created: Blocker[] = []
        for (const b of pendingBlockers) {
          const blocker = await api.createBlocker(result.id, b)
          if (blocker) created.push(blocker)
        }
        if (created.length > 0) {
          setTasks(prev => prev.map(t =>
            t.id === tempId ? { ...t, blockers: created } : t
          ))
        }
      }
    } else {
      toast.error('Failed to create task')
      setTasks(prev => prev.filter(t => t.id !== tempId))
    }
  }

  const resolveTaskId = (id: string): string => {
    return tempIdMapping.current[id] || id
  }

  const handleTaskUpdate = async (id: string, updates: Partial<Task>) => {
    // If status is changing, record a phase transition
    if (updates.status !== undefined) {
      const currentTask = tasks.find(t => t.id === id)
      if (currentTask && updates.status !== currentTask.status) {
        const transition: PhaseTransition = {
          id: `pt-${Date.now()}`,
          fromPhase: currentTask.status,
          toPhase: updates.status,
          timestamp: new Date().toISOString(),
        }
        const history = [...(currentTask.phaseHistory ?? []), transition]
        updates = { ...updates, phaseHistory: history }

        // If entering a feedback phase, auto-create a feedback note and open it
        const targetPhase = statuses.find(s => s.id === updates.status)
        if (targetPhase?.isFeedback) {
          const artifact: Artifact = {
            id: `dn-${Date.now()}`,
            title: `Feedback: ${currentTask.title}`,
            text: '',
            type: 'feedback',
            projectId: currentTask.project || undefined,
            taskId: id,
            timestamp: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          setArtifacts(prev => [artifact, ...prev])
          // Push artifact onto stack if a drawer is open
          if (drawerStack.length > 0) {
            pushDrawerArtifact(artifact)
          } else {
            closeAllDrawers()
            setSelectedArtifact(artifact)
            setDrawerDirection(1)
            setDrawerStack([{ type: 'artifact', artifactId: artifact.id }])
          }
        }
      }
    }

    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
    if (selectedTask?.id === id) {
      setSelectedTask(prev => prev ? { ...prev, ...updates } : prev)
    }
    if (demoMode) return

    const realId = resolveTaskId(id)
    const result = await api.updateTask(realId, updates)
    if (!result) toast.error('Failed to update task')
  }


  const handleTaskDelete = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    if (selectedTask?.id === id) {
      setSelectedTask(null)
      closeAllDrawers()
    }
    if (demoMode) { toast.success('Task deleted'); return }

    const realId = resolveTaskId(id)
    const result = await api.deleteTask(realId)
    if (!result) toast.error('Failed to delete task')
    else toast.success('Task deleted')
  }

  // Blocker operations
  const handleCreateBlocker = async (taskId: string, blocker: { type: BlockerType; title: string; owner?: string; linkedTaskId?: string }) => {
    const realId = resolveTaskId(taskId)
    if (demoMode) {
      const fakeBlocker: Blocker = { id: `b-${Date.now()}`, taskId, type: blocker.type, title: blocker.title, owner: blocker.owner, linkedTaskId: blocker.linkedTaskId, createdAt: new Date().toISOString() }
      const updateBlockers = (t: Task) => t.id === taskId ? { ...t, blockers: [...(t.blockers ?? []), fakeBlocker] } : t
      setTasks(prev => prev.map(updateBlockers))
      if (selectedTask?.id === taskId) setSelectedTask(prev => prev ? updateBlockers(prev) : prev)
      return
    }
    const created = await api.createBlocker(realId, blocker)
    if (created) {
      const updateBlockers = (t: Task) => t.id === taskId ? { ...t, blockers: [...(t.blockers ?? []), created] } : t
      setTasks(prev => prev.map(updateBlockers))
      if (selectedTask?.id === taskId) setSelectedTask(prev => prev ? updateBlockers(prev) : prev)
    } else {
      toast.error('Failed to create blocker')
    }
  }

  const handleResolveBlocker = async (taskId: string, blockerId: string, unresolve = false) => {
    const updateBlockers = (t: Task): Task => t.id === taskId ? {
      ...t,
      blockers: (t.blockers ?? []).map(b => b.id === blockerId ? { ...b, resolvedAt: unresolve ? undefined : new Date().toISOString() } : b),
    } : t
    setTasks(prev => prev.map(updateBlockers))
    if (selectedTask?.id === taskId) setSelectedTask(prev => prev ? updateBlockers(prev) : prev)
    if (demoMode) return
    const result = unresolve ? await api.unresolveBlocker(blockerId) : await api.resolveBlocker(blockerId)
    if (!result) toast.error('Failed to update blocker')
  }

  const handleDeleteBlocker = async (taskId: string, blockerId: string) => {
    const updateBlockers = (t: Task): Task => t.id === taskId ? {
      ...t,
      blockers: (t.blockers ?? []).filter(b => b.id !== blockerId),
    } : t
    setTasks(prev => prev.map(updateBlockers))
    if (selectedTask?.id === taskId) setSelectedTask(prev => prev ? updateBlockers(prev) : prev)
    if (demoMode) return
    const result = await api.deleteBlocker(blockerId)
    if (!result) toast.error('Failed to delete blocker')
  }

  const closeAllDrawers = () => {
    setNewTaskDrawerOpen(false)
    setDrawerStack([])
    setSelectedTask(null)
    setSelectedArtifact(null)
    setPreviewProject(null)
  }

  const handleTaskClick = (task: Task) => {
    closeAllDrawers()
    setSelectedTask(task)
    setDrawerDirection(1)
    setDrawerStack([{ type: 'task', taskId: task.id }])
  }

  // Artifact operations
  useEffect(() => {
    localStorage.setItem('hierarch-artifacts', JSON.stringify(artifacts))
  }, [artifacts])

  const handleArtifactCreate = (projectId: string) => {
    const artifact: Artifact = {
      id: `dn-${Date.now()}`,
      title: '',
      text: '',
      type: 'freeform',
      projectId: projectId || undefined,
      timestamp: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setArtifacts(prev => [artifact, ...prev])
    closeAllDrawers()
    setSelectedArtifact(artifact)
    setDrawerDirection(1)
    setDrawerStack([{ type: 'artifact', artifactId: artifact.id }])
  }

  const handleArtifactCreateForTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    const artifact: Artifact = {
      id: `dn-${Date.now()}`,
      title: '',
      text: '',
      type: 'freeform',
      projectId: task?.project || undefined,
      taskId,
      timestamp: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setArtifacts(prev => [artifact, ...prev])
    // Push artifact onto drawer stack if a drawer is open
    if (drawerStack.length > 0) {
      setSelectedArtifact(artifact)
      setDrawerDirection(1)
      setDrawerStack(prev => [...prev, { type: 'artifact', artifactId: artifact.id }])
    } else {
      closeAllDrawers()
      setSelectedArtifact(artifact)
      setDrawerDirection(1)
      setDrawerStack([{ type: 'artifact', artifactId: artifact.id }])
    }
  }

  const handleArtifactClick = (artifact: Artifact) => {
    closeAllDrawers()
    setSelectedArtifact(artifact)
    setDrawerDirection(1)
    setDrawerStack([{ type: 'artifact', artifactId: artifact.id }])
  }

  // Push a drawer onto the stack (navigating deeper from current drawer)
  const pushDrawerTask = (task: Task) => {
    setSelectedTask(task)
    setDrawerDirection(1)
    setDrawerStack(prev => [...prev, { type: 'task', taskId: task.id }])
  }

  const pushDrawerArtifact = (artifact: Artifact) => {
    setSelectedArtifact(artifact)
    setDrawerDirection(1)
    setDrawerStack(prev => [...prev, { type: 'artifact', artifactId: artifact.id }])
  }

  const handleDrawerBack = () => {
    if (drawerStack.length <= 1) return
    const newStack = drawerStack.slice(0, -1)
    const prev = newStack[newStack.length - 1]!

    setDrawerDirection(-1)

    // Restore previous frame's data
    if (prev.type === 'project') {
      const project = projects.find(p => p.id === prev.projectId)
      if (project) setPreviewProject(project)
    } else if (prev.type === 'task') {
      const task = tasks.find(t => t.id === prev.taskId)
      if (task) setSelectedTask(task)
    } else if (prev.type === 'artifact') {
      const artifact = artifacts.find(a => a.id === prev.artifactId)
      if (artifact) setSelectedArtifact(artifact)
    }

    setDrawerStack(newStack)
  }

  const handleArtifactUpdate = (id: string, updates: Partial<Artifact>) => {
    setArtifacts(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n))
    if (selectedArtifact?.id === id) {
      setSelectedArtifact(prev => prev ? { ...prev, ...updates } : prev)
    }
  }

  const handleArtifactDelete = (id: string) => {
    setArtifacts(prev => prev.filter(n => n.id !== id))
    if (selectedArtifact?.id === id) setSelectedArtifact(null)
  }

  // Time entry operations
  const handleSaveTimeEntry = async (entry: Partial<TimeEntry>) => {
    if (demoMode) {
      const newEntry: TimeEntry = {
        id: Math.random().toString(36).substr(2, 9),
        label: entry.label || 'Untitled',
        duration: entry.duration || 0,
        startTime: entry.startTime || new Date().toISOString(),
        endTime: entry.endTime || new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }
      setTimeEntries(prev => [newEntry, ...prev])
      toast.success('Time entry saved')
      return
    }

    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) return
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/time-entries`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(entry),
        }
      )
      if (res.ok) {
        const saved = await res.json()
        setTimeEntries(prev => [saved, ...prev])
        toast.success('Time entry saved')
      }
    } catch (e) {
      console.error('Failed to save time entry:', e)
      toast.error('Failed to save time entry')
    }
  }

  const handleDeleteTimeEntry = async (id: string) => {
    setTimeEntries(prev => prev.filter(e => e.id !== id))
    if (demoMode) { toast.success('Time entry deleted'); return }

    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) return
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server/time-entries?id=${id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      toast.success('Time entry deleted')
    } catch (e) {
      console.error('Failed to delete time entry:', e)
    }
  }

  const handleOpenNewTask = (defaultProjectId?: string) => {
    closeAllDrawers()
    setNewTaskDefaultProjectId(defaultProjectId)
    setNewTaskDrawerOpen(true)
  }

  // Auth handlers
  const handleLogin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUser(user)
      determineAuthState(user)
    }
  }

  const handleLogout = async () => {
    if (demoMode) {
      setDemoMode(false)
      localStorage.removeItem('hierarch-demo')
    } else {
      await supabase.auth.signOut()
    }
    setUser(null)
    setAuthState('unauthenticated')
    resetAppState()
  }

  const handleAvatarComplete = async () => {
    const { data: { user: updatedUser } } = await supabase.auth.getUser()
    if (updatedUser) {
      setUser(updatedUser)
      determineAuthState(updatedUser)
    }
  }

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false)
    if (demoMode) {
      setAuthState('authenticated')
      return
    }
    const { data: { user: updatedUser } } = await supabase.auth.getUser()
    if (updatedUser) {
      setUser(updatedUser)
      setAuthState('authenticated')
    }
  }

  const handleAccountDeleted = () => {
    setUser(null)
    setAuthState('unauthenticated')
    resetAppState()
    toast.success('Account deleted successfully')
  }

  // Computed values
  const todayTasks = tasks.filter(t => {
    if (!t.dueDate) return false
    const d = new Date(t.dueDate)
    const today = new Date()
    return d.toDateString() === today.toDateString()
  })

  const overdueTasks = tasks.filter(t => {
    if (!t.dueDate) return false
    const d = new Date(t.dueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const doneStatus = statuses.find(s => s.isDone)
    return d < today && t.status !== doneStatus?.id
  })

  const todayCount = todayTasks.length + overdueTasks.length
  const doneStatus = statuses.find(s => s.isDone)
  const allTasksCount = tasks.filter(t => t.status !== doneStatus?.id).length

  // View change handler
  const handleViewChange = (view: string) => {
    closeAllDrawers()
    setActiveView(view)
    if (isMobile) setSidebarOpen(false)
  }

  // Render active view
  const renderView = () => {
    if (activeView === 'today') {
      return (
        <Briefing
          tasks={tasks}
          projects={projects}
          statuses={statuses}
          userName={user?.user_metadata?.name || 'there'}
          onTaskClick={handleTaskClick}
          onTaskCreate={handleTaskCreate}
          onViewChange={handleViewChange}
          onNewTask={() => handleOpenNewTask()}
          artifacts={artifacts}
          onArtifactCreate={handleArtifactCreate}
          onArtifactClick={handleArtifactClick}
          onProjectUpdate={handleProjectUpdate}
          previewProject={previewProject}
          onPreviewProjectChange={(project) => {
            if (project) {
              closeAllDrawers()
              setPreviewProject(project)
              setDrawerDirection(1)
              setDrawerStack([{ type: 'project', projectId: project.id }])
            } else {
              closeAllDrawers()
            }
          }}
          onDrawerTaskClick={pushDrawerTask}
          onDrawerArtifactClick={pushDrawerArtifact}
          onProjectCreate={() => {
            const tempId = Math.random().toString(36).substr(2, 9)
            const newProject: Project = {
              id: tempId,
              name: 'Untitled Project',
              created_at: new Date().toISOString(),
            }
            setProjects(prev => [...prev, newProject])
            handleViewChange(`project:${tempId}`)
            if (!demoMode) {
              api.createProject('Untitled Project').then(result => {
                if (result) {
                  setProjects(prev => prev.map(p => p.id === tempId ? { ...p, id: result.id } : p))
                  handleViewChange(`project:${result.id}`)
                }
              })
            }
          }}
        />
      )
    }

    if (activeView === 'tasks') {
      return (
        <TaskBoard
          tasks={tasks}
          projects={projects}
          statuses={statuses}
          onTaskCreate={handleTaskCreate}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
          onTaskClick={handleTaskClick}
          onStatusesChange={setStatuses}
          onNewTask={() => handleOpenNewTask()}
          onStartFocus={(task: Task) => { setFocusTask(task); setActiveView('focus'); }}
          onCreateNote={(task: Task) => handleArtifactCreate(task.project || '')}
          focusTaskId={focusTask?.id}
          projectFilter={undefined}
        />
      )
    }

    if (activeView.startsWith('project:')) {
      const projectRef = activeView.replace('project:', '')
      const project = projects.find(p => p.id === projectRef || p.name === projectRef)
      if (!project) return <div className="p-8 text-muted-foreground">Project not found</div>

      const projectTasks = tasks.filter(t => t.project === project.id || t.project === project.name)

      return (
        <ProjectDetails
          project={project}
          tasks={projectTasks}
          projects={projects}
          statuses={statuses}
          onProjectUpdate={handleProjectUpdate}
          onTaskCreate={(t) => handleTaskCreate({ ...t, project: project.id })}
          onNewTask={() => handleOpenNewTask(project.id)}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
          onTaskClick={handleTaskClick}
          onStatusesChange={setStatuses}
          onCreateNote={(task: Task) => handleArtifactCreate(task.project || '')}
        />
      )
    }

    if (activeView === 'artifacts') {
      return (
        <ArtifactsView
          artifacts={artifacts}
          projects={projects}
          onArtifactCreate={handleArtifactCreate}
          onArtifactClick={handleArtifactClick}
          onArtifactDelete={handleArtifactDelete}
        />
      )
    }

    if (activeView === 'time-tracking') {
      return (
        <TimeTrackingView
          entries={timeEntries}
          onDeleteEntry={handleDeleteTimeEntry}
        />
      )
    }

    if (activeView === 'capacity') {
      return (
        <CapacityView
          projects={projects}
          tasks={tasks}
          onProjectClick={(name) => handleViewChange(`project:${name}`)}
        />
      )
    }

    if (activeView === 'focus') {
      return (
        <FocusTimerView
          task={focusTask}
          onSaveEntry={handleSaveTimeEntry}
          onTaskUpdate={handleTaskUpdate}
          onClose={() => { setFocusTask(null); setActiveView('tasks'); }}
        />
      )
    }

    if (activeView === 'figma') return <FigmaView />
    if (activeView === 'apps') return <AppsDashboard />
    if (activeView === 'integrations') return <IntegrationsPage onViewChange={setActiveView} />
    if (activeView === 'linear') return <LinearView />

    if (activeView === 'account') {
      return (
        <AccountSettings
          user={user}
          onAvatarChange={() => setActiveView('account')}
          onAccountDeleted={handleAccountDeleted}
        />
      )
    }

    if (activeView === 'settings') {
      return (
        <SettingsPage
          showProjectIcons={showProjectIcons}
          onShowProjectIconsChange={setShowProjectIcons}
        />
      )
    }

    return null
  }

  const getViewTitle = () => {
    if (activeView === 'today') return 'Overview'
    if (activeView === 'tasks') return 'All Tasks'
    if (activeView.startsWith('project:')) {
      const ref = activeView.replace('project:', '')
      const proj = projects.find(p => p.id === ref || p.name === ref)
      return proj?.name || ref
    }
    if (activeView === 'artifacts') return 'Artifacts'
    if (activeView === 'capacity') return 'Capacity'
    if (activeView === 'focus') return 'Focus Timer'
    if (activeView === 'time-tracking') return 'Time Tracking'
    if (activeView === 'figma') return 'Figma'
    if (activeView === 'apps') return 'Apps'
    if (activeView === 'integrations') return 'Integrations'
    if (activeView === 'linear') return 'Linear'
    if (activeView === 'account') return 'Account'
    if (activeView === 'settings') return 'Settings'
    return ''
  }

  // Loading state
  if (authState === 'loading') return <Splash />

  // Auth screens
  if (authState === 'unauthenticated') {
    return (
      <ThemeProvider defaultTheme="dark">
        <Toaster richColors position="top-right" />
        <AnimatePresence mode="wait">
          {authView === 'login' ? (
            <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Login onLogin={handleLogin} onSwitchToSignup={() => setAuthView('signup')} onDemoLogin={handleDemoLogin} />
            </motion.div>
          ) : (
            <motion.div key="signup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Signup onSignup={handleLogin} onSwitchToLogin={() => setAuthView('login')} />
            </motion.div>
          )}
        </AnimatePresence>
      </ThemeProvider>
    )
  }

  // Main app
  return (
    <ThemeProvider defaultTheme="dark">
      <TooltipProvider>
        <Toaster richColors position="top-right" />
        {(authState === 'onboarding' || showOnboarding) && (
          <Onboarding
            onComplete={handleOnboardingComplete}
            onCreateProject={handleProjectCreate}
            onNavigateToProject={(name) => handleViewChange(`project:${name}`)}
            demoMode={demoMode}
          />
        )}
        <div className="flex h-screen overflow-hidden bg-shell">
          {/* Desktop sidebar */}
          {!isMobile && (
            <Sidebar
              projects={projects}
              activeView={activeView}
              onViewChange={handleViewChange}
              todayCount={todayCount}
              allTasksCount={allTasksCount}
              user={user}
              onLogout={handleLogout}
              onShowOnboarding={() => setShowOnboarding(true)}
              onNewTask={() => handleOpenNewTask()}
              onNewArtifact={() => handleArtifactCreate('')}
              onProjectCreate={handleProjectCreate}
              onProjectUpdate={handleProjectUpdate}
              onProjectDelete={handleProjectDelete}
            />
          )}

          {/* Mobile sidebar overlay */}
          {isMobile && sidebarOpen && (
            <Sidebar
              projects={projects}
              activeView={activeView}
              onViewChange={handleViewChange}
              todayCount={todayCount}
              allTasksCount={allTasksCount}
              user={user}
              onLogout={handleLogout}
              onShowOnboarding={() => setShowOnboarding(true)}
              onNewTask={() => handleOpenNewTask()}
              onNewArtifact={() => handleArtifactCreate('')}
              onProjectCreate={handleProjectCreate}
              onProjectUpdate={handleProjectUpdate}
              onProjectDelete={handleProjectDelete}
              isMobile
              onClose={() => setSidebarOpen(false)}
            />
          )}

          {/* Main content */}
          <motion.main
            className="flex-1 flex flex-col overflow-hidden bg-background rounded-xl mt-2 mr-2 mb-2 ml-0 border border-shell-border"
            initial={{ x: 24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            {/* Mobile header */}
            {isMobile && (
              <header className="flex items-center gap-3 px-4 border-b border-border bg-card" style={{ minHeight: 56 }}>
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 rounded-lg hover:bg-accent transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </button>
                <h1 className="font-semibold text-foreground">{getViewTitle()}</h1>
              </header>
            )}

            {/* View content */}
            <div className="flex-1 overflow-y-scroll scrollbar-auto-hide">
              {dataLoading ? (
                <div className="h-full" />
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeView}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="h-full"
                  >
                    {renderView()}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </motion.main>

          {/* New task drawer */}
          <NewTaskDrawer
            open={newTaskDrawerOpen}
            onOpenChange={setNewTaskDrawerOpen}
            projects={projects}
            statuses={statuses}
            defaultProjectId={newTaskDefaultProjectId}
            onSave={handleTaskCreate}
          />

          {/* Unified drawer (desktop) */}
          <UnifiedDrawer
            stack={drawerStack}
            direction={drawerDirection}
            onClose={closeAllDrawers}
            onBack={handleDrawerBack}
            onPushTask={pushDrawerTask}
            onPushArtifact={pushDrawerArtifact}
            projects={projects}
            tasks={tasks}
            statuses={statuses}
            artifacts={artifacts}
            selectedTask={selectedTask}
            selectedArtifact={selectedArtifact}
            previewProject={previewProject}
            onTaskUpdate={handleTaskUpdate}
            onTaskDelete={handleTaskDelete}
            onArtifactUpdate={handleArtifactUpdate}
            onArtifactDelete={handleArtifactDelete}
            onArtifactCreate={handleArtifactCreate}
            onProjectUpdate={handleProjectUpdate}
            onViewChange={handleViewChange}
            onCreateBlocker={handleCreateBlocker}
            onResolveBlocker={handleResolveBlocker}
            onDeleteBlocker={handleDeleteBlocker}
            onArtifactCreateForTask={handleArtifactCreateForTask}
          />

          {/* Mobile fallback drawers */}
          {isMobile && selectedTask && drawerStack.length > 0 && drawerStack[drawerStack.length - 1]?.type === 'task' && (
            <TaskDetailsDrawer
              task={selectedTask}
              open={true}
              onOpenChange={(open) => { if (!open) closeAllDrawers(); }}
              projects={projects}
              statuses={statuses}
              artifacts={artifacts}
              onUpdate={handleTaskUpdate}
              onDelete={(id) => { handleTaskDelete(id); closeAllDrawers(); }}
              onArtifactClick={pushDrawerArtifact}
              onCreateBlocker={handleCreateBlocker}
              onResolveBlocker={handleResolveBlocker}
              onDeleteBlocker={handleDeleteBlocker}
              onArtifactCreate={handleArtifactCreateForTask}
            />
          )}
          {isMobile && selectedArtifact && drawerStack.length > 0 && drawerStack[drawerStack.length - 1]?.type === 'artifact' && (
            <NoteDrawer
              note={selectedArtifact}
              open={true}
              onOpenChange={(open) => { if (!open) closeAllDrawers(); }}
              projects={projects}
              tasks={tasks}
              onUpdate={handleArtifactUpdate}
              onDelete={(id) => { handleArtifactDelete(id); closeAllDrawers(); }}
            />
          )}
        </div>



        <UpdateNotification />
      </TooltipProvider>
    </ThemeProvider>
  )
}
