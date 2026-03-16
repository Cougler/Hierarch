import { useState, useRef, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from 'sonner'
import {
  Plus, MoreHorizontal, Pencil, Copy, Trash2, FolderKanban,
  Loader2, Pin, PinOff, X,
} from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from './ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from './ui/alert-dialog'
import { cn } from '../lib/utils'
import { getIconComponent, PRESET_COLORS } from './IconPicker'
import {
  Folder, Star, Heart, Zap, Target, Rocket, Code, Book,
  Music, Camera, Globe, Shield, Award, Flag, Bookmark,
  Coffee, Compass, Feather, Gift, Key, Layers, Map,
  Palette, Sun, Moon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  Folder, Star, Heart, Zap, Target, Rocket, Code, Book,
  Music, Camera, Globe, Shield, Award, Flag, Bookmark,
  Coffee, Compass, Feather, Gift, Key, Layers, Map,
  Palette, Sun, Moon,
}
const ICON_NAMES = Object.keys(ICON_MAP)

function resolveHex(color?: string): string {
  if (!color) return '#3b82f6'
  if (color.startsWith('#')) return color
  const legacyMap: Record<string, string> = {
    'bg-slate-500': '#64748b', 'bg-red-500': '#ef4444',
    'bg-orange-500': '#f97316', 'bg-amber-500': '#f59e0b',
    'bg-emerald-500': '#10b981', 'bg-blue-500': '#3b82f6',
    'bg-violet-500': '#8b5cf6', 'bg-pink-500': '#ec4899',
  }
  return legacyMap[color] || '#3b82f6'
}
import type { Project, Task, ProjectMetadata } from '../types'

const PINNED_KEY = 'hierarch-pinned-projects'

export function getPinnedProjectIds(): string[] {
  try {
    const raw = localStorage.getItem(PINNED_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function setPinnedProjectIds(ids: string[]) {
  localStorage.setItem(PINNED_KEY, JSON.stringify(ids))
}

interface ProjectsPageProps {
  projects: Project[]
  tasks: Task[]
  onViewChange: (view: string) => void
  onProjectCreate: (name: string, metadata?: ProjectMetadata) => void
  onProjectUpdate: (id: string, updates: Partial<Project>) => void
  onProjectDelete: (id: string) => void
  onPinnedChange: () => void
}

export function ProjectsPage({
  projects,
  tasks,
  onViewChange,
  onProjectCreate,
  onProjectUpdate,
  onProjectDelete,
  onPinnedChange,
}: ProjectsPageProps) {
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [pinnedIds, setPinned] = useState<string[]>(() => getPinnedProjectIds())
  const [renameTarget, setRenameTarget] = useState<Project | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (renameTarget && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renameTarget])

  const realProjects = projects.filter(p => p.metadata?.type !== 'section')

  const getTaskCount = (project: Project) => {
    return tasks.filter(t => t.project === project.id || t.project === project.name).length
  }

  const handleRenameSubmit = () => {
    if (!renameTarget || !renameValue.trim()) return
    onProjectUpdate(renameTarget.id, { name: renameValue.trim() })
    setRenameTarget(null)
    toast.success('Project renamed')
  }

  const togglePin = (projectId: string) => {
    const next = pinnedIds.includes(projectId)
      ? pinnedIds.filter(id => id !== projectId)
      : [...pinnedIds, projectId]
    setPinned(next)
    setPinnedProjectIds(next)
    onPinnedChange()
  }

  const handleConfirmDelete = () => {
    if (!deleteTarget) return
    onProjectDelete(deleteTarget.id)
    setDeleteTarget(null)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
            <FolderKanban className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="font-semibold text-sm">Projects</span>
        </div>

        <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5" />
          New Project
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-background">
            <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
              <th className="text-left font-medium px-6 py-3">Name</th>
              <th className="text-left font-medium px-3 py-3 w-[100px]">Tasks</th>
              <th className="text-left font-medium px-3 py-3 w-[140px]">Created</th>
              <th className="text-right font-medium px-6 py-3 w-[60px]"></th>
            </tr>
          </thead>
          <tbody>
            {realProjects.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-muted-foreground py-16">
                  No projects yet
                </td>
              </tr>
            ) : (
              realProjects.map(project => {
                const Icon = getIconComponent(project.metadata?.icon)
                const taskCount = getTaskCount(project)
                const isRenaming = renameTarget?.id === project.id

                if (isRenaming) {
                  return (
                    <tr key={project.id} className="border-b border-border/40">
                      <td colSpan={4} className="px-6 py-2">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <Input
                            ref={renameInputRef}
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleRenameSubmit()
                              if (e.key === 'Escape') setRenameTarget(null)
                            }}
                            onBlur={handleRenameSubmit}
                            className="h-8 text-sm max-w-xs"
                          />
                        </div>
                      </td>
                    </tr>
                  )
                }

                return (
                  <motion.tr
                    key={project.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => onViewChange(`project:${project.id}`)}
                    className="group/row border-b border-border/40 hover:bg-accent/20 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-foreground">{project.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs text-muted-foreground tabular-nums">{taskCount}</span>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground/60 whitespace-nowrap">
                      {project.created_at
                        ? formatDistanceToNow(new Date(project.created_at), { addSuffix: true })
                        : '—'}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            'h-7 w-7',
                            pinnedIds.includes(project.id)
                              ? 'text-primary'
                              : 'text-muted-foreground/40 opacity-0 group-hover/row:opacity-100'
                          )}
                          onClick={e => { e.stopPropagation(); togglePin(project.id) }}
                        >
                          {pinnedIds.includes(project.id)
                            ? <PinOff className="h-3.5 w-3.5" />
                            : <Pin className="h-3.5 w-3.5" />}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => { setRenameTarget(project); setRenameValue(project.name) }}>
                              <Pencil className="mr-2 h-3.5 w-3.5" /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onProjectCreate(`${project.name} (copy)`, project.metadata)}>
                              <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeleteTarget(project)} className="text-destructive">
                              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </motion.tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create drawer */}
      <NewProjectDrawer
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreate={(name, metadata) => {
          onProjectCreate(name, metadata)
          setShowCreate(false)
        }}
        projectCount={realProjects.length}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{deleteTarget?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this project and all its tasks. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function NewProjectDrawer({
  open,
  onOpenChange,
  onCreate,
  projectCount,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (name: string, metadata?: ProjectMetadata) => void
  projectCount: number
}) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('Folder')
  const [color, setColor] = useState('#3b82f6')
  const [description, setDescription] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName('')
      setIcon('Folder')
      setColor('#3b82f6')
      setDescription('')
      setTimeout(() => nameRef.current?.focus(), 50)
    }
  }, [open])

  const handleCreate = () => {
    if (!name.trim()) return
    onCreate(name.trim(), { icon, color, order: projectCount, description: description.trim() || undefined })
    toast.success('Project created')
  }

  const SelectedIcon = ICON_MAP[icon] || Folder

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Close button */}
          <motion.button
            key="new-project-close"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => onOpenChange(false)}
            className="fixed top-8 right-[448px] z-50 flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-muted-foreground shadow-lg border border-white/[0.08] hover:bg-white/[0.12] hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </motion.button>

          {/* Panel */}
          <motion.div
            key="new-project-drawer"
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.7 }}
            style={{ backgroundColor: '#1c1c1a', transformOrigin: 'top right' }}
            className="fixed top-8 right-8 bottom-8 z-50 w-[408px] rounded-2xl shadow-2xl border border-white/[0.08] flex flex-col overflow-hidden"
          >
            <div className="flex-1 flex flex-col gap-4 p-5 overflow-auto">
              <h3 className="text-sm font-semibold text-foreground">New project</h3>

              {/* Name */}
              <Input
                ref={nameRef}
                placeholder="Project name"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                className="bg-white/[0.04] border-white/[0.08] text-sm placeholder:text-muted-foreground/50 focus-visible:ring-white/20"
              />

              {/* Description */}
              <Textarea
                placeholder="Description (optional)"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="min-h-[100px] resize-none bg-white/[0.04] border-white/[0.08] text-sm placeholder:text-muted-foreground/50 focus-visible:ring-white/20"
              />

              {/* Icon */}
              <div className="space-y-2">
                <label className="text-[11px] text-muted-foreground/70">Icon</label>
                <div className="grid grid-cols-8 gap-1">
                  {ICON_NAMES.map(name => {
                    const Icon = ICON_MAP[name]
                    if (!Icon) return null
                    return (
                      <button
                        key={name}
                        onClick={() => setIcon(name)}
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
                          icon === name
                            ? 'bg-white/[0.1] text-foreground'
                            : 'text-muted-foreground/60 hover:bg-white/[0.06] hover:text-foreground',
                        )}
                      >
                        <Icon className="h-4 w-4" style={icon === name ? { color } : undefined} />
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Color */}
              <div className="space-y-2">
                <label className="text-[11px] text-muted-foreground/70">Color</label>
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map(({ name: colorName, hex }) => (
                    <button
                      key={colorName}
                      onClick={() => setColor(hex)}
                      title={colorName}
                      className="h-6 w-6 rounded-full transition-transform hover:scale-110 focus:outline-none"
                      style={{
                        backgroundColor: hex,
                        boxShadow: color === hex
                          ? `0 0 0 2px #1c1c1a, 0 0 0 3.5px ${hex}`
                          : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Create button */}
              <Button
                onClick={handleCreate}
                disabled={!name.trim()}
                className="w-full bg-[#bf7535] hover:bg-[#bf7535]/90 text-white disabled:opacity-40"
              >
                Create Project
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
