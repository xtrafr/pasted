import { describe, expect, it } from 'vitest'

import { extractPageMetadata } from './getMetadata'

describe('extractPageMetadata', () => {
  it('prefers social metadata and resolves relative icon URLs against the final page', () => {
    const metadata = extractPageMetadata(
      `
        <html>
          <head>
            <base href="https://cdn.example.com/assets/">
            <title>Fallback title</title>
            <meta property="og:title" content="  Better title  ">
            <meta property="og:description" content="A useful programming guide">
            <meta name="keywords" content="TypeScript, API, TypeScript">
            <meta property="article:tag" content="documentation">
            <link rel="icon" href="icons/site.ico">
          </head>
        </html>
      `,
      new URL('https://example.com/final')
    )

    expect(metadata.title).toBe('Better title')
    expect(metadata.description).toBe('A useful programming guide')
    expect(metadata.tags).toEqual(['TypeScript', 'API', 'documentation'])
    expect(metadata.iconCandidates).toEqual([
      'https://cdn.example.com/assets/icons/site.ico',
      'https://example.com/favicon.ico'
    ])
  })

  it('clamps and removes control characters from metadata text', () => {
    const metadata = extractPageMetadata(
      `<title>${'A'.repeat(400)}\u0000</title><meta name="description" content="one\n two">`,
      new URL('https://example.com')
    )

    expect(metadata.title).toHaveLength(300)
    expect(metadata.description).toBe('one two')
  })
})
