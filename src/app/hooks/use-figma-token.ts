import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase-client'

const EDGE_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server`
const FIGMA_TOKEN_CHANGED = 'hierarch-figma-token-changed'

interface FigmaUser {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

interface UseFigmaTokenReturn {
  token: string | null
  isConnected: boolean
  isLoading: boolean
  viewer: FigmaUser | null
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

export function useFigmaToken(): UseFigmaTokenReturn {
  const [token, setToken] = useState<string | null>(null)
  const [viewer, setViewer] = useState<FigmaUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const handler = () => setReloadKey(k => k + 1)
    window.addEventListener(FIGMA_TOKEN_CHANGED, handler)
    return () => window.removeEventListener(FIGMA_TOKEN_CHANGED, handler)
  }, [])

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
        .eq('provider', 'figma')
        .maybeSingle()

      if (cancelled) return

      if (!error && data) {
        setToken(data.access_token)
        setViewer(data.provider_metadata as FigmaUser | null)
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

    const res = await fetch(`${EDGE_BASE}/figma/authorize`, { headers })
    const { url, state, error } = await res.json()
    if (error) throw new Error(error)

    sessionStorage.setItem('hierarch-figma-oauth-state', state)
    window.location.href = url
  }, [])

  const disconnect = useCallback(async () => {
    const headers = await getAuthHeaders()
    if (!headers) return

    await fetch(`${EDGE_BASE}/figma/disconnect`, {
      method: 'DELETE',
      headers,
    })

    setToken(null)
    setViewer(null)
    window.dispatchEvent(new Event(FIGMA_TOKEN_CHANGED))
  }, [])

  const refreshToken = useCallback(async (): Promise<string | null> => {
    const headers = await getAuthHeaders()
    if (!headers) return null

    const res = await fetch(`${EDGE_BASE}/figma/refresh`, {
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

  return {
    token,
    isConnected: !!token,
    isLoading,
    viewer,
    startOAuth,
    disconnect,
    refreshToken,
  }
}

export async function handleFigmaOAuthCallback(): Promise<boolean> {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const state = params.get('state')

  if (!code || !state) return false

  const savedState = sessionStorage.getItem('hierarch-figma-oauth-state')
  if (state !== savedState) throw new Error('Invalid state parameter')
  sessionStorage.removeItem('hierarch-figma-oauth-state')

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return false

  const redirectUri = `${window.location.origin}/auth/figma/callback`

  const res = await fetch(`${EDGE_BASE}/figma/callback`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
  })

  window.history.replaceState({}, '', '/')

  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error || 'OAuth callback failed')
  }

  window.dispatchEvent(new Event(FIGMA_TOKEN_CHANGED))

  return true
}
