const INTERNAL_ROUTE_HEADER = 'x-hod-internal-token'

export function getInternalRouteToken(): string | null {
  const explicit = process.env.INTERNAL_ROUTE_TOKEN ?? process.env.INTERNAL_JOB_TOKEN
  if (explicit && explicit.trim().length > 0) return explicit
  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (fallback && fallback.trim().length > 0) return fallback
  return null
}

export function buildInternalHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...(extra ?? {}) }
  const token = getInternalRouteToken()
  if (token) headers[INTERNAL_ROUTE_HEADER] = token
  return headers
}

export function isInternalRequest(request: Request): boolean {
  const token = getInternalRouteToken()
  if (!token) return false
  return request.headers.get(INTERNAL_ROUTE_HEADER) === token
}

export { INTERNAL_ROUTE_HEADER }
