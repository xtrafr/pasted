import addLink from '@main/utils/addLink'
import getMetadata from '@main/utils/getMetadata'
import databaseManager from '@main/database/DatabaseManager'

import { MAX_WHATSAPP_CANDIDATES, normalizeWhatsAppUrl } from './parseWhatsApp'

export interface WhatsAppImportSelection {
  url: string
}

export interface WhatsAppImportResult {
  imported: number
  skipped: number
  failed: number
  metadataEnriched: number
  metadataFailed: number
  metadataSkipped: number
}

const MAX_METADATA_ENRICHMENTS = 100
const METADATA_CONCURRENCY = 6

interface MetadataCandidate {
  link: Link
  sensitive: boolean
}

const enrichMetadata = async (
  candidates: MetadataCandidate[]
): Promise<
  Pick<WhatsAppImportResult, 'metadataEnriched' | 'metadataFailed' | 'metadataSkipped'>
> => {
  const eligible = candidates.filter((candidate) => !candidate.sensitive)
  const queue = eligible.slice(0, MAX_METADATA_ENRICHMENTS)
  let nextIndex = 0
  let metadataEnriched = 0
  let metadataFailed = 0

  const worker = async (): Promise<void> => {
    while (nextIndex < queue.length) {
      const candidate = queue[nextIndex]
      nextIndex += 1

      try {
        await getMetadata(candidate.link)
        metadataEnriched += 1
      } catch {
        metadataFailed += 1
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(METADATA_CONCURRENCY, queue.length) }, () => worker())
  )

  return {
    metadataEnriched,
    metadataFailed,
    metadataSkipped: candidates.length - queue.length
  }
}

const getExistingUrls = async (): Promise<Set<string>> => {
  const { Link } = databaseManager.models
  if (!Link) throw new Error('Open a Pasted library before importing a chat.')

  const links = await Link.findAll({ attributes: ['url'] })

  return new Set(
    links
      .map((link) => normalizeWhatsAppUrl(String(link.get('url')))?.url)
      .filter((url): url is string => Boolean(url))
  )
}

const importWhatsAppLinks = async (
  selection: WhatsAppImportSelection[]
): Promise<WhatsAppImportResult> => {
  if (!Array.isArray(selection) || selection.length > MAX_WHATSAPP_CANDIDATES) {
    throw new Error('The WhatsApp import selection is not valid.')
  }

  const existingUrls = await getExistingUrls()
  const selectedUrls = new Set<string>()
  let imported = 0
  let skipped = 0
  let failed = 0
  const metadataCandidates: MetadataCandidate[] = []

  for (const item of selection) {
    if (!item || typeof item.url !== 'string') {
      failed += 1
      continue
    }

    const normalized = normalizeWhatsAppUrl(item.url)

    if (!normalized || selectedUrls.has(normalized.url) || existingUrls.has(normalized.url)) {
      skipped += 1
      continue
    }

    selectedUrls.add(normalized.url)

    try {
      const link = await addLink({ url: normalized.url })
      existingUrls.add(normalized.url)
      metadataCandidates.push({ link, sensitive: normalized.sensitive })
      imported += 1
    } catch {
      failed += 1
    }
  }

  const metadataResult = await enrichMetadata(metadataCandidates)

  return { imported, skipped, failed, ...metadataResult }
}

export default importWhatsAppLinks
