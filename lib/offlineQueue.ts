import type { SupabaseClient } from '@supabase/supabase-js'

// A serializable Supabase mutation. Kept generic so one code path handles
// both the immediate online write and the offline replay.
export interface QueuedOp {
  id: string // queue entry id
  key: string // natural identity — enqueuing a matching key replaces the old op (latest wins)
  table: string
  op: 'insert' | 'upsert' | 'update'
  payload: Record<string, unknown>
  match?: Record<string, unknown> // for update .eq(...)
  onConflict?: string
  ts: number
}

const DB_NAME = 'twd-offline'
const STORE = 'ops'

type Listener = (count: number) => void
const listeners = new Set<Listener>()

export function subscribe(cb: Listener): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

async function notify() {
  const count = await queueCount()
  listeners.forEach(l => l(count))
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    db =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        const req = fn(t.objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
  )
}

export async function allOps(): Promise<QueuedOp[]> {
  if (typeof indexedDB === 'undefined') return []
  const ops = await tx<QueuedOp[]>('readonly', s => s.getAll() as IDBRequest<QueuedOp[]>)
  return ops.sort((a, b) => a.ts - b.ts)
}

export async function queueCount(): Promise<number> {
  if (typeof indexedDB === 'undefined') return 0
  return tx<number>('readonly', s => s.count())
}

async function putOp(op: QueuedOp) {
  await tx('readwrite', s => s.put(op))
}

async function removeOp(id: string) {
  await tx('readwrite', s => s.delete(id))
}

export async function enqueue(op: Omit<QueuedOp, 'id' | 'ts'>): Promise<void> {
  if (typeof indexedDB === 'undefined') return
  // Latest write for a given key wins — drop any earlier queued op with it.
  const existing = await allOps()
  for (const e of existing) {
    if (e.key === op.key) await removeOp(e.id)
  }
  await putOp({ ...op, id: crypto.randomUUID(), ts: Date.now() })
  await notify()
}

async function runOp(client: SupabaseClient, op: QueuedOp): Promise<{ error: unknown }> {
  const table = client.from(op.table)
  if (op.op === 'insert') return await table.insert(op.payload)
  if (op.op === 'upsert')
    return await table.upsert(op.payload, op.onConflict ? { onConflict: op.onConflict } : undefined)
  // update
  let u = table.update(op.payload)
  for (const [k, v] of Object.entries(op.match ?? {})) u = u.eq(k, v)
  return await u
}

export interface WriteResult {
  ok?: boolean
  queued?: boolean
  error?: unknown
}

// Try the write immediately when online; on a network failure (or when
// offline) persist it to replay later. Server-side errors are NOT queued —
// those are data problems the caller should surface.
export async function writeOrQueue(
  client: SupabaseClient,
  op: Omit<QueuedOp, 'id' | 'ts'>
): Promise<WriteResult> {
  const online = typeof navigator === 'undefined' || navigator.onLine
  if (online) {
    try {
      const { error } = await runOp(client, { ...op, id: '', ts: 0 })
      if (!error) return { ok: true }
      return { error }
    } catch {
      // network failed despite navigator.onLine — fall through to queue
    }
  }
  await enqueue(op)
  return { queued: true }
}

// Drain the queue in order. Stops on the first network failure (keeps the op
// for a later retry); drops ops the server rejects so we never loop forever.
// Returns the number successfully synced.
export async function syncQueue(client: SupabaseClient): Promise<number> {
  if (typeof indexedDB === 'undefined') return 0
  const ops = await allOps()
  let synced = 0
  for (const op of ops) {
    try {
      const { error } = await runOp(client, op)
      if (error) {
        // Server reachable but rejected the write — drop it, don't block others.
        console.error('Dropping un-syncable op', op.table, error)
      }
      await removeOp(op.id)
      synced++
    } catch {
      // Network still down — stop and try again on the next online event.
      break
    }
  }
  if (synced > 0) await notify()
  return synced
}
