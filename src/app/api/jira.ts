const EDGE_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/server`

// Optional refresh callback — set by useJiraToken hook
let _onUnauthorized: (() => Promise<string | null>) | null = null

export function setOnUnauthorized(fn: (() => Promise<string | null>) | null) {
  _onUnauthorized = fn
}

async function getAuthHeaders() {
  const { supabase } = await import('../supabase-client')
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return null
  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  }
}

async function jiraProxy<T>(
  token: string,
  cloudId: string,
  path: string,
  method: string = 'GET',
  body?: unknown,
): Promise<T> {
  const headers = await getAuthHeaders()
  if (!headers) throw new Error('Not authenticated')

  const res = await fetch(`${EDGE_BASE}/jira/proxy`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ cloudId, path, method, body }),
  })

  if (res.status === 401 && _onUnauthorized) {
    const newToken = await _onUnauthorized()
    if (newToken) {
      const retry = await fetch(`${EDGE_BASE}/jira/proxy`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ cloudId, path, method, body }),
      })
      if (!retry.ok) {
        const err = await retry.text()
        throw new Error(`Jira API error: ${err}`)
      }
      return retry.json()
    }
  }

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Jira API error: ${err}`)
  }

  return res.json()
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface JiraUser {
  accountId: string
  displayName: string
  emailAddress?: string
  avatarUrls?: { '48x48'?: string; '32x32'?: string; '24x24'?: string; '16x16'?: string }
}

export interface JiraProject {
  id: string
  key: string
  name: string
  avatarUrls?: { '48x48'?: string }
}

export interface JiraStatusCategory {
  id: number
  key: string
  name: string
  colorName: string
}

export interface JiraStatus {
  id: string
  name: string
  statusCategory: JiraStatusCategory
}

export interface JiraIssueType {
  id: string
  name: string
  iconUrl?: string
}

export interface JiraPriority {
  id: string
  name: string
  iconUrl?: string
}

export interface JiraIssue {
  id: string
  key: string
  self: string
  fields: {
    summary: string
    description?: any
    status: JiraStatus
    assignee?: JiraUser
    priority?: JiraPriority
    issuetype?: JiraIssueType
    labels?: string[]
    created: string
    updated: string
  }
}

export interface JiraTransition {
  id: string
  name: string
  to: JiraStatus
}

// ── API Functions ────────────────────────────────────────────────────────────

export async function getMyself(token: string, cloudId: string): Promise<JiraUser> {
  return jiraProxy<JiraUser>(token, cloudId, '/rest/api/3/myself')
}

export async function getProjects(token: string, cloudId: string): Promise<JiraProject[]> {
  return jiraProxy<JiraProject[]>(token, cloudId, '/rest/api/3/project')
}

export async function getStatuses(token: string, cloudId: string, projectKey: string): Promise<JiraStatus[]> {
  const data = await jiraProxy<{ id: string; name: string; statuses: JiraStatus[] }[]>(
    token, cloudId, `/rest/api/3/project/${projectKey}/statuses`
  )
  // Flatten and deduplicate statuses across issue types
  const seen = new Set<string>()
  const statuses: JiraStatus[] = []
  for (const issueType of data) {
    for (const s of issueType.statuses) {
      if (!seen.has(s.id)) {
        seen.add(s.id)
        statuses.push(s)
      }
    }
  }
  return statuses
}

export async function getIssues(token: string, cloudId: string, projectKey: string): Promise<JiraIssue[]> {
  const data = await jiraProxy<{ issues: JiraIssue[] }>(
    token, cloudId,
    `/rest/api/3/search/jql?jql=${encodeURIComponent(`project=${projectKey} ORDER BY updated DESC`)}&fields=summary,status,assignee,priority,issuetype,labels,created,updated&maxResults=100`
  )
  return data.issues
}

export async function getIssue(token: string, cloudId: string, issueKey: string): Promise<JiraIssue> {
  return jiraProxy<JiraIssue>(
    token, cloudId,
    `/rest/api/3/issue/${issueKey}?fields=summary,description,status,assignee,priority,issuetype,labels,created,updated`
  )
}

export async function getTransitions(token: string, cloudId: string, issueKey: string): Promise<JiraTransition[]> {
  const data = await jiraProxy<{ transitions: JiraTransition[] }>(
    token, cloudId, `/rest/api/3/issue/${issueKey}/transitions`
  )
  return data.transitions
}

export async function transitionIssue(token: string, cloudId: string, issueKey: string, transitionId: string): Promise<void> {
  await jiraProxy(token, cloudId, `/rest/api/3/issue/${issueKey}/transitions`, 'POST', {
    transition: { id: transitionId },
  })
}

export async function updateIssue(
  token: string,
  cloudId: string,
  issueKey: string,
  fields: Record<string, unknown>,
): Promise<void> {
  await jiraProxy(token, cloudId, `/rest/api/3/issue/${issueKey}`, 'PUT', { fields })
}

export async function createIssue(
  token: string,
  cloudId: string,
  input: {
    projectKey: string
    summary: string
    description?: string
    issueTypeId?: string
    priorityId?: string
    assigneeId?: string
  },
): Promise<JiraIssue> {
  const fields: Record<string, unknown> = {
    project: { key: input.projectKey },
    summary: input.summary,
    issuetype: { id: input.issueTypeId || '10001' },
  }
  if (input.description) fields.description = { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: input.description }] }] }
  if (input.priorityId) fields.priority = { id: input.priorityId }
  if (input.assigneeId) fields.assignee = { accountId: input.assigneeId }

  const created = await jiraProxy<JiraIssue>(token, cloudId, '/rest/api/3/issue', 'POST', { fields })
  return getIssue(token, cloudId, created.key)
}

export async function getProjectMembers(token: string, cloudId: string, projectKey: string): Promise<JiraUser[]> {
  return jiraProxy<JiraUser[]>(
    token, cloudId,
    `/rest/api/3/user/assignable/search?project=${projectKey}&maxResults=50`
  )
}

// ── Design metadata (localStorage, same pattern as Linear) ───────────────────

export interface DesignMeta {
  figmaUrl?: string
  designType?: 'ui' | 'ux' | 'brand' | 'motion' | 'prototype' | 'copy'
  checklist?: { id: string; title: string; done: boolean }[]
}

const DESIGN_META_KEY = 'hierarch-jira-design-meta'

export function getDesignMeta(issueKey: string): DesignMeta {
  try {
    const raw = localStorage.getItem(DESIGN_META_KEY)
    const all = raw ? JSON.parse(raw) : {}
    return all[issueKey] || {}
  } catch {
    return {}
  }
}

export function saveDesignMeta(issueKey: string, meta: DesignMeta) {
  try {
    const raw = localStorage.getItem(DESIGN_META_KEY)
    const all = raw ? JSON.parse(raw) : {}
    all[issueKey] = meta
    localStorage.setItem(DESIGN_META_KEY, JSON.stringify(all))
  } catch {
    // ignore
  }
}

export const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  '1': { label: 'Highest', color: 'text-red-500' },
  '2': { label: 'High', color: 'text-orange-400' },
  '3': { label: 'Medium', color: 'text-yellow-400' },
  '4': { label: 'Low', color: 'text-blue-400' },
  '5': { label: 'Lowest', color: 'text-muted-foreground' },
}

export const STATUS_CATEGORY_COLORS: Record<string, string> = {
  'new': '#64748b',
  'indeterminate': '#3b82f6',
  'done': '#10b981',
  'undefined': '#94a3b8',
}

export const DESIGN_TYPES: Record<string, { label: string; color: string }> = {
  ui: { label: 'UI', color: 'bg-blue-500/20 text-blue-400' },
  ux: { label: 'UX', color: 'bg-purple-500/20 text-purple-400' },
  brand: { label: 'Brand', color: 'bg-pink-500/20 text-pink-400' },
  motion: { label: 'Motion', color: 'bg-cyan-500/20 text-cyan-400' },
  prototype: { label: 'Prototype', color: 'bg-green-500/20 text-green-400' },
  copy: { label: 'Copy', color: 'bg-amber-500/20 text-amber-400' },
}
