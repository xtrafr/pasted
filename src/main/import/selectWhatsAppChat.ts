import fs from 'fs'

import { dialog } from 'electron'

import databaseManager from '@main/database/DatabaseManager'

import {
  isWhatsAppExport,
  MAX_WHATSAPP_FILE_BYTES,
  normalizeWhatsAppUrl,
  parseWhatsAppExport,
  type WhatsAppLinkCandidate
} from './parseWhatsApp'

export interface WhatsAppReviewCandidate extends WhatsAppLinkCandidate {
  alreadySaved: boolean
}

export type WhatsAppSelectionResult =
  | { status: 'cancelled' }
  | {
      status: 'ready' | 'empty'
      candidates: WhatsAppReviewCandidate[]
      detectedWhatsApp: boolean
      duplicateInFile: number
      duplicateExisting: number
      invalid: number
      truncated: boolean
    }

export const prepareWhatsAppReview = (
  contents: string,
  existingUrls: Set<string>
): Exclude<WhatsAppSelectionResult, { status: 'cancelled' }> => {
  const parsed = parseWhatsAppExport(contents)
  const candidates = parsed.candidates.map((candidate) => ({
    ...candidate,
    alreadySaved: existingUrls.has(candidate.normalizedUrl)
  }))
  const duplicateExisting = candidates.filter((candidate) => candidate.alreadySaved).length

  return {
    status: candidates.length === 0 ? 'empty' : 'ready',
    candidates,
    detectedWhatsApp: isWhatsAppExport(contents),
    duplicateInFile: parsed.duplicateCount,
    duplicateExisting,
    invalid: parsed.invalidCount,
    truncated: parsed.truncated
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

const readWhatsAppExport = async (filePath: string): Promise<string> => {
  const file = await fs.promises.open(filePath, 'r')

  try {
    const stats = await file.stat()
    if (!stats.isFile()) throw new Error('Choose a WhatsApp text export.')
    if (stats.size > MAX_WHATSAPP_FILE_BYTES) {
      throw new Error('The WhatsApp export is larger than the 25 MB limit.')
    }

    const chunks: Buffer[] = []
    let totalBytes = 0

    while (totalBytes <= MAX_WHATSAPP_FILE_BYTES) {
      const remaining = MAX_WHATSAPP_FILE_BYTES + 1 - totalBytes
      const chunk = Buffer.allocUnsafe(Math.min(64 * 1024, remaining))
      const { bytesRead } = await file.read(chunk, 0, chunk.length, null)

      if (bytesRead === 0) break
      chunks.push(chunk.subarray(0, bytesRead))
      totalBytes += bytesRead
    }

    if (totalBytes > MAX_WHATSAPP_FILE_BYTES) {
      throw new Error('The WhatsApp export is larger than the 25 MB limit.')
    }

    return Buffer.concat(chunks, totalBytes).toString('utf8')
  } finally {
    await file.close()
  }
}

const selectWhatsAppChat = async (): Promise<WhatsAppSelectionResult> => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Choose a WhatsApp chat export',
    buttonLabel: 'Review links',
    filters: [{ name: 'WhatsApp text export', extensions: ['txt'] }],
    properties: ['openFile']
  })

  if (canceled || filePaths.length === 0) return { status: 'cancelled' }

  const filePath = filePaths[0]
  const contents = await readWhatsAppExport(filePath)
  const existingUrls = await getExistingUrls()

  return prepareWhatsAppReview(contents, existingUrls)
}

export default selectWhatsAppChat
