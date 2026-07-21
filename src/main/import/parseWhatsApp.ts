const INVISIBLE_UNICODE = /[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g
const EXPLICIT_URL = /https?:\/\/[^\s<>"'`]+/giu
const NON_HTTP_SCHEME_URL = /(?<![a-z0-9+.-])(?!https?:)[a-z][a-z0-9+-]*:(?:\/\/)?[^\s<>"'`]+/giu
const SCHEMELESS_URL =
  /(?<![@\w])(?:www\.)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(?::\d{1,5})?(?:[/?#][^\s<>"'`]*)?/giu

export const MAX_WHATSAPP_FILE_BYTES = 25 * 1024 * 1024
export const MAX_WHATSAPP_CANDIDATES = 10_000
export const MAX_WHATSAPP_URL_LENGTH = 8_192

const BRACKETED_MESSAGE =
  /^\s*\[(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]m)?)\]\s*/i
const DASHED_MESSAGE =
  /^\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]m)?)\s+-\s+/i

const TRACKING_PARAMETERS = new Set([
  'fbclid',
  'gclid',
  'dclid',
  'msclkid',
  'mc_cid',
  'mc_eid',
  'igshid',
  'ref_src'
])

const SENSITIVE_PARAMETER =
  /(?:^|[_-])(access[_-]?token|api[_-]?key|auth|authorization|code|credential|jwt|key|password|secret|session(?:[_-]?id)?|sig|signature|token)(?:$|[_-])/i
const SENSITIVE_PATH =
  /\/(?:api\/)?(?:auth|invite|invites|session|share|shared|token|webhook|webhooks)(?:\/|$)/i

export interface WhatsAppLinkCandidate {
  id: string
  url: string
  normalizedUrl: string
  sourceDate: string | null
  sensitive: boolean
}

export interface WhatsAppParseResult {
  candidates: WhatsAppLinkCandidate[]
  duplicateCount: number
  invalidCount: number
  lineCount: number
  truncated: boolean
}

const trimUrlPunctuation = (value: string): string => {
  let result = value.replace(/[.,!?;:'"…]+$/u, '')

  const pairs: Array<[string, string]> = [
    ['(', ')'],
    ['[', ']'],
    ['{', '}']
  ]

  for (const [open, close] of pairs) {
    while (result.endsWith(close)) {
      const openCount = result.split(open).length - 1
      const closeCount = result.split(close).length - 1

      if (closeCount <= openCount) break
      result = result.slice(0, -1)
    }
  }

  return result
}

const getMessageDate = (line: string): string | null => {
  const match = line.match(BRACKETED_MESSAGE) ?? line.match(DASHED_MESSAGE)
  return match?.[1]?.trim() ?? null
}

export const normalizeWhatsAppUrl = (
  rawValue: string
): { url: string; sensitive: boolean } | null => {
  const value = trimUrlPunctuation(rawValue)
  if (!value || value.length > MAX_WHATSAPP_URL_LENGTH) return null

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`

  try {
    const parsed = new URL(withProtocol)

    if (!['http:', 'https:'].includes(parsed.protocol)) return null
    if (!parsed.hostname.includes('.') || parsed.hostname.length > 253) return null
    if (parsed.username || parsed.password) return null

    parsed.protocol = parsed.protocol.toLowerCase()
    parsed.hostname = parsed.hostname.toLowerCase()
    parsed.hash = ''

    for (const key of [...parsed.searchParams.keys()]) {
      if (key.toLowerCase().startsWith('utm_') || TRACKING_PARAMETERS.has(key.toLowerCase())) {
        parsed.searchParams.delete(key)
      }
    }

    if (parsed.pathname !== '/') {
      parsed.pathname = parsed.pathname.replace(/\/+$/u, '') || '/'
    }

    const sensitive =
      [...parsed.searchParams.keys()].some((key) => SENSITIVE_PARAMETER.test(key)) ||
      SENSITIVE_PATH.test(parsed.pathname) ||
      /(?:^|\.)chat\.whatsapp\.com$/i.test(parsed.hostname) ||
      (/(?:^|\.)hooks\.slack\.com$/i.test(parsed.hostname) &&
        parsed.pathname.startsWith('/services/'))

    return { url: parsed.toString(), sensitive }
  } catch {
    return null
  }
}

const extractLineUrls = (line: string): string[] => {
  const withoutUnsafeSchemes = line.replace(NON_HTTP_SCHEME_URL, ' ')
  const explicit = [...withoutUnsafeSchemes.matchAll(EXPLICIT_URL)].map((match) => match[0])
  const withoutExplicit = withoutUnsafeSchemes.replace(EXPLICIT_URL, ' ')
  const schemeless = [...withoutExplicit.matchAll(SCHEMELESS_URL)].map((match) => match[0])

  return [...explicit, ...schemeless]
}

export const parseWhatsAppExport = (input: string): WhatsAppParseResult => {
  const normalizedInput = input.replace(INVISIBLE_UNICODE, '')
  const lines = normalizedInput.split(/\r?\n/u)
  const candidates: WhatsAppLinkCandidate[] = []
  const seen = new Set<string>()
  let currentSourceDate: string | null = null
  let duplicateCount = 0
  let invalidCount = 0
  let truncated = false

  for (const line of lines) {
    currentSourceDate = getMessageDate(line) ?? currentSourceDate

    for (const rawUrl of extractLineUrls(line)) {
      const parsed = normalizeWhatsAppUrl(rawUrl)
      if (!parsed) {
        invalidCount += 1
        continue
      }

      if (seen.has(parsed.url)) {
        duplicateCount += 1
        continue
      }

      if (candidates.length >= MAX_WHATSAPP_CANDIDATES) {
        truncated = true
        continue
      }

      seen.add(parsed.url)

      candidates.push({
        id: parsed.url,
        url: parsed.url,
        normalizedUrl: parsed.url,
        sourceDate: currentSourceDate,
        sensitive: parsed.sensitive
      })
    }
  }

  return { candidates, duplicateCount, invalidCount, lineCount: lines.length, truncated }
}

export const isWhatsAppExport = (input: string): boolean => {
  const normalizedInput = input.replace(INVISIBLE_UNICODE, '')
  const lines = normalizedInput.split(/\r?\n/u).slice(0, 100)
  const messageLines = lines.filter(
    (line) => BRACKETED_MESSAGE.test(line) || DASHED_MESSAGE.test(line)
  ).length

  return messageLines >= 1
}
