import type { Access, FieldAccess } from 'payload'

type Role = 'OWNER' | 'STAFF'
const roleOf = (user: unknown): Role | null => (user as { role?: Role } | null)?.role ?? null

export const anyone: Access = () => true
export const loggedIn: Access = ({ req }) => Boolean(req.user)
export const ownerOnly: Access = ({ req }) => roleOf(req.user) === 'OWNER'
export const ownerOnlyField: FieldAccess = ({ req }) => roleOf(req.user) === 'OWNER'
export const isOwner = (user: unknown) => roleOf(user) === 'OWNER'
