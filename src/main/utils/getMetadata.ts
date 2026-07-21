import { parse } from 'muninn'

import databaseManager from '@main/database/DatabaseManager'
import configs from '@main/configs'
import { normalizeWhatsAppUrl } from '@main/import/parseWhatsApp'

import classifyLink from './classifyLink'
import {
  normalizeStringList,
  replaceControlCharacters,
  serializeStringList
} from './linkStringList'
import { safeFetchRemote } from './safeRemoteFetch'

const HTML_CONTENT_TYPES = ['text/html', 'application/xhtml+xml']
const ICON_CONTENT_TYPES = [
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/vnd.microsoft.icon',
  'image/webp',
  'image/x-icon',
  'application/octet-stream'
]
const MAX_ICON_BYTES = 128 * 1024

interface ParsedPageMetadata {
  title: string | null
  description: string | null
  tags: string[]
  iconCandidates: string[]
  productPrice: string | null
  readTime: string | null
}

interface RawPageMetadata {
  title?: unknown
  openGraphTitle?: unknown
  twitterTitle?: unknown
  description?: unknown
  openGraphDescription?: unknown
  twitterDescription?: unknown
  keywords?: unknown
  articleTags?: unknown
  iconCandidates?: unknown
  baseHref?: unknown
  productPrice?: unknown
  readTime?: unknown
}

const sanitizeText = (value: unknown, maxLength: number): string | null => {
  if (typeof value !== 'string') return null

  const sanitized = replaceControlCharacters(value).replace(/\s+/gu, ' ').trim()

  return sanitized ? sanitized.slice(0, maxLength) : null
}

const firstText = (values: unknown[], maxLength: number): string | null => {
  for (const value of values) {
    const sanitized = sanitizeText(value, maxLength)
    if (sanitized) return sanitized
  }

  return null
}

const parseTags = (keywords: unknown, articleTags: unknown): string[] => {
  const values = [
    ...(typeof keywords === 'string' ? keywords.split(',') : []),
    ...(Array.isArray(articleTags) ? articleTags : [])
  ]

  return normalizeStringList(values, { maxItems: 24, maxLength: 60 })
}

const resolveIconCandidates = (
  rawCandidates: unknown,
  rawBaseHref: unknown,
  finalUrl: URL
): string[] => {
  const candidates = Array.isArray(rawCandidates) ? rawCandidates : []
  let baseUrl = finalUrl

  if (typeof rawBaseHref === 'string') {
    try {
      const parsedBase = new URL(rawBaseHref, finalUrl)
      if (['http:', 'https:'].includes(parsedBase.protocol)) baseUrl = parsedBase
    } catch {
      // Ignore invalid base URLs and resolve icons against the final page URL.
    }
  }

  const resolved = candidates
    .filter((candidate): candidate is string => typeof candidate === 'string')
    .map((candidate) => {
      try {
        const url = new URL(candidate, baseUrl)
        return ['http:', 'https:'].includes(url.protocol) ? url.href : null
      } catch {
        return null
      }
    })
    .filter((candidate): candidate is string => Boolean(candidate))

  resolved.push(new URL('/favicon.ico', finalUrl).href)

  return [...new Set(resolved)].slice(0, 3)
}

export const extractPageMetadata = (
  html: string,
  finalUrl: URL,
  domainConfig = configs
): ParsedPageMetadata => {
  const domain = finalUrl.hostname.toLowerCase().replace(/^www\./u, '')
  const config = {
    schema: {
      title: { selector: 'title', initial: null },
      openGraphTitle: {
        selector: 'meta[property="og:title"]',
        attr: 'content',
        initial: null
      },
      twitterTitle: {
        selector: 'meta[name="twitter:title"]',
        attr: 'content',
        initial: null
      },
      description: {
        selector: 'meta[name="description"]',
        attr: 'content',
        initial: null
      },
      openGraphDescription: {
        selector: 'meta[property="og:description"]',
        attr: 'content',
        initial: null
      },
      twitterDescription: {
        selector: 'meta[name="twitter:description"]',
        attr: 'content',
        initial: null
      },
      keywords: {
        selector: 'meta[name="keywords"]',
        attr: 'content',
        initial: null
      },
      articleTags: {
        selector: 'meta[property="article:tag"] @ content | array',
        initial: []
      },
      iconCandidates: {
        selector:
          'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"] @ href | array',
        initial: []
      },
      baseHref: { selector: 'base', attr: 'href', initial: null },
      productPrice: domainConfig.productPrice[domain] || { fill: null },
      readTime: domainConfig.readTime[domain] || { fill: null }
    }
  }
  const raw = parse(html, config) as unknown as RawPageMetadata

  return {
    title: firstText([raw.openGraphTitle, raw.twitterTitle, raw.title], 300),
    description: firstText(
      [raw.openGraphDescription, raw.twitterDescription, raw.description],
      1_500
    ),
    tags: parseTags(raw.keywords, raw.articleTags),
    iconCandidates: resolveIconCandidates(raw.iconCandidates, raw.baseHref, finalUrl),
    productPrice: sanitizeText(raw.productPrice, 100),
    readTime: sanitizeText(raw.readTime, 100)
  }
}

const detectIconMime = (body: Buffer): string | null => {
  if (body.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png'
  }
  if (body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff) return 'image/jpeg'
  if (body.subarray(0, 4).toString('ascii') === 'GIF8') return 'image/gif'
  if (
    body.subarray(0, 4).toString('ascii') === 'RIFF' &&
    body.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp'
  }
  if (body[0] === 0x00 && body[1] === 0x00 && body[2] === 0x01 && body[3] === 0x00) {
    return 'image/x-icon'
  }

  return null
}

const fetchIconDataUrl = async (candidates: string[]): Promise<string | null> => {
  for (const candidate of candidates) {
    try {
      const response = await safeFetchRemote(candidate, {
        acceptedContentTypes: ICON_CONTENT_TYPES,
        maxBytes: MAX_ICON_BYTES,
        maxRedirects: 2,
        timeoutMs: 4_000
      })
      const mime = detectIconMime(response.body)

      if (mime) return `data:${mime};base64,${response.body.toString('base64')}`
    } catch {
      // Try the next declared icon or the origin favicon fallback.
    }
  }

  return null
}

const updateFallbackGroups = async (link: Link): Promise<void> => {
  const { Link } = databaseManager.models
  if (!Link) throw new Error('Link model is not initialized.')

  const groups = classifyLink(link)
  await Link.update({ groups: serializeStringList(groups) }, { where: { id: link.id } })
}

const getMetadata = async (link: Link): Promise<void> => {
  const { Link } = databaseManager.models
  if (!Link) throw new Error('Link model is not initialized.')

  const normalized = normalizeWhatsAppUrl(link.url)
  if (!normalized || normalized.sensitive) {
    await updateFallbackGroups(link)
    throw new Error('Metadata previews are disabled for invalid or sensitive links.')
  }

  try {
    const page = await safeFetchRemote(normalized.url, {
      acceptedContentTypes: HTML_CONTENT_TYPES
    })
    const parsed = extractPageMetadata(page.body.toString('utf8'), page.finalUrl)
    const title = link.title || parsed.title
    const description = parsed.description || link.description
    const tags = parsed.tags.length > 0 ? parsed.tags : link.tags
    const groups = classifyLink({ url: link.url, title, description, tags })
    const shouldFetchIcon = !link.iconUrl || /^https?:/i.test(link.iconUrl)
    const iconUrl = shouldFetchIcon ? await fetchIconDataUrl(parsed.iconCandidates) : link.iconUrl

    await Link.update(
      {
        ...(link.title ? {} : { title: parsed.title }),
        description,
        ...(iconUrl ? { iconUrl } : {}),
        tags: serializeStringList(tags),
        groups: serializeStringList(groups),
        productPrice: parsed.productPrice,
        readTime: parsed.readTime
      },
      { where: { id: link.id } }
    )
  } catch {
    await updateFallbackGroups(link)
    throw new Error('Failed to fetch metadata.')
  }
}

export default getMetadata
