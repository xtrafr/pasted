import { beforeEach, describe, expect, it, vi } from 'vitest'

const library = vi.hoisted(() => ({
  storedUrls: new Set<string>(),
  addLink: vi.fn(),
  getMetadata: vi.fn()
}))

vi.mock('@main/database/DatabaseManager', () => ({
  default: {
    models: {
      Link: {
        findAll: vi.fn(async () =>
          [...library.storedUrls].map((url) => ({
            get: (field: string): string | undefined => (field === 'url' ? url : undefined)
          }))
        )
      }
    }
  }
}))

vi.mock('@main/utils/addLink', () => ({
  default: library.addLink
}))

vi.mock('@main/utils/getMetadata', () => ({
  default: library.getMetadata
}))

import importWhatsAppLinks from './importWhatsAppLinks'
import { prepareWhatsAppReview } from './selectWhatsAppChat'

describe('WhatsApp import', () => {
  beforeEach(() => {
    library.storedUrls.clear()
    library.addLink.mockReset()
    library.getMetadata.mockReset()
    library.getMetadata.mockResolvedValue(undefined)
    library.addLink.mockImplementation(async ({ url }: { url: string }) => {
      if (library.storedUrls.has(url)) throw new Error('Duplicate link')
      library.storedUrls.add(url)
      return { url }
    })
  })

  it('marks links that are already in the current library', () => {
    const review = prepareWhatsAppReview(
      '[1/2/25, 08:00:00] Person: https://example.com/saved?utm_source=chat\n' +
        '[1/2/25, 08:01:00] Person: https://example.org/new',
      new Set(['https://example.com/saved'])
    )

    expect(review.status).toBe('ready')
    expect(review.duplicateExisting).toBe(1)
    expect(review.candidates.map((candidate) => candidate.alreadySaved)).toEqual([true, false])
    expect(JSON.stringify(review)).not.toContain('Person')
  })

  it('imports only normalized new links and remains idempotent', async () => {
    library.storedUrls.add('https://example.com/existing')

    const firstResult = await importWhatsAppLinks([
      { url: 'https://EXAMPLE.com/existing?utm_source=chat' },
      { url: 'https://example.org/guide?utm_medium=message' },
      { url: 'https://example.org/guide' },
      { url: 'https://example.net/reference' },
      { url: 'javascript:alert(1)' }
    ])

    expect(firstResult).toEqual({
      imported: 2,
      skipped: 3,
      failed: 0,
      metadataEnriched: 2,
      metadataFailed: 0,
      metadataSkipped: 0
    })
    expect(library.addLink).toHaveBeenCalledTimes(2)

    const secondResult = await importWhatsAppLinks([
      { url: 'https://example.org/guide' },
      { url: 'https://example.net/reference' }
    ])

    expect(secondResult).toEqual({
      imported: 0,
      skipped: 2,
      failed: 0,
      metadataEnriched: 0,
      metadataFailed: 0,
      metadataSkipped: 0
    })
    expect([...library.storedUrls].sort()).toEqual([
      'https://example.com/existing',
      'https://example.net/reference',
      'https://example.org/guide'
    ])
  })

  it('keeps imported links when metadata fails and skips sensitive previews', async () => {
    library.getMetadata.mockRejectedValueOnce(new Error('Preview unavailable'))

    const result = await importWhatsAppLinks([
      { url: 'https://example.org/guide' },
      { url: 'https://example.net/article' },
      { url: 'https://service.example/invite/private-code' }
    ])

    expect(result).toEqual({
      imported: 3,
      skipped: 0,
      failed: 0,
      metadataEnriched: 1,
      metadataFailed: 1,
      metadataSkipped: 1
    })
    expect(library.getMetadata).toHaveBeenCalledTimes(2)
    expect(library.storedUrls).toHaveProperty('size', 3)
  })
})
