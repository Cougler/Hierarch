import { Hono } from "https://deno.land/x/hono@v3.12.0/mod.ts"
import { cors, logger } from "https://deno.land/x/hono@v3.12.0/middleware.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import {
  kvDelete,
  kvList,
  kvSet,
} from "./kv_store.tsx"

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

const app = new Hono()

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
