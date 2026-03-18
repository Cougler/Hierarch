import { useState, useEffect } from 'react'
import { useFigmaToken } from './use-figma-token'
import { supabase } from '../supabase-client'
import { getLastSeenTimestamp } from '../api/figma'

const POLL_INTERVAL = 30_000
const FIGMA_COMMENTS_UPDATED = 'hierarch-figma-comments-updated'

export function useFigmaUnread(): number {
  const { isConnected } = useFigmaToken()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!isConnected) {
      setUnreadCount(0)
      return
    }

    let cancelled = false

    async function check() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) return

        const { data: integration } = await supabase
          .from('integrations')
          .select('provider_user_id')
          .eq('owner_id', session.user.id)
          .eq('provider', 'figma')
          .maybeSingle()

        if (!integration?.provider_user_id) return

        const lastSeen = getLastSeenTimestamp()
        const lastSeenDate = lastSeen ? new Date(lastSeen).toISOString() : new Date(0).toISOString()

        const { count, error } = await supabase
          .from('figma_comments')
          .select('id', { count: 'exact', head: true })
          .or(`mentions.cs.{${integration.provider_user_id}},figma_user_id.eq.${integration.provider_user_id}`)
          .is('resolved_at', null)
          .gt('created_at', lastSeenDate)

        if (!error && !cancelled) {
          setUnreadCount(count ?? 0)
        }
      } catch {
        // ignore
      }
    }

    check()
    const interval = setInterval(check, POLL_INTERVAL)

    const handler = () => check()
    window.addEventListener(FIGMA_COMMENTS_UPDATED, handler)

    return () => {
      cancelled = true
      clearInterval(interval)
      window.removeEventListener(FIGMA_COMMENTS_UPDATED, handler)
    }
  }, [isConnected])

  return unreadCount
}
