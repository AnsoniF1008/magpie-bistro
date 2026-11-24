import 'server-only'

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN

const limiters = new Map<string, Ratelimit>()
const memory = new Map<string, { count: number; resetAt: number }>()

/**
 * Allows `max` hits per `windowSec` for a key (usually route + IP).
 * Uses Upstash Redis when configured; otherwise an in-memory window, which is
 * fine for local development and a single server.
 */
export async function rateLimit(key: string, max: number, windowSec: number): Promise<{ ok: boolean; retryAfterSec: number }> {
  if (url && token) {
    const id = `${max}/${windowSec}`
    let limiter = limiters.get(id)
    if (!limiter) {
      limiter = new Ratelimit({ redis: new Redis({ url, token }), limiter: Ratelimit.slidingWindow(max, `${windowSec} s`), prefix: 'magpie' })
      limiters.set(id, limiter)
    }
    const r = await limiter.limit(key)
    return { ok: r.success, retryAfterSec: Math.max(0, Math.ceil((r.reset - Date.now()) / 1000)) }
  }
  const now = Date.now()
  const hit = memory.get(key)
  if (!hit || hit.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowSec * 1000 })
    if (memory.size > 5000) for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k)
    return { ok: true, retryAfterSec: 0 }
  }
  hit.count += 1
  return { ok: hit.count <= max, retryAfterSec: Math.ceil((hit.resetAt - now) / 1000) }
}

export function clientIp(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || 'local'
}
