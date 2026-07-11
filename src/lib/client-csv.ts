/**
 * CSV import helpers for the Clients module.
 *
 * Runs client-side: Papa Parse produces an array of raw row objects keyed by
 * whatever headers the user's file has. We normalize those headers to the
 * canonical `CreateClientInput` keys before sending the rows to the server.
 *
 * The server re-validates everything (owner_id is stamped from the session,
 * status is coerced, name is required) — this module only shapes the data and
 * powers the preview UI.
 */
import type { CreateClientInput, ClientStatus } from '@/server/clients'

/** Canonical headers we accept in a CSV, and their common aliases. */
const HEADER_ALIASES: Record<string, string[]> = {
  name: ['name', 'full name', 'fullname', 'client', 'client name', 'contact'],
  email: ['email', 'e-mail', 'email address', 'mail'],
  phone: ['phone', 'tel', 'telephone', 'mobile', 'contact number', 'number'],
  company: ['company', 'organization', 'organisation', 'org', 'business'],
  website: ['website', 'site', 'url', 'web'],
  industry: ['industry', 'sector', 'vertical'],
  status: ['status', 'client status'],
  notes: ['notes', 'note', 'description', 'comment', 'comments'],
  tags: ['tags', 'tag', 'labels', 'label'],
  date_of_birth: ['date of birth', 'dob', 'birthday', 'birth date'],
}

/**
 * Maps a raw CSV header (any case/spacing) to a canonical field key, or null
 * if the header isn't recognized.
 */
export function normalizeHeader(
  header: string,
): keyof CreateClientInput | null {
  const clean = header.trim().toLowerCase()
  for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(clean)) return canonical as keyof CreateClientInput
  }
  return null
}

const VALID_STATUSES: ClientStatus[] = ['active', 'inactive', 'churned']

export interface ParsedRow {
  /** Normalized client input, or null if the row is unusable (e.g. no name). */
  client: CreateClientInput | null
  /** Why the row was skipped, if it was. */
  reason?: string
}

/**
 * Maps a raw Papa Parse row object (keyed by the file's original headers) to a
 * `CreateClientInput`. Rows without a name are returned with `client: null`
 * and a reason string for the preview UI.
 */
export function mapCsvRow(raw: Record<string, string>): ParsedRow {
  // Build a normalized object keyed by canonical field names.
  const normalized: Record<string, string> = {}
  const unmapped: string[] = []
  for (const [header, value] of Object.entries(raw)) {
    const key = normalizeHeader(header)
    if (key) {
      // First occurrence wins — avoids a duplicate header clobbering good data.
      if (normalized[key] === undefined) normalized[key] = value?.trim() ?? ''
    } else {
      unmapped.push(header)
    }
  }

  const name = normalized.name
  if (!name) {
    return { client: null, reason: 'Missing name' }
  }

  // Coerce status → default 'active' if missing or invalid.
  let status: ClientStatus = 'active'
  if (normalized.status) {
    const lower = normalized.status.toLowerCase()
    status = VALID_STATUSES.includes(lower as ClientStatus)
      ? (lower as ClientStatus)
      : 'active'
  }

  // Split tags on pipe or comma, strip empties and leading #.
  let tags: string[] = []
  if (normalized.tags) {
    tags = normalized.tags
      .split(/[|,]/)
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean)
  }

  const client: CreateClientInput = {
    name,
    status,
    ...(normalized.email ? { email: normalized.email } : {}),
    ...(normalized.phone ? { phone: normalized.phone } : {}),
    ...(normalized.company ? { company: normalized.company } : {}),
    ...(normalized.website ? { website: normalized.website } : {}),
    ...(normalized.industry ? { industry: normalized.industry } : {}),
    ...(normalized.notes ? { notes: normalized.notes } : {}),
    ...(tags.length > 0 ? { tags } : {}),
    ...(normalized.date_of_birth
      ? { date_of_birth: normalized.date_of_birth }
      : {}),
  }

  return { client }
}

/** Canonical CSV template users can download to see the expected columns. */
export const TEMPLATE_CSV = `name,email,phone,company,website,industry,status,notes,tags,date_of_birth
Jane Doe,jane@example.com,+60123456789,Acme Corp,https://acme.com,Real Estate,active,Prefers WhatsApp follow-ups,vip|investor,1990-05-15
`
