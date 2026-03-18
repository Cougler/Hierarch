import { useState, useEffect, useCallback, useRef } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import {
  Figma, Loader2, RefreshCw, MessageCircle,
  Send, Check, Plus, ChevronRight, ExternalLink, ArrowLeft,
} from 'lucide-react'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'
import { cn } from '../lib/utils'
import { useFigmaToken } from '../hooks/use-figma-token'
import { supabase } from '../supabase-client'
import * as figmaApi from '../api/figma'

const EDGE_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server`

interface FigmaCommentRow {
  id: string
  file_key: string
  file_name: string
  parent_id: string | null
  message: string
  figma_user_id: string
  figma_user_handle: string
  figma_user_avatar: string | null
  mentions: string[]
  resolved_at: string | null
  created_at: string
}

interface Thread {
  root: FigmaCommentRow
  replies: FigmaCommentRow[]
}

function buildThreads(comments: FigmaCommentRow[]): Thread[] {
  const roots: FigmaCommentRow[] = []
  const repliesByParent: Record<string, FigmaCommentRow[]> = {}

  for (const c of comments) {
    if (c.parent_id) {
      if (!repliesByParent[c.parent_id]) repliesByParent[c.parent_id] = []
      repliesByParent[c.parent_id].push(c)
    } else {
      roots.push(c)
    }
  }

  roots.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return roots.map(root => ({
    root,
    replies: (repliesByParent[root.id] ?? []).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    ),
  }))
}

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return null
  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  }
}

// ── Thread Row ───────────────────────────────────────────────────────

function ThreadRow({ thread, onClick }: { thread: Thread; onClick: () => void }) {
  const { root, replies } = thread
  const replyCount = replies.length

  return (
    <button
      onClick={onClick}
      className="flex w-full gap-3 px-6 py-4 border-b border-border/40 hover:bg-accent/20 transition-colors text-left"
    >
      {root.figma_user_avatar ? (
        <img src={root.figma_user_avatar} alt="" className="w-7 h-7 rounded-full shrink-0 mt-0.5" />
      ) : (
        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-semibold text-primary shrink-0 mt-0.5">
          {root.figma_user_handle[0]}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{root.figma_user_handle}</span>
          <span className="text-[11px] text-muted-foreground/50">
            {formatDistanceToNow(new Date(root.created_at), { addSuffix: true })}
          </span>
          {root.resolved_at && (
            <span className="flex items-center gap-0.5 text-[10px] text-emerald-500">
              <Check className="h-2.5 w-2.5" /> Resolved
            </span>
          )}
        </div>
        <p className="text-sm text-foreground/80 mt-0.5 line-clamp-2">{root.message}</p>
        <div className="flex items-center gap-3 mt-2">
          <a
            href={`https://www.figma.com/file/${root.file_key}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1 text-[11px] text-muted-foreground/50 hover:text-primary transition-colors"
          >
            <Figma className="h-2.5 w-2.5" />
            {root.file_name}
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
          {replyCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-primary/70">
              <MessageCircle className="h-2.5 w-2.5" />
              {replyCount} repl{replyCount === 1 ? 'y' : 'ies'}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0 mt-2" />
    </button>
  )
}

// ── Thread Chat ──────────────────────────────────────────────────────

function ThreadChat({
  thread,
  token,
  onBack,
  onReplyPosted,
}: {
  thread: Thread
  token: string
  onBack: () => void
  onReplyPosted: (reply: FigmaCommentRow) => void
}) {
  const { root, replies } = thread
  const [replyText, setReplyText] = useState('')
  const [posting, setPosting] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [replies.length])

  const handleReply = async () => {
    const msg = replyText.trim()
    if (!msg) return
    setPosting(true)
    try {
      const reply = await figmaApi.postComment(token, root.file_key, msg, root.id)
      const row: FigmaCommentRow = {
        id: reply.id,
        file_key: root.file_key,
        file_name: root.file_name,
        parent_id: root.id,
        message: msg,
        figma_user_id: reply.user?.id ?? '',
        figma_user_handle: reply.user?.handle ?? 'You',
        figma_user_avatar: reply.user?.img_url ?? null,
        mentions: [],
        resolved_at: null,
        created_at: reply.created_at ?? new Date().toISOString(),
      }
      onReplyPosted(row)
      setReplyText('')
      toast.success('Reply posted')
    } catch {
      toast.error('Failed to post reply')
    } finally {
      setPosting(false)
    }
  }

  const allMessages = [root, ...replies]

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold truncate block">{root.figma_user_handle}'s comment</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground/50">
              <Figma className="h-2.5 w-2.5" />
              {root.file_name}
            </span>
            {root.resolved_at && (
              <span className="flex items-center gap-0.5 text-[10px] text-emerald-500">
                <Check className="h-2.5 w-2.5" /> Resolved
              </span>
            )}
          </div>
        </div>
        <a
          href={`https://www.figma.com/file/${root.file_key}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-primary hover:underline shrink-0"
        >
          View in file
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto">
        <div className="py-4">
          {allMessages.map((msg, i) => (
            <div
              key={msg.id}
              className={cn(
                'flex gap-3 px-6 py-3',
                i === 0 && 'pb-4 border-b border-border/30 mb-2',
              )}
            >
              {msg.figma_user_avatar ? (
                <img src={msg.figma_user_avatar} alt="" className="w-7 h-7 rounded-full shrink-0 mt-0.5" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-semibold text-primary shrink-0 mt-0.5">
                  {msg.figma_user_handle[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{msg.figma_user_handle}</span>
                  <span className="text-[11px] text-muted-foreground/50">
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-foreground/80 mt-1 whitespace-pre-wrap">{msg.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 py-3 border-t border-border shrink-0">
        <div className="flex gap-2">
          <input
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleReply() }}
            placeholder="Reply..."
            className="flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <Button
            onClick={handleReply}
            disabled={posting || !replyText.trim()}
            size="icon"
            className="h-9 w-9 shrink-0"
          >
            {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Team Setup ───────────────────────────────────────────────────────

function TeamSetup({ onComplete }: { onComplete: () => void }) {
  const [urlInput, setUrlInput] = useState('')
  const [registering, setRegistering] = useState(false)

  const handleSubmit = async () => {
    const input = urlInput.trim()
    const match = input.match(/team\/(\d+)/)
    const teamId = match ? match[1] : input.replace(/\D/g, '')
    if (!teamId) {
      toast.error('Could not find a team ID')
      return
    }

    setRegistering(true)
    try {
      const headers = await getAuthHeaders()
      if (!headers) throw new Error('Not authenticated')

      const res = await fetch(`${EDGE_BASE}/figma/webhook/register`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ team_id: teamId }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success('Figma comments connected')
      onComplete()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to register webhook')
    } finally {
      setRegistering(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-8 px-6">
      <div className="w-12 h-12 rounded-2xl bg-[#1e1e1e] dark:bg-white/10 flex items-center justify-center">
        <Figma className="h-6 w-6 text-white" />
      </div>
      <div className="text-center max-w-sm">
        <h2 className="text-lg font-semibold">One more step</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Paste your Figma team link so Hierarch can receive comment notifications. In Figma, click the dropdown next to your team name and select <strong>Copy link</strong>.
        </p>
      </div>
      <div className="w-full max-w-sm flex gap-2 pb-8">
        <input
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="https://www.figma.com/files/team/123.../..."
          className="flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <Button onClick={handleSubmit} disabled={registering || !urlInput.trim()}>
          {registering ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Go'}
        </Button>
      </div>
      <img src="/figma-team-help.webp" alt="How to copy your Figma team link" className="rounded-lg w-2/3 max-w-[750px]" />
    </div>
  )
}

// ── Main View ────────────────────────────────────────────────────────

export function FigmaView() {
  const { token, isConnected, isLoading: tokenLoading, viewer, disconnect } = useFigmaToken()
  const [comments, setComments] = useState<FigmaCommentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showResolved, setShowResolved] = useState(false)
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null)
  const [webhookRegistered, setWebhookRegistered] = useState<boolean | null>(null)
  const [figmaUserId, setFigmaUserId] = useState<string | null>(null)

  // Check webhook status and get user's Figma ID
  useEffect(() => {
    if (!isConnected || !token) return

    async function check() {
      const headers = await getAuthHeaders()
      if (!headers) return

      // Check webhook
      const res = await fetch(`${EDGE_BASE}/figma/webhook/status`, { headers })
      const data = await res.json()
      setWebhookRegistered(data.registered)

      // Get Figma user ID from integrations
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data: integration } = await supabase
          .from('integrations')
          .select('provider_user_id')
          .eq('owner_id', session.user.id)
          .eq('provider', 'figma')
          .maybeSingle()
        if (integration?.provider_user_id) {
          setFigmaUserId(integration.provider_user_id)
        }
      }
    }
    check()
  }, [isConnected, token])

  // Load comments from Supabase
  const loadComments = useCallback(async () => {
    if (!figmaUserId) return

    try {
      const { data, error } = await supabase
        .from('figma_comments')
        .select('*')
        .or(`mentions.cs.{${figmaUserId}},figma_user_id.eq.${figmaUserId}`)
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) throw error
      setComments(data ?? [])
    } catch {
      toast.error('Failed to load comments')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [figmaUserId])

  useEffect(() => {
    if (figmaUserId && webhookRegistered) loadComments()
    else if (webhookRegistered === false) setLoading(false)
  }, [figmaUserId, webhookRegistered, loadComments])

  const handleRefresh = () => { setRefreshing(true); loadComments() }

  const handleReplyPosted = (reply: FigmaCommentRow) => {
    setComments(prev => [reply, ...prev])
    if (selectedThread) {
      setSelectedThread({
        ...selectedThread,
        replies: [...selectedThread.replies, reply],
      })
    }
  }

  if (tokenLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    )
  }

  if (!isConnected || !token) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4 text-center px-4">
        <Figma className="h-8 w-8 opacity-40" />
        <p className="text-sm text-muted-foreground">Figma is not connected. Connect it from the Integrations page.</p>
      </div>
    )
  }

  if (webhookRegistered === null) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    )
  }

  if (!webhookRegistered) {
    return <TeamSetup onComplete={() => { setWebhookRegistered(true); setLoading(true); loadComments() }} />
  }

  if (selectedThread) {
    return (
      <ThreadChat
        thread={selectedThread}
        token={token}
        onBack={() => setSelectedThread(null)}
        onReplyPosted={handleReplyPosted}
      />
    )
  }

  const threads = buildThreads(comments)
  const openThreads = threads.filter(t => !t.root.resolved_at)
  const resolvedThreads = threads.filter(t => t.root.resolved_at)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-[#1e1e1e] dark:bg-white/10 flex items-center justify-center">
            <Figma className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-semibold text-sm">Figma Comments</span>
          {openThreads.length > 0 && (
            <span className="text-xs text-muted-foreground">{openThreads.length} open</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {viewer && (
            <div className="flex items-center gap-2 mr-2">
              {viewer.avatarUrl ? (
                <img src={viewer.avatarUrl} alt="" className="w-5 h-5 rounded-full" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-semibold text-primary">
                  {viewer.name[0]}
                </div>
              )}
              <span className="text-xs text-muted-foreground">{viewer.name}</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground hover:text-destructive"
            onClick={async () => {
              await disconnect()
              toast.success('Disconnected from Figma')
            }}
          >
            Disconnect
          </Button>
        </div>
      </div>

      {/* Thread list */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading comments...</span>
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4 gap-3">
            <MessageCircle className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No comments yet.</p>
            <p className="text-xs text-muted-foreground/60">Comments that mention you or that you post will appear here automatically.</p>
          </div>
        ) : (
          <div>
            {openThreads.map((thread, i) => (
              <motion.div
                key={thread.root.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
              >
                <ThreadRow
                  thread={thread}
                  onClick={() => {
                    setSelectedThread(thread)
                    figmaApi.markCommentsSeen()
                    window.dispatchEvent(new Event('hierarch-figma-comments-updated'))
                  }}
                />
              </motion.div>
            ))}

            {resolvedThreads.length > 0 && (
              <div className="px-6 py-3">
                <button
                  onClick={() => setShowResolved(!showResolved)}
                  className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors flex items-center gap-1"
                >
                  <ChevronRight className={cn('h-3 w-3 transition-transform', showResolved && 'rotate-90')} />
                  {resolvedThreads.length} resolved thread{resolvedThreads.length !== 1 ? 's' : ''}
                </button>
                {showResolved && (
                  <div className="mt-2 -mx-6">
                    {resolvedThreads.map(thread => (
                      <div key={thread.root.id} className="opacity-50">
                        <ThreadRow thread={thread} onClick={() => setSelectedThread(thread)} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
