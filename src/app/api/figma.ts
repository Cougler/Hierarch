const FIGMA_API = 'https://api.figma.com/v1'

async function api<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${FIGMA_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Figma API error ${res.status}: ${text}`)
  }
  return res.json()
}

// ── Types ────────────────────────────────────────────────────────────

export interface FigmaUser {
  id: string
  handle: string
  img_url: string
  email: string
}

export interface FigmaTeam {
  id: string
  name: string
}

export interface FigmaProject {
  id: number
  name: string
}

export interface FigmaFile {
  key: string
  name: string
  thumbnail_url: string
  last_modified: string
}

export interface FigmaComment {
  id: string
  file_key: string
  parent_id?: string
  message: string
  created_at: string
  resolved_at: string | null
  user: {
    id: string
    handle: string
    img_url: string
  }
  order_id: string | number
}

// ── API Calls ────────────────────────────────────────────────────────

export async function getMe(token: string): Promise<FigmaUser> {
  return api(token, '/me')
}

export async function getTeamProjects(token: string, teamId: string): Promise<FigmaProject[]> {
  const data = await api<{ projects: FigmaProject[] }>(token, `/teams/${teamId}/projects`)
  return data.projects
}

export async function getProjectFiles(token: string, projectId: number): Promise<FigmaFile[]> {
  const data = await api<{ files: FigmaFile[] }>(token, `/projects/${projectId}/files`)
  return data.files
}

export async function getFile(token: string, fileKey: string): Promise<FigmaFile> {
  const data = await api<{ name: string; lastModified: string; thumbnailUrl: string }>(token, `/files/${fileKey}?depth=1`)
  return {
    key: fileKey,
    name: data.name,
    thumbnail_url: data.thumbnailUrl,
    last_modified: data.lastModified,
  }
}

// Extract file key from a Figma URL
export function extractFileKey(url: string): string | null {
  const match = url.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/)
  return match?.[1] ?? null
}

// Stored file keys
const SAVED_FILES_KEY = 'hierarch-figma-files'

export function getSavedFileKeys(): string[] {
  try {
    const saved = localStorage.getItem(SAVED_FILES_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

export function saveFileKey(key: string) {
  const keys = getSavedFileKeys()
  if (!keys.includes(key)) {
    keys.unshift(key)
    localStorage.setItem(SAVED_FILES_KEY, JSON.stringify(keys))
  }
}

export function removeFileKey(key: string) {
  const keys = getSavedFileKeys().filter(k => k !== key)
  localStorage.setItem(SAVED_FILES_KEY, JSON.stringify(keys))
}

export async function getFileComments(token: string, fileKey: string): Promise<FigmaComment[]> {
  const data = await api<{ comments: FigmaComment[] }>(token, `/files/${fileKey}/comments`)
  return data.comments.map(c => ({ ...c, file_key: fileKey }))
}

export async function postComment(token: string, fileKey: string, message: string, commentId?: string): Promise<FigmaComment> {
  const body: Record<string, string> = { message }
  if (commentId) body.comment_id = commentId
  const res = await fetch(`${FIGMA_API}/files/${fileKey}/comments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Failed to post comment')
  return res.json()
}

// ── Unread tracking ──────────────────────────────────────────────────

const LAST_SEEN_KEY = 'hierarch-figma-comments-last-seen'

export function getLastSeenTimestamp(): number {
  const saved = localStorage.getItem(LAST_SEEN_KEY)
  return saved ? Number(saved) : 0
}

export function markCommentsSeen() {
  localStorage.setItem(LAST_SEEN_KEY, String(Date.now()))
}

export function countUnread(comments: FigmaComment[]): number {
  const lastSeen = getLastSeenTimestamp()
  if (!lastSeen) return comments.filter(c => !c.resolved_at).length
  return comments.filter(c => !c.resolved_at && new Date(c.created_at).getTime() > lastSeen).length
}
