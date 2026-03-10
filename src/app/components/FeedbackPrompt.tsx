import { useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from './ui/dialog'

interface FeedbackPromptProps {
  open: boolean
  onConfirm: (reviewer: string, deadline: string, notes: string) => void
  onSkip: () => void
}

export function FeedbackPrompt({ open, onConfirm, onSkip }: FeedbackPromptProps) {
  const [reviewer, setReviewer] = useState('')
  const [deadline, setDeadline] = useState('')
  const [notes, setNotes] = useState('')

  const handleConfirm = () => {
    onConfirm(reviewer.trim(), deadline, notes.trim())
    setReviewer('')
    setDeadline('')
    setNotes('')
  }

  const handleSkip = () => {
    onSkip()
    setReviewer('')
    setDeadline('')
    setNotes('')
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && handleSkip()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-orange-400" />
            </div>
            <div>
              <DialogTitle className="text-base">Requesting Feedback</DialogTitle>
              <DialogDescription className="text-xs">
                Who's giving feedback on this work?
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Person or team</label>
            <Input
              placeholder="Name or team…"
              value={reviewer}
              onChange={e => setReviewer(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Notes</label>
            <textarea
              placeholder="What feedback are you looking for?"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              rows={3}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  handleConfirm()
                }
              }}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Feedback deadline</label>
            <Input
              type="date"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={handleSkip}>Skip</Button>
            <Button size="sm" onClick={handleConfirm}>Confirm</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
