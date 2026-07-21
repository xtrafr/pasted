export interface WhatsAppReviewCandidate {
  id: string
  url: string
  normalizedUrl: string
  sourceDate: string | null
  sensitive: boolean
  potentiallyAdult: boolean
  alreadySaved: boolean
}

interface WhatsAppSelectionDetails {
  candidates: WhatsAppReviewCandidate[]
  detectedWhatsApp: boolean
  duplicateInFile: number
  duplicateExisting: number
  invalid: number
  truncated: boolean
}

export type WhatsAppReview = WhatsAppSelectionDetails & { status: 'ready' }

export type WhatsAppSelectionResult =
  | { status: 'cancelled' }
  | (WhatsAppSelectionDetails & { status: 'empty' })
  | WhatsAppReview

export interface WhatsAppImportResult {
  imported: number
  skipped: number
  failed: number
  metadataEnriched: number
  metadataFailed: number
  metadataSkipped: number
}
