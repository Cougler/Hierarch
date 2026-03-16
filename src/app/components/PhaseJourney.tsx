import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import type { PhaseTransition, StatusConfig } from '../types'
import type { Artifact } from './NoteDrawer'

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

interface PhaseJourneyProps {
  phaseHistory?: PhaseTransition[]
  statuses: StatusConfig[]
  currentPhase: string
  maxItems?: number
  taskId?: string
  artifacts?: Artifact[]
  onArtifactClick?: (note: Artifact) => void
}

export function PhaseJourney({ phaseHistory, statuses, currentPhase, maxItems = 4, taskId, artifacts, onArtifactClick }: PhaseJourneyProps) {
  const statusMap = new Map(statuses.map(s => [s.id, s]))
  const [expanded, setExpanded] = useState(false)

  if (!phaseHistory || phaseHistory.length === 0) {
    const current = statusMap.get(currentPhase)
    return (
      <div className="text-xs text-muted-foreground/50 italic py-1">
        Started in {current?.title ?? currentPhase}
      </div>
    )
  }

  // Show most recent first
  const reversed = [...phaseHistory].reverse()
  const hasMore = reversed.length > maxItems
  const visible = expanded ? reversed : reversed.slice(0, maxItems)

  return (
    <div className="space-y-0">
      {visible.map((transition, i) => {
        const toPhase = statusMap.get(transition.toPhase)
        const isFeedback = toPhase?.isFeedback
        const isDone = toPhase?.isDone
        const color = toPhase ? (BG_TO_HEX[toPhase.color] ?? '#64748b') : '#64748b'
        const isFirst = i === 0

        // Build natural language description
        let label: string
        if (isDone) {
          label = `Handed off`
        } else if (isFeedback) {
          label = `Moved to feedback`
        } else {
          label = `Moved to ${toPhase?.title ?? transition.toPhase}`
        }

        // Find linked feedback note for this task
        const linkedNote = isFeedback && taskId && artifacts
          ? artifacts.find(n => n.taskId === taskId && n.type === 'feedback')
          : undefined

        return (
          <div key={transition.id} className="flex gap-2.5 py-1.5">
            {/* Dot + line */}
            <div className="flex flex-col items-center pt-1">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: color,
                  opacity: isFirst ? 1 : 0.5,
                }}
              />
              {i < visible.length - 1 && (
                <div className="w-px flex-1 bg-border/40 mt-1" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pb-1">
              <p className="text-xs text-foreground/80">
                {label}
                {linkedNote && onArtifactClick && (
                  <> with <span
                    role="link"
                    onClick={(e) => { e.stopPropagation(); onArtifactClick(linkedNote) }}
                    className="text-primary hover:underline cursor-pointer"
                  >note</span></>
                )}
              </p>
              <span className="text-[10px] text-muted-foreground/40">
                {formatDistanceToNow(new Date(transition.timestamp), { addSuffix: true })}
              </span>
            </div>
          </div>
        )
      })}

      {hasMore && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-1 py-1 text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        >
          View {reversed.length - maxItems} more
        </button>
      )}

      {hasMore && expanded && (
        <button
          onClick={() => setExpanded(false)}
          className="flex items-center gap-1 py-1 text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        >
          Show less
        </button>
      )}
    </div>
  )
}
