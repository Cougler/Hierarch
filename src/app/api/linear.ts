const LINEAR_API = 'https://api.linear.app/graphql'

async function gql<T>(token: string, query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(LINEAR_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json()
  if (json.errors) throw new Error(json.errors[0].message)
  return json.data as T
}

export interface LinearUser {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

export interface LinearTeam {
  id: string
  name: string
}

export interface LinearStatus {
  id: string
  name: string
  type: string
  color: string
}

export interface LinearLabel {
  id: string
  name: string
  color: string
}

export interface LinearIssue {
  id: string
  identifier: string
  title: string
  description?: string
  priority: number
  url: string
  status: LinearStatus
  labels: LinearLabel[]
  assignee?: LinearUser
  createdAt: string
  updatedAt: string
}

export async function getViewer(token: string): Promise<LinearUser> {
  const data = await gql<{ viewer: LinearUser }>(token, `{ viewer { id name email avatarUrl } }`)
  return data.viewer
}

export async function getTeams(token: string): Promise<LinearTeam[]> {
  const data = await gql<{ teams: { nodes: LinearTeam[] } }>(token, `{ teams { nodes { id name } } }`)
  return data.teams.nodes
}

export async function getTeamStatuses(token: string, teamId: string): Promise<LinearStatus[]> {
  const data = await gql<{ team: { states: { nodes: LinearStatus[] } } }>(
    token,
    `query($teamId: String!) { team(id: $teamId) { states { nodes { id name type color } } } }`,
    { teamId }
  )
  return data.team.states.nodes
}

export async function getIssues(token: string, teamId: string): Promise<LinearIssue[]> {
  const data = await gql<{ team: { issues: { nodes: LinearIssue[] } } }>(
    token,
    `query($teamId: String!) {
      team(id: $teamId) {
        issues(orderBy: updatedAt) {
          nodes {
            id identifier title description priority url createdAt updatedAt
            status { id name type color }
            labels { nodes { id name color } }
            assignee { id name email avatarUrl }
          }
        }
      }
    }`,
    { teamId }
  )
  return data.team.issues.nodes
}

export async function createIssue(
  token: string,
  input: {
    teamId: string
    title: string
    description?: string
    statusId?: string
    labelIds?: string[]
    priority?: number
  }
): Promise<LinearIssue> {
  const data = await gql<{ issueCreate: { issue: LinearIssue } }>(
    token,
    `mutation($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        issue {
          id identifier title description priority url createdAt updatedAt
          status { id name type color }
          labels { nodes { id name color } }
          assignee { id name email avatarUrl }
        }
      }
    }`,
    { input }
  )
  return data.issueCreate.issue
}

export async function updateIssue(
  token: string,
  id: string,
  input: {
    statusId?: string
    description?: string
    priority?: number
    title?: string
  }
): Promise<LinearIssue> {
  const data = await gql<{ issueUpdate: { issue: LinearIssue } }>(
    token,
    `mutation($id: String!, $input: IssueUpdateInput!) {
      issueUpdate(id: $id, input: $input) {
        issue {
          id identifier title description priority url createdAt updatedAt
          status { id name type color }
          labels { nodes { id name color } }
          assignee { id name email avatarUrl }
        }
      }
    }`,
    { id, input }
  )
  return data.issueUpdate.issue
}

// Design metadata stored locally per issue
export interface DesignMeta {
  figmaUrl?: string
  designType?: 'ui' | 'ux' | 'brand' | 'motion' | 'prototype' | 'copy'
  checklist?: { id: string; title: string; done: boolean }[]
}

const DESIGN_META_KEY = 'flowki-linear-design-meta'

export function getDesignMeta(issueId: string): DesignMeta {
  try {
    const raw = localStorage.getItem(DESIGN_META_KEY)
    const all = raw ? JSON.parse(raw) : {}
    return all[issueId] || {}
  } catch {
    return {}
  }
}

export function saveDesignMeta(issueId: string, meta: DesignMeta) {
  try {
    const raw = localStorage.getItem(DESIGN_META_KEY)
    const all = raw ? JSON.parse(raw) : {}
    all[issueId] = meta
    localStorage.setItem(DESIGN_META_KEY, JSON.stringify(all))
  } catch {
    // ignore
  }
}

export const DEFAULT_DESIGN_CHECKLIST = [
  { id: 'specs', title: 'Specs complete', done: false },
  { id: 'responsive', title: 'Responsive / breakpoints', done: false },
  { id: 'darkmode', title: 'Dark mode checked', done: false },
  { id: 'a11y', title: 'Accessibility reviewed', done: false },
  { id: 'handoff', title: 'Dev handoff ready', done: false },
]

export const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'No Priority', color: 'text-muted-foreground' },
  1: { label: 'Urgent', color: 'text-red-500' },
  2: { label: 'High', color: 'text-orange-400' },
  3: { label: 'Medium', color: 'text-yellow-400' },
  4: { label: 'Low', color: 'text-muted-foreground' },
}

export const DESIGN_TYPES: Record<string, { label: string; color: string }> = {
  ui: { label: 'UI', color: 'bg-blue-500/20 text-blue-400' },
  ux: { label: 'UX', color: 'bg-purple-500/20 text-purple-400' },
  brand: { label: 'Brand', color: 'bg-pink-500/20 text-pink-400' },
  motion: { label: 'Motion', color: 'bg-cyan-500/20 text-cyan-400' },
  prototype: { label: 'Prototype', color: 'bg-green-500/20 text-green-400' },
  copy: { label: 'Copy', color: 'bg-amber-500/20 text-amber-400' },
}
