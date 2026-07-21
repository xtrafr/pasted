import { describe, expect, it } from 'vitest'

import {
  isPublicAddress,
  resolvePublicAddress,
  validateRemoteUrl,
  type RemoteResolver
} from './safeRemoteFetch'

describe('safe remote preview validation', () => {
  it.each([
    ['127.0.0.1', 4],
    ['10.0.0.4', 4],
    ['169.254.169.254', 4],
    ['192.168.1.20', 4],
    ['203.0.113.9', 4],
    ['::1', 6],
    ['::ffff:127.0.0.1', 6],
    ['fc00::1', 6],
    ['fe80::1', 6],
    ['2001:db8::1', 6]
  ])('blocks non-public address %s', (address, family) => {
    expect(isPublicAddress(address, family)).toBe(false)
  })

  it.each([
    ['93.184.216.34', 4],
    ['2606:2800:220:1:248:1893:25c8:1946', 6]
  ])('allows public address %s', (address, family) => {
    expect(isPublicAddress(address, family)).toBe(true)
  })

  it.each([
    'file:///etc/passwd',
    'http://user:password@example.com',
    'http://localhost',
    'http://service.internal',
    'http://127.1',
    'http://[::1]',
    'https://example.com:8443'
  ])('rejects unsafe URL %s', (url) => {
    expect(() => validateRemoteUrl(url)).toThrow()
  })

  it('accepts an ordinary public HTTPS URL and removes its fragment', () => {
    expect(validateRemoteUrl('https://example.com/guide#part').href).toBe(
      'https://example.com/guide'
    )
  })

  it('rejects a hostname if any resolved address is private', async () => {
    const resolver: RemoteResolver = async () => [
      { address: '93.184.216.34', family: 4 },
      { address: '127.0.0.1', family: 4 }
    ]

    await expect(resolvePublicAddress('example.com', resolver)).rejects.toThrow(
      'private or reserved'
    )
  })
})
