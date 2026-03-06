let kv: Deno.Kv | null = null

export async function getKv(): Promise<Deno.Kv> {
  if (!kv) kv = await Deno.openKv()
  return kv
}

export async function kvGet<T>(key: Deno.KvKey): Promise<T | null> {
  const store = await getKv()
  const result = await store.get<T>(key)
  return result.value
}

export async function kvSet<T>(key: Deno.KvKey, value: T): Promise<void> {
  const store = await getKv()
  await store.set(key, value)
}

export async function kvDelete(key: Deno.KvKey): Promise<void> {
  const store = await getKv()
  await store.delete(key)
}

export async function kvList<T>(
  prefix: Deno.KvKey
): Promise<{ key: Deno.KvKey; value: T }[]> {
  const store = await getKv()
  const results: { key: Deno.KvKey; value: T }[] = []
  for await (const entry of store.list<T>({ prefix })) {
    results.push({ key: entry.key, value: entry.value })
  }
  return results
}
