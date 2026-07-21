import addLink from '@main/utils/addLink'
import databaseManager from '@main/database/DatabaseManager'

import { MAX_WHATSAPP_CANDIDATES, normalizeWhatsAppUrl } from './parseWhatsApp'

export interface WhatsAppImportSelection {
  url: string
}

export interface WhatsAppImportResult {
  imported: number
  skipped: number
  failed: number
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
      await addLink({ url: normalized.url })
      existingUrls.add(normalized.url)
      imported += 1
    } catch {
      failed += 1
    }
  }

  return { imported, skipped, failed }
}

export default importWhatsAppLinks
