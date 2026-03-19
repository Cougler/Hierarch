import { Hono } from "https://deno.land/x/hono@v3.12.0/mod.ts"
import { cors, logger } from "https://deno.land/x/hono@v3.12.0/middleware.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import {
  kvDelete,
  kvList,
  kvSet,
} from "./kv_store.ts"

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
)

async function getAuthUser(req: Request) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (!token) return null
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  return user
}

const app = new Hono().basePath("/server")

app.use("*", cors())
app.use("*", logger())

// POST /signup — Creates user via admin API
app.post("/signup", async (c) => {
  try {
    const body = await c.req.json<{ email: string; password: string; name?: string }>()
    const { email, password, name } = body
    if (!email || !password) {
      return c.json({ error: "email and password are required" }, 400)
    }
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: name ? { name } : undefined,
    })
    if (error) {
      return c.json({ error: error.message }, 400)
    }
    return c.json(data.user)
  } catch (e) {
    return c.json({ error: String(e) }, 500)
  }
})

// POST /upload-avatar — Authenticated, multipart upload to avatars bucket
app.post("/upload-avatar", async (c) => {
  const user = await getAuthUser(c.req.raw)
  if (!user) return c.json({ error: "Unauthorized" }, 401)

  try {
    const formData = await c.req.formData()
    const file = formData.get("file") as File | null
    if (!file) return c.json({ error: "No file provided" }, 400)

    const bucketName = "avatars"
    try {
      await supabaseAdmin.storage.createBucket(bucketName, {
        public: false,
        fileSizeLimit: 5242880,
      })
    } catch {
      // Bucket may already exist — idempotent
    }

    const ext = file.name.split(".").pop() ?? "jpg"
    const filename = `avatar.${ext}`
    const path = `${user.id}/${filename}`

    const arrayBuffer = await file.arrayBuffer()
    const { error } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(path, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      })

    if (error) return c.json({ error: error.message }, 500)

    const { data: urlData, error: urlError } = await supabaseAdmin.storage
      .from(bucketName)
      .createSignedUrl(path, 60 * 60 * 24 * 365) // 1 year expiry

    if (urlError) return c.json({ error: urlError.message }, 500)
    return c.json({ url: urlData.signedUrl })
  } catch (e) {
    return c.json({ error: String(e) }, 500)
  }
})

// GET /time-entries — Authenticated, list all for user
app.get("/time-entries", async (c) => {
  const user = await getAuthUser(c.req.raw)
  if (!user) return c.json({ error: "Unauthorized" }, 401)

  try {
    const entries = await kvList<unknown>(["time_entry", user.id])
    return c.json(
      entries.map((e) => ({ ...e.value, id: (e.key as string[])[2] }))
    )
  } catch (e) {
    return c.json({ error: String(e) }, 500)
  }
})

// POST /time-entries — Authenticated, create new entry
app.post("/time-entries", async (c) => {
  const user = await getAuthUser(c.req.raw)
  if (!user) return c.json({ error: "Unauthorized" }, 401)

  try {
    const body = await c.req.json<Record<string, unknown>>()
    const id = crypto.randomUUID()
    const value = { ...body, id }
    await kvSet(["time_entry", user.id, id], value)
    return c.json(value)
  } catch (e) {
    return c.json({ error: String(e) }, 500)
  }
})

// DELETE /time-entries — Authenticated, delete by id
app.delete("/time-entries", async (c) => {
  const user = await getAuthUser(c.req.raw)
  if (!user) return c.json({ error: "Unauthorized" }, 401)

  const id = c.req.query("id")
  if (!id) return c.json({ error: "id query param required" }, 400)

  try {
    await kvDelete(["time_entry", user.id, id])
    return c.json({ ok: true })
  } catch (e) {
    return c.json({ error: String(e) }, 500)
  }
})

// ─── Linear OAuth ───────────────────────────────────────────────────

const LINEAR_CLIENT_ID = Deno.env.get("LINEAR_CLIENT_ID") ?? ""
const LINEAR_CLIENT_SECRET = Deno.env.get("LINEAR_CLIENT_SECRET") ?? ""
const LINEAR_TOKEN_URL = "https://api.linear.app/oauth/token"
const LINEAR_REVOKE_URL = "https://api.linear.app/oauth/revoke"
const LINEAR_API_URL = "https://api.linear.app/graphql"

function getLinearRedirectUri(origin: string) {
  return `${origin}/auth/linear/callback`
}

async function fetchLinearViewer(accessToken: string) {
  const res = await fetch(LINEAR_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: accessToken,
    },
    body: JSON.stringify({
      query: `{ viewer { id name email avatarUrl } }`,
    }),
  })
  const json = await res.json()
  return json.data?.viewer ?? null
}

// GET /linear/authorize — Returns the Linear OAuth URL
app.get("/linear/authorize", async (c) => {
  const user = await getAuthUser(c.req.raw)
  if (!user) return c.json({ error: "Unauthorized" }, 401)

  const state = crypto.randomUUID()

  const origin = c.req.header("Origin") || c.req.header("Referer")?.replace(/\/$/, "") || "http://localhost:3000"
  const redirectUri = getLinearRedirectUri(origin)

  const params = new URLSearchParams({
    client_id: LINEAR_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "read,write",
    state,
    prompt: "consent",
  })

  return c.json({ url: `https://linear.app/oauth/authorize?${params}`, state })
})

// POST /linear/callback — Exchanges auth code for tokens
app.post("/linear/callback", async (c) => {
  const user = await getAuthUser(c.req.raw)
  if (!user) return c.json({ error: "Unauthorized" }, 401)

  try {
    const { code, state, redirect_uri } = await c.req.json<{
      code: string
      state: string
      redirect_uri: string
    }>()

    // State is validated client-side via sessionStorage

    // Exchange code for tokens
    const tokenRes = await fetch(LINEAR_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri,
        client_id: LINEAR_CLIENT_ID,
        client_secret: LINEAR_CLIENT_SECRET,
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      return c.json({ error: `Token exchange failed: ${err}` }, 400)
    }

    const tokens = await tokenRes.json()
    const { access_token, refresh_token, expires_in, scope } = tokens

    // Fetch Linear viewer info
    const viewer = await fetchLinearViewer(access_token)

    // Upsert into integrations table
    const expiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : null

    const { error: dbError } = await supabaseAdmin
      .from("integrations")
      .upsert(
        {
          owner_id: user.id,
          provider: "linear",
          access_token,
          refresh_token: refresh_token ?? null,
          token_expires_at: expiresAt,
          scopes: scope ?? "read,write",
          provider_user_id: viewer?.id ?? null,
          provider_metadata: viewer ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "owner_id,provider" }
      )

    if (dbError) return c.json({ error: dbError.message }, 500)

    return c.json({ success: true, viewer })
  } catch (e) {
    return c.json({ error: String(e) }, 500)
  }
})

// POST /linear/refresh — Refreshes an expired token
app.post("/linear/refresh", async (c) => {
  const user = await getAuthUser(c.req.raw)
  if (!user) return c.json({ error: "Unauthorized" }, 401)

  try {
    const { data: integration, error: fetchError } = await supabaseAdmin
      .from("integrations")
      .select("refresh_token")
      .eq("owner_id", user.id)
      .eq("provider", "linear")
      .single()

    if (fetchError || !integration?.refresh_token) {
      return c.json({ error: "No refresh token found" }, 400)
    }

    const tokenRes = await fetch(LINEAR_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: integration.refresh_token,
        client_id: LINEAR_CLIENT_ID,
        client_secret: LINEAR_CLIENT_SECRET,
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      return c.json({ error: `Refresh failed: ${err}` }, 400)
    }

    const tokens = await tokenRes.json()
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null

    const { error: dbError } = await supabaseAdmin
      .from("integrations")
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? integration.refresh_token,
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("owner_id", user.id)
      .eq("provider", "linear")

    if (dbError) return c.json({ error: dbError.message }, 500)

    return c.json({
      access_token: tokens.access_token,
      expires_at: expiresAt,
    })
  } catch (e) {
    return c.json({ error: String(e) }, 500)
  }
})

// DELETE /linear/disconnect — Revokes token and removes integration
app.delete("/linear/disconnect", async (c) => {
  const user = await getAuthUser(c.req.raw)
  if (!user) return c.json({ error: "Unauthorized" }, 401)

  try {
    const { data: integration } = await supabaseAdmin
      .from("integrations")
      .select("access_token")
      .eq("owner_id", user.id)
      .eq("provider", "linear")
      .single()

    // Revoke at Linear (best effort)
    if (integration?.access_token) {
      await fetch(LINEAR_REVOKE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: integration.access_token }),
      }).catch(() => {})
    }

    const { error: dbError } = await supabaseAdmin
      .from("integrations")
      .delete()
      .eq("owner_id", user.id)
      .eq("provider", "linear")

    if (dbError) return c.json({ error: dbError.message }, 500)

    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: String(e) }, 500)
  }
})

// ─── Linear Webhooks ────────────────────────────────────────────────

const LINEAR_WEBHOOK_SECRET = Deno.env.get("LINEAR_WEBHOOK_SECRET") ?? ""

// Verify Linear webhook signature using HMAC-SHA256
async function verifyLinearSignature(body: string, signature: string): Promise<boolean> {
  if (!LINEAR_WEBHOOK_SECRET || !signature) return false
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(LINEAR_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body))
  const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("")
  return computed === signature
}

// POST /linear/webhook — Receives Linear webhook events
app.post("/linear/webhook", async (c) => {
  const rawBody = await c.req.text()
  const signature = c.req.header("Linear-Signature") ?? c.req.header("linear-signature") ?? ""

  // TODO: Re-enable signature verification once format is confirmed
  // For now, log signature details for debugging
  console.log("Linear webhook received", { hasSecret: !!LINEAR_WEBHOOK_SECRET, hasSignature: !!signature, signatureLength: signature.length })

  try {
    const payload = JSON.parse(rawBody)
    const { action, type, data, url, updatedFrom } = payload

    // Handle Issue events
    if (type === "Issue") {
      const event: Record<string, unknown> = {
        action,
        type: "Issue",
        linear_id: data.id,
        title: data.title,
        identifier: data.identifier ?? data.id,
        status_name: data.state?.name ?? null,
        status_color: data.state?.color ?? null,
        assignee_id: data.assignee?.id ?? data.assigneeId ?? null,
        assignee_name: data.assignee?.name ?? null,
        team_id: data.team?.id ?? data.teamId ?? null,
        actor_id: payload.actor?.id ?? null,
        actor_name: payload.actor?.name ?? null,
        url: url ?? data.url ?? null,
        updated_at: data.updatedAt ?? new Date().toISOString(),
        raw_data: payload,
      }

      // Add context about what changed
      if (updatedFrom) {
        if (updatedFrom.stateId) event.title = `${data.title}`
        if (updatedFrom.assigneeId !== undefined) event.title = `${data.title}`
      }

      await supabaseAdmin.from("linear_events").insert(event)
    }

    // Handle Comment events
    if (type === "Comment") {
      await supabaseAdmin.from("linear_events").insert({
        action,
        type: "Comment",
        linear_id: data.id,
        title: data.body?.substring(0, 500) ?? "",
        identifier: data.issue?.identifier ?? null,
        team_id: data.issue?.team?.id ?? null,
        actor_id: data.user?.id ?? payload.actor?.id ?? null,
        actor_name: data.user?.name ?? payload.actor?.name ?? null,
        url: data.issue?.url ?? url ?? null,
        updated_at: data.updatedAt ?? data.createdAt ?? new Date().toISOString(),
        raw_data: payload,
      })
    }

    return c.json({ success: true })
  } catch (e) {
    console.error("Linear webhook error:", e)
    return c.json({ error: String(e) }, 500)
  }
})

// ─── Figma OAuth ────────────────────────────────────────────────────

const FIGMA_CLIENT_ID = Deno.env.get("FIGMA_CLIENT_ID") ?? ""
const FIGMA_CLIENT_SECRET = Deno.env.get("FIGMA_CLIENT_SECRET") ?? ""
const FIGMA_TOKEN_URL = "https://api.figma.com/v1/oauth/token"
const FIGMA_REVOKE_URL = "https://api.figma.com/v1/oauth/revoke"
const FIGMA_API_URL = "https://api.figma.com/v1"

function getFigmaRedirectUri(origin: string) {
  return `${origin}/auth/figma/callback`
}

async function fetchFigmaUser(accessToken: string) {
  const res = await fetch(`${FIGMA_API_URL}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return null
  const user = await res.json()
  return { id: user.id, name: user.handle, email: user.email, avatarUrl: user.img_url }
}

// GET /figma/authorize — Returns the Figma OAuth URL
app.get("/figma/authorize", async (c) => {
  const user = await getAuthUser(c.req.raw)
  if (!user) return c.json({ error: "Unauthorized" }, 401)

  const state = crypto.randomUUID()

  const origin = c.req.header("Origin") || c.req.header("Referer")?.replace(/\/$/, "") || "http://localhost:3000"
  const redirectUri = getFigmaRedirectUri(origin)

  const params = new URLSearchParams({
    client_id: FIGMA_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: "current_user:read file_comments:read file_comments:write file_content:read file_metadata:read webhooks:write",
    state,
    response_type: "code",
  })

  return c.json({ url: `https://www.figma.com/oauth?${params}`, state })
})

// POST /figma/callback — Exchanges auth code for tokens
app.post("/figma/callback", async (c) => {
  const user = await getAuthUser(c.req.raw)
  if (!user) return c.json({ error: "Unauthorized" }, 401)

  try {
    const { code, redirect_uri } = await c.req.json<{
      code: string
      redirect_uri: string
    }>()

    const tokenRes = await fetch(FIGMA_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: FIGMA_CLIENT_ID,
        client_secret: FIGMA_CLIENT_SECRET,
        redirect_uri,
        code,
        grant_type: "authorization_code",
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      return c.json({ error: `Token exchange failed: ${err}` }, 400)
    }

    const tokens = await tokenRes.json()
    const { access_token, refresh_token, expires_in } = tokens

    const figmaUser = await fetchFigmaUser(access_token)

    const expiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : null

    const { error: dbError } = await supabaseAdmin
      .from("integrations")
      .upsert(
        {
          owner_id: user.id,
          provider: "figma",
          access_token,
          refresh_token: refresh_token ?? null,
          token_expires_at: expiresAt,
          scopes: "current_user:read,file_comments:read,file_comments:write,file_content:read,file_metadata:read,webhooks:write",
          provider_user_id: figmaUser?.id ?? null,
          provider_metadata: figmaUser ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "owner_id,provider" }
      )

    if (dbError) return c.json({ error: dbError.message }, 500)

    return c.json({ success: true, viewer: figmaUser })
  } catch (e) {
    return c.json({ error: String(e) }, 500)
  }
})

// POST /figma/refresh — Refreshes an expired token
app.post("/figma/refresh", async (c) => {
  const user = await getAuthUser(c.req.raw)
  if (!user) return c.json({ error: "Unauthorized" }, 401)

  try {
    const { data: integration, error: fetchError } = await supabaseAdmin
      .from("integrations")
      .select("refresh_token")
      .eq("owner_id", user.id)
      .eq("provider", "figma")
      .single()

    if (fetchError || !integration?.refresh_token) {
      return c.json({ error: "No refresh token found" }, 400)
    }

    const tokenRes = await fetch(FIGMA_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: FIGMA_CLIENT_ID,
        client_secret: FIGMA_CLIENT_SECRET,
        refresh_token: integration.refresh_token,
        grant_type: "refresh_token",
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      return c.json({ error: `Refresh failed: ${err}` }, 400)
    }

    const tokens = await tokenRes.json()
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null

    const { error: dbError } = await supabaseAdmin
      .from("integrations")
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? integration.refresh_token,
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("owner_id", user.id)
      .eq("provider", "figma")

    if (dbError) return c.json({ error: dbError.message }, 500)

    return c.json({
      access_token: tokens.access_token,
      expires_at: expiresAt,
    })
  } catch (e) {
    return c.json({ error: String(e) }, 500)
  }
})

// DELETE /figma/disconnect — Revokes token and removes integration
app.delete("/figma/disconnect", async (c) => {
  const user = await getAuthUser(c.req.raw)
  if (!user) return c.json({ error: "Unauthorized" }, 401)

  try {
    const { data: integration } = await supabaseAdmin
      .from("integrations")
      .select("access_token")
      .eq("owner_id", user.id)
      .eq("provider", "figma")
      .single()

    if (integration?.access_token) {
      await fetch(FIGMA_REVOKE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${integration.access_token}`,
        },
      }).catch(() => {})
    }

    const { error: dbError } = await supabaseAdmin
      .from("integrations")
      .delete()
      .eq("owner_id", user.id)
      .eq("provider", "figma")

    if (dbError) return c.json({ error: dbError.message }, 500)

    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: String(e) }, 500)
  }
})

// ─── Figma Webhooks ─────────────────────────────────────────────────

// POST /figma/webhook — Public endpoint that receives Figma webhook events
app.post("/figma/webhook", async (c) => {
  try {
    const body = await c.req.json()
    const { event_type, passcode, file_key, file_name, comment } = body

    if (event_type === "PING") {
      return c.json({ ok: true })
    }

    if (event_type !== "FILE_COMMENT" || !comment) {
      return c.json({ ok: true })
    }

    // Verify passcode against stored webhooks
    const { data: webhook } = await supabaseAdmin
      .from("figma_webhooks")
      .select("id")
      .eq("passcode", passcode)
      .maybeSingle()

    if (!webhook) {
      return c.json({ error: "Invalid passcode" }, 403)
    }

    // comment is an array in Figma webhooks
    const comments = Array.isArray(comment) ? comment : [comment]

    for (const c2 of comments) {
      const mentionIds = (c2.mentions ?? []).map((m: { id: string }) => m.id)

      await supabaseAdmin
        .from("figma_comments")
        .upsert({
          id: c2.id,
          file_key: file_key,
          file_name: file_name ?? "Unknown file",
          parent_id: c2.parent_id ?? null,
          message: c2.text ?? c2.message ?? "",
          figma_user_id: c2.user?.id ?? "",
          figma_user_handle: c2.user?.handle ?? "Unknown",
          figma_user_avatar: c2.user?.img_url ?? null,
          mentions: mentionIds,
          resolved_at: c2.resolved_at ?? null,
          created_at: c2.created_at ?? new Date().toISOString(),
        }, { onConflict: "id" })
    }

    return c.json({ ok: true })
  } catch (e) {
    console.error("Figma webhook error:", e)
    return c.json({ error: String(e) }, 500)
  }
})

// POST /figma/webhook/register — Register a webhook with Figma for a team
app.post("/figma/webhook/register", async (c) => {
  const user = await getAuthUser(c.req.raw)
  if (!user) return c.json({ error: "Unauthorized" }, 401)

  try {
    const { team_id } = await c.req.json<{ team_id: string }>()
    if (!team_id) return c.json({ error: "team_id required" }, 400)

    // Get Figma token
    const { data: integration } = await supabaseAdmin
      .from("integrations")
      .select("access_token")
      .eq("owner_id", user.id)
      .eq("provider", "figma")
      .single()

    if (!integration?.access_token) {
      return c.json({ error: "Figma not connected" }, 400)
    }

    // Check for existing webhook for this team
    const { data: existing } = await supabaseAdmin
      .from("figma_webhooks")
      .select("id")
      .eq("team_id", team_id)
      .eq("owner_id", user.id)
      .maybeSingle()

    if (existing) {
      return c.json({ success: true, message: "Webhook already registered" })
    }

    const passcode = crypto.randomUUID()
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const endpoint = `${supabaseUrl}/functions/v1/server/figma/webhook`

    // Register with Figma
    const res = await fetch("https://api.figma.com/v2/webhooks", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${integration.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_type: "FILE_COMMENT",
        team_id,
        endpoint,
        passcode,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return c.json({ error: `Figma webhook registration failed: ${err}` }, 400)
    }

    const webhookData = await res.json()

    // Store webhook info
    await supabaseAdmin
      .from("figma_webhooks")
      .insert({
        id: webhookData.id,
        team_id,
        owner_id: user.id,
        passcode,
      })

    return c.json({ success: true, webhook_id: webhookData.id })
  } catch (e) {
    return c.json({ error: String(e) }, 500)
  }
})

// GET /figma/webhook/status — Check if a webhook is registered
app.get("/figma/webhook/status", async (c) => {
  const user = await getAuthUser(c.req.raw)
  if (!user) return c.json({ error: "Unauthorized" }, 401)

  const { data } = await supabaseAdmin
    .from("figma_webhooks")
    .select("id, team_id")
    .eq("owner_id", user.id)
    .maybeSingle()

  return c.json({ registered: !!data, team_id: data?.team_id ?? null })
})

// ─── Jira OAuth ─────────────────────────────────────────────────────

const JIRA_CLIENT_ID = Deno.env.get("JIRA_CLIENT_ID") ?? ""
const JIRA_CLIENT_SECRET = Deno.env.get("JIRA_CLIENT_SECRET") ?? ""
const JIRA_AUTH_URL = "https://auth.atlassian.com/authorize"
const JIRA_TOKEN_URL = "https://auth.atlassian.com/oauth/token"
const JIRA_RESOURCES_URL = "https://api.atlassian.com/oauth/token/accessible-resources"

function getJiraRedirectUri(origin: string) {
  return `${origin}/auth/jira/callback`
}

// GET /jira/authorize — Returns the Atlassian OAuth URL
app.get("/jira/authorize", async (c) => {
  const user = await getAuthUser(c.req.raw)
  if (!user) return c.json({ error: "Unauthorized" }, 401)

  const state = crypto.randomUUID()

  const origin = c.req.header("Origin") || c.req.header("Referer")?.replace(/\/$/, "") || "http://localhost:3000"
  const redirectUri = getJiraRedirectUri(origin)

  const params = new URLSearchParams({
    audience: "api.atlassian.com",
    client_id: JIRA_CLIENT_ID,
    scope: "read:jira-work write:jira-work read:jira-user offline_access",
    redirect_uri: redirectUri,
    state,
    response_type: "code",
    prompt: "consent",
  })

  return c.json({ url: `${JIRA_AUTH_URL}?${params}`, state })
})

// POST /jira/callback — Exchanges auth code for tokens
app.post("/jira/callback", async (c) => {
  const user = await getAuthUser(c.req.raw)
  if (!user) return c.json({ error: "Unauthorized" }, 401)

  try {
    const { code, redirect_uri } = await c.req.json<{
      code: string
      state: string
      redirect_uri: string
    }>()

    // Exchange code for tokens (Atlassian requires JSON body)
    const tokenRes = await fetch(JIRA_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: JIRA_CLIENT_ID,
        client_secret: JIRA_CLIENT_SECRET,
        code,
        redirect_uri,
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      return c.json({ error: `Token exchange failed: ${err}` }, 400)
    }

    const tokens = await tokenRes.json()
    const { access_token, refresh_token, expires_in, scope } = tokens

    // Fetch accessible resources to get cloudId
    const resourcesRes = await fetch(JIRA_RESOURCES_URL, {
      headers: { Authorization: `Bearer ${access_token}` },
    })

    if (!resourcesRes.ok) {
      return c.json({ error: "Failed to fetch accessible resources" }, 400)
    }

    const resources = await resourcesRes.json()
    if (!resources.length) {
      return c.json({ error: "No Jira sites found for this account" }, 400)
    }

    // Use the first site (most users have one)
    const site = resources[0]
    const cloudId = site.id

    // Fetch current user info
    const myselfRes = await fetch(`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/myself`, {
      headers: { Authorization: `Bearer ${access_token}` },
    })

    const myself = myselfRes.ok ? await myselfRes.json() : null

    const viewer = {
      id: myself?.accountId ?? "",
      name: myself?.displayName ?? "",
      email: myself?.emailAddress ?? "",
      avatarUrl: myself?.avatarUrls?.["48x48"] ?? null,
      cloudId,
    }

    // Upsert into integrations table
    const expiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : null

    const { error: dbError } = await supabaseAdmin
      .from("integrations")
      .upsert(
        {
          owner_id: user.id,
          provider: "jira",
          access_token,
          refresh_token: refresh_token ?? null,
          token_expires_at: expiresAt,
          scopes: scope ?? "read:jira-work write:jira-work read:jira-user offline_access",
          provider_user_id: viewer.id,
          provider_metadata: viewer,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "owner_id,provider" }
      )

    if (dbError) return c.json({ error: dbError.message }, 500)

    return c.json({ success: true, viewer })
  } catch (e) {
    return c.json({ error: String(e) }, 500)
  }
})

// POST /jira/refresh — Refreshes an expired token
app.post("/jira/refresh", async (c) => {
  const user = await getAuthUser(c.req.raw)
  if (!user) return c.json({ error: "Unauthorized" }, 401)

  try {
    const { data: integration, error: fetchError } = await supabaseAdmin
      .from("integrations")
      .select("refresh_token")
      .eq("owner_id", user.id)
      .eq("provider", "jira")
      .single()

    if (fetchError || !integration?.refresh_token) {
      return c.json({ error: "No refresh token found" }, 400)
    }

    const tokenRes = await fetch(JIRA_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: JIRA_CLIENT_ID,
        client_secret: JIRA_CLIENT_SECRET,
        refresh_token: integration.refresh_token,
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      return c.json({ error: `Refresh failed: ${err}` }, 400)
    }

    const tokens = await tokenRes.json()
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null

    const { error: dbError } = await supabaseAdmin
      .from("integrations")
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? integration.refresh_token,
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("owner_id", user.id)
      .eq("provider", "jira")

    if (dbError) return c.json({ error: dbError.message }, 500)

    return c.json({
      access_token: tokens.access_token,
      expires_at: expiresAt,
    })
  } catch (e) {
    return c.json({ error: String(e) }, 500)
  }
})

// DELETE /jira/disconnect — Removes integration
app.delete("/jira/disconnect", async (c) => {
  const user = await getAuthUser(c.req.raw)
  if (!user) return c.json({ error: "Unauthorized" }, 401)

  try {
    // Atlassian has no revoke endpoint, just delete the record
    const { error: dbError } = await supabaseAdmin
      .from("integrations")
      .delete()
      .eq("owner_id", user.id)
      .eq("provider", "jira")

    if (dbError) return c.json({ error: dbError.message }, 500)

    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: String(e) }, 500)
  }
})

// POST /jira/proxy — Proxies API requests to Jira Cloud (bypasses CORS)
app.post("/jira/proxy", async (c) => {
  const user = await getAuthUser(c.req.raw)
  if (!user) return c.json({ error: "Unauthorized" }, 401)

  try {
    const { cloudId, path, method, body } = await c.req.json<{
      cloudId: string
      path: string
      method?: string
      body?: unknown
    }>()

    // Get Jira token
    const { data: integration } = await supabaseAdmin
      .from("integrations")
      .select("access_token")
      .eq("owner_id", user.id)
      .eq("provider", "jira")
      .single()

    if (!integration?.access_token) {
      return c.json({ error: "Jira not connected" }, 401)
    }

    const jiraUrl = `https://api.atlassian.com/ex/jira/${cloudId}${path}`
    const headers: Record<string, string> = {
      Authorization: `Bearer ${integration.access_token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    }

    const res = await fetch(jiraUrl, {
      method: method || "GET",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      const err = await res.text()
      console.error(`Jira proxy error: ${method || "GET"} ${path} → ${res.status}`, err)
      return c.json({ error: err }, res.status)
    }

    // Some Jira endpoints return 204 with no body
    if (res.status === 204) {
      return c.json({ success: true })
    }

    const data = await res.json()
    return c.json(data)
  } catch (e) {
    return c.json({ error: String(e) }, 500)
  }
})

// ─── Jira Webhooks ──────────────────────────────────────────────────

// POST /jira/webhook — Receives Jira webhook events
app.post("/jira/webhook", async (c) => {
  try {
    const body = await c.req.json()
    const { webhookEvent, issue, comment, changelog, user: actor } = body

    // Validate with secret query param if present
    const secret = new URL(c.req.url).searchParams.get("secret")
    const expectedSecret = Deno.env.get("JIRA_WEBHOOK_SECRET") ?? ""
    if (expectedSecret && secret !== expectedSecret) {
      return c.json({ error: "Invalid secret" }, 403)
    }

    const projectKey = issue?.fields?.project?.key ?? null

    // Handle issue events
    if (webhookEvent?.startsWith("jira:issue_")) {
      const action = webhookEvent.replace("jira:issue_", "") // created, updated, deleted

      // Determine what changed from changelog
      let statusName = issue?.fields?.status?.name ?? null
      let statusColor = null
      let assigneeName = issue?.fields?.assignee?.displayName ?? null
      let assigneeId = issue?.fields?.assignee?.accountId ?? null

      if (changelog?.items) {
        for (const item of changelog.items) {
          if (item.field === "status") {
            statusName = item.toString
          }
          if (item.field === "assignee") {
            assigneeName = item.toString
          }
        }
      }

      // Map Jira status category to a color
      const categoryKey = issue?.fields?.status?.statusCategory?.key
      const categoryColors: Record<string, string> = {
        new: "#64748b",
        indeterminate: "#3b82f6",
        done: "#10b981",
      }
      statusColor = categoryColors[categoryKey] ?? "#94a3b8"

      await supabaseAdmin.from("jira_events").insert({
        action,
        type: "Issue",
        jira_id: issue?.id ?? null,
        title: issue?.fields?.summary ?? "",
        identifier: issue?.key ?? null,
        status_name: statusName,
        status_color: statusColor,
        assignee_id: assigneeId,
        assignee_name: assigneeName,
        project_key: projectKey,
        actor_id: actor?.accountId ?? null,
        actor_name: actor?.displayName ?? null,
        url: issue?.self ? `https://${body.issue?.self?.split("/rest/")?.[0]?.split("//")[1]}/browse/${issue.key}` : null,
        updated_at: issue?.fields?.updated ?? new Date().toISOString(),
        raw_data: body,
      })
    }

    // Handle comment events
    if (webhookEvent?.startsWith("comment_")) {
      const action = webhookEvent.replace("comment_", "") // created, updated, deleted

      await supabaseAdmin.from("jira_events").insert({
        action,
        type: "Comment",
        jira_id: comment?.id ?? null,
        title: comment?.body?.substring(0, 500) ?? "",
        identifier: issue?.key ?? null,
        project_key: projectKey,
        actor_id: comment?.author?.accountId ?? actor?.accountId ?? null,
        actor_name: comment?.author?.displayName ?? actor?.displayName ?? null,
        url: comment?.self ?? null,
        updated_at: comment?.updated ?? comment?.created ?? new Date().toISOString(),
        raw_data: body,
      })
    }

    return c.json({ success: true })
  } catch (e) {
    console.error("Jira webhook error:", e)
    return c.json({ error: String(e) }, 500)
  }
})

// DELETE /delete-account — Authenticated, delete user and cleanup KV
app.delete("/delete-account", async (c) => {
  const user = await getAuthUser(c.req.raw)
  if (!user) return c.json({ error: "Unauthorized" }, 401)

  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    if (error) return c.json({ error: error.message }, 500)

    // Best-effort cleanup of KV data
    try {
      const entries = await kvList<unknown>(["time_entry", user.id])
      for (const e of entries) {
        await kvDelete(e.key)
      }
    } catch {
      // Ignore cleanup errors
    }

    return c.json({ ok: true })
  } catch (e) {
    return c.json({ error: String(e) }, 500)
  }
})

Deno.serve(app.fetch)
