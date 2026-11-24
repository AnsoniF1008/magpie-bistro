/** Converts a stringified document id to a Payload relation id (number when numeric, string otherwise). */
export function toRelationId(id: string): number | string {
  if (/^\d+$/.test(id)) {
    const n = Number(id)
    if (Number.isSafeInteger(n)) return n
  }
  return id
}
