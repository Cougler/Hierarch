import { useState, useEffect, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Toaster, toast } from 'sonner'
import { supabase } from './supabase-client'
import type { Task, Project, Resource, StatusConfig, TimeEntry, WaitingForItem, PhaseTransition } from './types'
import { DEFAULT_STATUSES } from './types'
import * as api from './api/data'
import { DEMO_USER, DEMO_PROJECTS, DEMO_TASKS, DEMO_RESOURCES, DEMO_TIME_ENTRIES, DEMO_DESIGN_NOTES } from './demo-data'
import { ThemeProvider } from './components/ThemeProvider'
import { TooltipProvider } from './components/ui/tooltip'
import { useIsMobile } from './hooks/use-mobile'

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
import { AttachmentsView } from './components/AttachmentsView'
import { TimeTrackingView } from './components/TimeTrackingView'
import { FigmaView } from './components/FigmaView'
import { AppsDashboard } from './components/AppsDashboard'
import { AccountSettings } from './components/AccountSettings'
import { SettingsPage } from './components/SettingsPage'
import { UpdateNotification } from './components/UpdateNotification'
import { CapacityView } from './components/CapacityView'
import { FocusTimerView } from './components/FocusTimerView'
import { LinearView } from './components/LinearView'
import { FeedbackPrompt } from './components/FeedbackPrompt'
import { NoteDrawer } from './components/NoteDrawer'
import type { DesignNote } from './components/NoteDrawer'

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
  const [resources, setResources] = useState<Resource[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [statuses, setStatuses] = useState<StatusConfig[]>(() => {
    const saved = localStorage.getItem('hierarch-statuses')
    return saved ? JSON.parse(saved) : DEFAULT_STATUSES
  })
  const [showProjectIcons, setShowProjectIcons] = useState(() => {
    return localStorage.getItem('hierarch-show-project-icons') !== 'false'
  })

  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false)
  const [newTaskDrawerOpen, setNewTaskDrawerOpen] = useState(false)
  const [newTaskDefaultProjectId, setNewTaskDefaultProjectId] = useState<string | undefined>(undefined)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [demoMode, setDemoMode] = useState(false)
  const [feedbackPrompt, setFeedbackPrompt] = useState<{ taskId: string; fromPhase: string } | null>(null)
  const [focusTask, setFocusTask] = useState<Task | null>(null)

  // Design notes
  const [designNotes, setDesignNotes] = useState<DesignNote[]>(() => {
    const saved = localStorage.getItem('hierarch-design-notes')
    if (!saved) return []
    // Migrate old notes format
    const parsed = JSON.parse(saved)
    return parsed.map((n: any) => ({
      ...n,
      title: n.title || '',
      type: n.type || 'freeform',
      updatedAt: n.updatedAt || n.timestamp,
    }))
  })
  const [selectedNote, setSelectedNote] = useState<DesignNote | null>(null)
  const [noteDrawerOpen, setNoteDrawerOpen] = useState(false)

  const tempIdMapping = useRef<Record<string, string>>({})
  const savingTaskIds = useRef<Set<string>>(new Set())

  const handleDemoLogin = () => {
    setDemoMode(true)
    localStorage.setItem('hierarch-demo', 'true')
    setUser(DEMO_USER)
    setProjects([...DEMO_PROJECTS])
    setTasks([...DEMO_TASKS])
    setResources([...DEMO_RESOURCES])
    setTimeEntries([...DEMO_TIME_ENTRIES])
    setDesignNotes([...DEMO_DESIGN_NOTES])
    setDataLoading(false)
    setAuthState('onboarding')
  }

  const restoreDemoSession = () => {
    setDemoMode(true)
    setUser(DEMO_USER)
    setProjects([...DEMO_PROJECTS])
    setTasks([...DEMO_TASKS])
    setResources([...DEMO_RESOURCES])
    setTimeEntries([...DEMO_TIME_ENTRIES])
    setDesignNotes([...DEMO_DESIGN_NOTES])
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
    setResources([])
    setTimeEntries([])
    setActiveView('today')
    setSelectedTask(null)
    setTaskDrawerOpen(false)
  }

  // Load data when authenticated
  useEffect(() => {
    if (authState !== 'authenticated') return
    loadData()
  }, [authState])

  const loadData = async () => {
    if (demoMode) { setDataLoading(false); return }
    setDataLoading(true)
    const [projectsData, tasksData, resourcesData] = await Promise.all([
      api.getProjects(),
      api.getTasks(),
      api.getResources(),
    ])
    if (projectsData) setProjects(projectsData)
    if (tasksData) setTasks(tasksData)
    if (resourcesData) setResources(resourcesData)
    setDataLoading(false)
    loadTimeEntries()
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
  const handleTaskCreate = async (taskData: Partial<Task>) => {
    const tempId = Math.random().toString(36).substr(2, 9)
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
      waitingFor: taskData.waitingFor || [],
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

        // Check if entering a feedback phase
        const targetPhase = statuses.find(s => s.id === updates.status)
        if (targetPhase?.isFeedback) {
          setFeedbackPrompt({ taskId: id, fromPhase: currentTask.status })
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

  const handleFeedbackConfirm = (reviewer: string, deadline: string, notes: string) => {
    if (!feedbackPrompt) return
    const task = tasks.find(t => t.id === feedbackPrompt.taskId)
    if (task?.phaseHistory) {
      const history = [...task.phaseHistory]
      const lastEntry = history[history.length - 1]
      if (lastEntry) {
        lastEntry.reviewer = reviewer || undefined
        lastEntry.deadline = deadline || undefined
        lastEntry.notes = notes || undefined
      }
      handleTaskUpdate(feedbackPrompt.taskId, { phaseHistory: history })
    }
    setFeedbackPrompt(null)
  }

  const handleFeedbackSkip = () => {
    setFeedbackPrompt(null)
  }

  const handleTaskDelete = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    if (selectedTask?.id === id) {
      setSelectedTask(null)
      setTaskDrawerOpen(false)
    }
    if (demoMode) { toast.success('Task deleted'); return }

    const realId = resolveTaskId(id)
    const result = await api.deleteTask(realId)
    if (!result) toast.error('Failed to delete task')
    else toast.success('Task deleted')
  }

  const handleTaskClick = (task: Task) => {
    setNewTaskDrawerOpen(false)
    setSelectedTask(task)
    setTaskDrawerOpen(true)
  }

  // Resource operations
  const handleResourceCreate = async (resourceData: Partial<Resource>) => {
    const tempId = Math.random().toString(36).substr(2, 9)
    const newResource: Resource = {
      id: tempId,
      type: resourceData.type || 'Project Note',
      title: resourceData.title || '',
      content: resourceData.content,
      projectId: resourceData.projectId,
      taskId: resourceData.taskId,
      createdAt: new Date().toISOString(),
      pinned: resourceData.pinned || false,
      order: resources.length,
      metadata: resourceData.metadata,
    }

    setResources(prev => [...prev, newResource])
    if (demoMode) return

    const projectId = resourceData.projectId
      ? projects.find(p => p.name === resourceData.projectId)?.id || resourceData.projectId
      : undefined

    const result = await api.createResource(newResource, projectId)
    if (result) {
      setResources(prev => prev.map(r => r.id === tempId ? { ...r, id: result.id } : r))
    } else {
      toast.error('Failed to create resource')
      setResources(prev => prev.filter(r => r.id !== tempId))
    }
  }

  const handleResourceUpdate = async (id: string, updates: Partial<Resource>) => {
    setResources(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
    if (demoMode) return

    const result = await api.updateResource(id, updates)
    if (!result) toast.error('Failed to update resource')
  }

  const handleResourceDelete = async (id: string) => {
    setResources(prev => prev.filter(r => r.id !== id))
    if (demoMode) { toast.success('Resource deleted'); return }

    const result = await api.deleteResource(id)
    if (!result) toast.error('Failed to delete resource')
    else toast.success('Resource deleted')
  }

  // Design note operations
  useEffect(() => {
    localStorage.setItem('hierarch-design-notes', JSON.stringify(designNotes))
  }, [designNotes])

  const handleNoteCreate = (projectId: string) => {
    const note: DesignNote = {
      id: `dn-${Date.now()}`,
      title: '',
      text: '',
      type: 'freeform',
      projectId: projectId || undefined,
      timestamp: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setDesignNotes(prev => [note, ...prev])
    setSelectedNote(note)
    setNoteDrawerOpen(true)
    setTaskDrawerOpen(false)
    setNewTaskDrawerOpen(false)
  }

  const handleNoteClick = (note: DesignNote) => {
    setSelectedNote(note)
    setNoteDrawerOpen(true)
    setTaskDrawerOpen(false)
    setNewTaskDrawerOpen(false)
  }

  const handleNoteUpdate = (id: string, updates: Partial<DesignNote>) => {
    setDesignNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n))
    if (selectedNote?.id === id) {
      setSelectedNote(prev => prev ? { ...prev, ...updates } : prev)
    }
  }

  const handleNoteDelete = (id: string) => {
    setDesignNotes(prev => prev.filter(n => n.id !== id))
    if (selectedNote?.id === id) setSelectedNote(null)
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
    setTaskDrawerOpen(false)
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
          designNotes={designNotes}
          onNoteCreate={handleNoteCreate}
          onNoteClick={handleNoteClick}
          onProjectUpdate={handleProjectUpdate}
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
          onCreateNote={(task: Task) => handleNoteCreate(task.project || '')}
          focusTaskId={focusTask?.id}
          projectFilter={undefined}
        />
      )
    }

    if (activeView.startsWith('project:')) {
      const projectName = activeView.replace('project:', '')
      const project = projects.find(p => p.name === projectName)
      if (!project) return <div className="p-8 text-muted-foreground">Project not found</div>

      const projectTasks = tasks.filter(t => t.project === project.id || t.project === project.name)
      const projectResources = resources.filter(r => r.projectId === project.id || r.projectId === project.name)

      return (
        <ProjectDetails
          project={project}
          tasks={projectTasks}
          projects={projects}
          statuses={statuses}
          resources={projectResources}
          onProjectUpdate={handleProjectUpdate}
          onTaskCreate={(t) => handleTaskCreate({ ...t, project: project.id })}
          onNewTask={() => handleOpenNewTask(project.id)}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
          onTaskClick={handleTaskClick}
          onStatusesChange={setStatuses}
          onResourceCreate={(r) => handleResourceCreate({ ...r, projectId: project.id })}
          onResourceUpdate={handleResourceUpdate}
          onResourceDelete={handleResourceDelete}
          onCreateNote={(task: Task) => handleNoteCreate(task.project || '')}
        />
      )
    }

    if (activeView === 'attachments') {
      const globalResources = resources.filter(r => !r.projectId)
      return (
        <AttachmentsView
          resources={globalResources}
          projects={projects}
          onResourceCreate={handleResourceCreate}
          onResourceUpdate={handleResourceUpdate}
          onResourceDelete={handleResourceDelete}
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
    if (activeView.startsWith('project:')) return activeView.replace('project:', '')
    if (activeView === 'attachments') return 'Resources'
    if (activeView === 'capacity') return 'Capacity'
    if (activeView === 'focus') return 'Focus Timer'
    if (activeView === 'time-tracking') return 'Time Tracking'
    if (activeView === 'figma') return 'Figma'
    if (activeView === 'apps') return 'Apps'
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

  if (authState === 'onboarding' || showOnboarding) {
    return (
      <ThemeProvider defaultTheme="dark">
        <Toaster richColors position="top-right" />
        <Onboarding onComplete={handleOnboardingComplete} />
      </ThemeProvider>
    )
  }

  // Main app
  return (
    <ThemeProvider defaultTheme="dark">
      <TooltipProvider>
        <Toaster richColors position="top-right" />
        <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#262624' }}>
          {/* Desktop sidebar */}
          {!isMobile && (
            <Sidebar
              projects={projects}
              activeView={activeView}
              onViewChange={handleViewChange}
              onProjectsReorder={handleProjectsReorder}
              onProjectCreate={handleProjectCreate}
              onProjectUpdate={handleProjectUpdate}
              onProjectDelete={handleProjectDelete}
              todayCount={todayCount}
              allTasksCount={allTasksCount}
              user={user}
              onLogout={handleLogout}
              onShowOnboarding={() => setShowOnboarding(true)}
              onNewTask={() => handleOpenNewTask()}
            />
          )}

          {/* Mobile sidebar overlay */}
          {isMobile && sidebarOpen && (
            <Sidebar
              projects={projects}
              activeView={activeView}
              onViewChange={handleViewChange}
              onProjectsReorder={handleProjectsReorder}
              onProjectCreate={handleProjectCreate}
              onProjectUpdate={handleProjectUpdate}
              onProjectDelete={handleProjectDelete}
              todayCount={todayCount}
              allTasksCount={allTasksCount}
              user={user}
              onLogout={handleLogout}
              onShowOnboarding={() => setShowOnboarding(true)}
              onNewTask={() => handleOpenNewTask()}
              isMobile
              onClose={() => setSidebarOpen(false)}
            />
          )}

          {/* Main content */}
          <motion.main
            className="flex-1 flex flex-col overflow-hidden bg-background rounded-xl mt-2 mr-2 mb-2 ml-0 border border-white/[0.06]"
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

          {/* Task details drawer */}
          <TaskDetailsDrawer
            task={selectedTask}
            open={taskDrawerOpen}
            onOpenChange={setTaskDrawerOpen}
            projects={projects}
            statuses={statuses}
            resources={resources.filter(r => r.taskId === selectedTask?.id)}
            onUpdate={handleTaskUpdate}
            onDelete={handleTaskDelete}
            onResourceCreate={handleResourceCreate}
          />

          {/* Note drawer */}
          <NoteDrawer
            note={selectedNote}
            open={noteDrawerOpen}
            onOpenChange={setNoteDrawerOpen}
            projects={projects}
            onUpdate={handleNoteUpdate}
            onDelete={handleNoteDelete}
          />
        </div>

        <FeedbackPrompt
          open={feedbackPrompt !== null}
          onConfirm={handleFeedbackConfirm}
          onSkip={handleFeedbackSkip}
        />

        <UpdateNotification />
      </TooltipProvider>
    </ThemeProvider>
  )
}
