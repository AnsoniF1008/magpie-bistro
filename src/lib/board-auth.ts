import 'server-only'

import { payloadClient } from './data'

export type BoardUser = { id: string | number; role: 'OWNER' | 'STAFF'; email: string }

/** Resolves the signed-in admin user from the Payload session cookie, or null. */
export async function boardUser(req: Request) {
  const payload = await payloadClient()
  const { user } = await payload.auth({ headers: req.headers })
  if (!user) return { payload, user: null }
  return { payload, user: user as unknown as BoardUser & typeof user }
}

export const unauthorized = () => Response.json({ error: 'Sign in to the admin first.' }, { status: 401 })
