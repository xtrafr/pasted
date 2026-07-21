import { describe, expect, it } from 'vitest'

import { isWhatsAppExport, parseWhatsAppExport } from './parseWhatsApp'

describe('parseWhatsAppExport', () => {
  it('keeps links and dates without retaining message or sender text', () => {
    const result = parseWhatsAppExport(
      '[26/12/22, 16:59:31] Alex: remember this https://example.com/video\n' +
        '[27/12/22, 09:00:00] Alex: ordinary private message'
    )

    expect(result.candidates).toEqual([
      {
        id: 'https://example.com/video',
        url: 'https://example.com/video',
        normalizedUrl: 'https://example.com/video',
        sourceDate: '26/12/22, 16:59:31',
        sensitive: false,
        potentiallyAdult: false
      }
    ])
    expect(result.invalidCount).toBe(0)
    expect(JSON.stringify(result)).not.toContain('Alex')
    expect(JSON.stringify(result)).not.toContain('ordinary private message')
  })

  it('extracts mixed-case, schemeless, punctuated, and multiline links', () => {
    const result = parseWhatsAppExport(
      '7/1/24, 9:03 PM - Sam: Two links (Https://Example.com/one), www.example.org/two.\n' +
        'continued message with docs.example.net/guide?part=2'
    )

    expect(result.candidates.map((candidate) => candidate.url)).toEqual([
      'https://example.com/one',
      'https://www.example.org/two',
      'https://docs.example.net/guide?part=2'
    ])
    expect(result.candidates.every((candidate) => candidate.sourceDate === '7/1/24, 9:03 PM')).toBe(
      true
    )
  })

  it('removes invisible characters and deduplicates normalized tracking links', () => {
    const result = parseWhatsAppExport(
      '\u200e[1/2/2025, 08:00:00] Person: https://EXAMPLE.com/story?utm_source=chat\n' +
        '[1/2/2025, 08:01:00] Person: https://example.com/story'
    )

    expect(result.candidates).toHaveLength(1)
    expect(result.candidates[0].url).toBe('https://example.com/story')
    expect(result.duplicateCount).toBe(1)
  })

  it('flags credential-like links and rejects embedded credentials and unsafe schemes', () => {
    const result = parseWhatsAppExport(
      '[3/3/25, 10:20:00] Person: https://service.test/path?access_token=secret-value\n' +
        '[3/3/25, 10:21:00] Person: https://user:password@example.com/private\n' +
        '[3/3/25, 10:22:00] Person: javascript:alert(1)\n' +
        '[3/3/25, 10:23:00] Person: ftp://files.example.com/private\n' +
        '[3/3/25, 10:24:00] Person: javascript:example.com/private'
    )

    expect(result.candidates).toHaveLength(1)
    expect(result.candidates[0].sensitive).toBe(true)
  })

  it('flags common secret parameters and tokenized paths', () => {
    const result = parseWhatsAppExport(
      '[3/3/25, 10:20:00] Person: https://service.test/callback?code=secret-value\n' +
        '[3/3/25, 10:21:00] Person: https://storage.test/blob?sig=secret-value\n' +
        '[3/3/25, 10:22:00] Person: https://service.test/invite/private-code'
    )

    expect(result.candidates).toHaveLength(3)
    expect(result.candidates.every((candidate) => candidate.sensitive)).toBe(true)
  })

  it('keeps ports and queries on links without an explicit scheme', () => {
    const result = parseWhatsAppExport(
      '[5/5/25, 12:00:00] Person: docs.example.com:8443/guide and example.org?view=compact'
    )

    expect(result.candidates.map((candidate) => candidate.url)).toEqual([
      'https://docs.example.com:8443/guide',
      'https://example.org/?view=compact'
    ])
  })

  it('flags likely adult links locally without matching similar words', () => {
    const result = parseWhatsAppExport(
      '[5/5/25, 12:00:00] Person: https://adult-content.example/watch\n' +
        '[5/5/25, 12:01:00] Person: https://example.org/r/nsfw\n' +
        '[5/5/25, 12:02:00] Person: https://example.net/essex-history'
    )

    expect(result.candidates.map((candidate) => candidate.potentiallyAdult)).toEqual([
      true,
      true,
      false
    ])
  })

  it('caps the candidate collection at 10,000 links', () => {
    const input = Array.from(
      { length: 10_002 },
      (_, index) => `[1/1/25, 08:00:00] Person: https://link-${index}.example.com/item`
    ).join('\n')
    const result = parseWhatsAppExport(input)

    expect(result.candidates).toHaveLength(10_000)
    expect(result.truncated).toBe(true)
  })

  it('does not turn an email address into a link', () => {
    const result = parseWhatsAppExport(
      '[4/4/25, 11:00:00] Person: contact@example.com and no links here'
    )

    expect(result.candidates).toHaveLength(0)
  })
})

describe('isWhatsAppExport', () => {
  it('recognizes common bracketed and dashed exports', () => {
    expect(isWhatsAppExport('[26/12/22, 16:59:31] Person: hello')).toBe(true)
    expect(isWhatsAppExport('12/26/22, 4:59 PM - Person: hello')).toBe(true)
  })

  it('does not label generic text as a WhatsApp export', () => {
    expect(isWhatsAppExport('A list of links\nhttps://example.com')).toBe(false)
  })
})
