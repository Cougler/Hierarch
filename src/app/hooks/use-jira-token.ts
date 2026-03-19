import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase-client'
import { setOnUnauthorized } from '../api/jira'

const EDGE_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server`
const JIRA_TOKEN_CHANGED = 'hierarch-jira-token-changed'

interface JiraViewer {
  id: string
  name: string
  email?: string
  avatarUrl?: string
  cloudId: string
}

interface UseJiraTokenReturn {
  token: string | null
  isConnected: boolean
  isLoading: boolean
  viewer: JiraViewer | null
  cloudId: string | null
  startOAuth: () => Promise<void>
  disconnect: () => Promise<void>
  refreshToken: () => Promise<string | null>
}

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return null
  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  }
}

export function useJiraToken(): UseJiraTokenReturn {
  const [token, setToken] = useState<string | null>(null)
  const [viewer, setViewer] = useState<JiraViewer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  // Reload when any instance signals a change
  useEffect(() => {
    const handler = () => setReloadKey(k => k + 1)
    window.addEventListener(JIRA_TOKEN_CHANGED, handler)
    return () => window.removeEventListener(JIRA_TOKEN_CHANGED, handler)
  }, [])

  // Load token from integrations table on mount or when reloadKey changes
  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        setIsLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('integrations')
        .select('access_token, token_expires_at, provider_metadata')
        .eq('owner_id', session.user.id)
        .eq('provider', 'jira')
        .maybeSingle()

      if (cancelled) return

      if (!error && data) {
        setToken(data.access_token)
        setViewer(data.provider_metadata as JiraViewer | null)
      } else {
        setToken(null)
        setViewer(null)
      }

      setIsLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [reloadKey])

  const startOAuth = useCallback(async () => {
    const headers = await getAuthHeaders()
    if (!headers) return

    const res = await fetch(`${EDGE_BASE}/jira/authorize`, { headers })
    const { url, state, error } = await res.json()
    if (error) throw new Error(error)

    // Store state for CSRF validation on callback
    sessionStorage.setItem('hierarch-jira-oauth-state', state)
    window.location.href = url
  }, [])

  const disconnect = useCallback(async () => {
    const headers = await getAuthHeaders()
    if (!headers) return

    await fetch(`${EDGE_BASE}/jira/disconnect`, {
      method: 'DELETE',
      headers,
    })

    localStorage.removeItem('hierarch-jira-token')
    localStorage.removeItem('hierarch-jira-project')

    setToken(null)
    setViewer(null)
    window.dispatchEvent(new Event(JIRA_TOKEN_CHANGED))
  }, [])

  const refreshToken = useCallback(async (): Promise<string | null> => {
    const headers = await getAuthHeaders()
    if (!headers) return null

    const res = await fetch(`${EDGE_BASE}/jira/refresh`, {
      method: 'POST',
      headers,
    })

    if (!res.ok) return null

    const { access_token } = await res.json()
    if (access_token) {
      setToken(access_token)
      return access_token
    }

    return null
  }, [])

  // Wire up auto-refresh for 401 responses
  useEffect(() => {
    setOnUnauthorized(refreshToken)
    return () => setOnUnauthorized(null)
  }, [refreshToken])

  return {
    token,
    isConnected: !!token,
    isLoading,
    viewer,
    cloudId: viewer?.cloudId ?? null,
    startOAuth,
    disconnect,
    refreshToken,
  }
}

// Handle the OAuth callback — call this from App.tsx on mount
export async function handleJiraOAuthCallback(): Promise<boolean> {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const state = params.get('state')

  if (!code || !state) return false

  // Validate state against what we stored before redirect
  const savedState = sessionStorage.getItem('hierarch-jira-oauth-state')
  if (state !== savedState) throw new Error('Invalid state parameter')
  sessionStorage.removeItem('hierarch-jira-oauth-state')

  const headers = await getAuthHeaders()
  if (!headers) return false

  const redirectUri = `${window.location.origin}/auth/jira/callback`

  const res = await fetch(`${EDGE_BASE}/jira/callback`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ code, state, redirect_uri: redirectUri }),
  })

  // Clean up the URL
  window.history.replaceState({}, '', '/')

  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error || 'OAuth callback failed')
  }

  // Notify all hook instances to reload
  window.dispatchEvent(new Event(JIRA_TOKEN_CHANGED))

  return true
}
