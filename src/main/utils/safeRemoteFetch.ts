import { lookup as dnsLookup } from 'node:dns/promises'
import type { LookupAddress } from 'node:dns'
import http, { type IncomingHttpHeaders } from 'node:http'
import https from 'node:https'
import { BlockList, isIP, type LookupFunction } from 'node:net'

export const DEFAULT_METADATA_TIMEOUT_MS = 6_000
export const DEFAULT_METADATA_MAX_BYTES = 1024 * 1024
export const DEFAULT_METADATA_REDIRECTS = 3

const RESERVED_HOSTNAME = /(?:^|\.)(?:home|internal|invalid|lan|local|localhost|onion|test)$/i

const blockedIpv4 = new BlockList()
for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4]
] as Array<[string, number]>) {
  blockedIpv4.addSubnet(network, prefix, 'ipv4')
}

const globalIpv6 = new BlockList()
globalIpv6.addSubnet('2000::', 3, 'ipv6')

const blockedIpv6 = new BlockList()
blockedIpv6.addSubnet('2001:db8::', 32, 'ipv6')

export interface ResolvedAddress {
  address: string
  family: 4 | 6
}

export type RemoteResolver = (hostname: string) => Promise<ResolvedAddress[]>

export interface SafeRemoteFetchOptions {
  acceptedContentTypes: string[]
  maxBytes?: number
  maxRedirects?: number
  timeoutMs?: number
  resolver?: RemoteResolver
}

export interface SafeRemoteResponse {
  body: Buffer
  contentType: string
  finalUrl: URL
  status: number
}

interface RawRemoteResponse {
  body: Buffer
  headers: IncomingHttpHeaders
  status: number
}

const normalizeHostname = (hostname: string): string =>
  hostname.toLowerCase().replace(/^\[/u, '').replace(/\]$/u, '').replace(/\.$/u, '')

export const isPublicAddress = (address: string, family?: number): boolean => {
  const detectedFamily = family ?? isIP(address)

  if (detectedFamily === 4) return !blockedIpv4.check(address, 'ipv4')
  if (detectedFamily === 6) {
    return globalIpv6.check(address, 'ipv6') && !blockedIpv6.check(address, 'ipv6')
  }

  return false
}

export const validateRemoteUrl = (input: string | URL): URL => {
  const url = new URL(input)
  const hostname = normalizeHostname(url.hostname)

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only HTTP and HTTPS previews are supported.')
  }
  if (url.username || url.password) throw new Error('Preview URLs cannot include credentials.')
  if (!hostname || RESERVED_HOSTNAME.test(hostname)) {
    throw new Error('Local and reserved hostnames cannot be previewed.')
  }
  if (url.port) throw new Error('Only standard HTTP and HTTPS ports can be previewed.')

  const literalFamily = isIP(hostname)
  if (literalFamily && !isPublicAddress(hostname, literalFamily)) {
    throw new Error('Private and reserved addresses cannot be previewed.')
  }

  url.hostname = hostname
  url.hash = ''

  return url
}

const defaultResolver: RemoteResolver = async (hostname) => {
  const addresses = (await dnsLookup(hostname, {
    all: true,
    verbatim: true
  })) as LookupAddress[]

  return addresses
    .filter((item): item is LookupAddress & { family: 4 | 6 } => [4, 6].includes(item.family))
    .map(({ address, family }) => ({ address, family }))
}

export const resolvePublicAddress = async (
  hostname: string,
  resolver: RemoteResolver = defaultResolver
): Promise<ResolvedAddress> => {
  const normalizedHostname = normalizeHostname(hostname)
  const literalFamily = isIP(normalizedHostname)
  const addresses = literalFamily
    ? [{ address: normalizedHostname, family: literalFamily as 4 | 6 }]
    : await resolver(normalizedHostname)

  if (
    addresses.length === 0 ||
    addresses.some(({ address, family }) => !isPublicAddress(address, family))
  ) {
    throw new Error('The preview host resolved to a private or reserved address.')
  }

  return addresses[0]
}

const requestRemote = (
  url: URL,
  address: ResolvedAddress,
  maxBytes: number,
  timeoutMs: number
): Promise<RawRemoteResponse> => {
  const client = url.protocol === 'https:' ? https : http
  const pinnedLookup: LookupFunction = (_hostname, options, callback) => {
    if (options.all) callback(null, [address])
    else callback(null, address.address, address.family)
  }

  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (error?: Error, response?: RawRemoteResponse): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)

      if (error) reject(error)
      else if (response) resolve(response)
    }

    const request = client.request(
      url,
      {
        agent: false,
        family: address.family,
        headers: {
          Accept: 'text/html,application/xhtml+xml,image/*;q=0.8',
          'Accept-Encoding': 'identity',
          'User-Agent': 'Pasted/1.0 metadata preview'
        },
        lookup: pinnedLookup,
        maxHeaderSize: 16 * 1024,
        method: 'GET'
      },
      (response) => {
        const contentEncoding = String(
          response.headers['content-encoding'] ?? 'identity'
        ).toLowerCase()
        if (!['', 'identity'].includes(contentEncoding)) {
          response.destroy()
          finish(new Error('Compressed preview responses are not accepted.'))
          return
        }

        const declaredLength = Number(response.headers['content-length'] ?? 0)
        if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
          response.destroy()
          finish(new Error('The preview response is too large.'))
          return
        }

        const chunks: Buffer[] = []
        let totalBytes = 0

        response.on('data', (chunk: Buffer | string) => {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
          totalBytes += buffer.length

          if (totalBytes > maxBytes) {
            response.destroy()
            finish(new Error('The preview response is too large.'))
            return
          }

          chunks.push(buffer)
        })
        response.on('end', () => {
          finish(undefined, {
            body: Buffer.concat(chunks),
            headers: response.headers,
            status: response.statusCode ?? 0
          })
        })
        response.on('error', (error) => finish(error))
      }
    )

    const timer = setTimeout(() => {
      request.destroy(new Error('The preview request timed out.'))
    }, timeoutMs)

    request.on('error', (error) => finish(error))
    request.end()
  })
}

const getHeaderValue = (value: string | string[] | undefined): string | null =>
  Array.isArray(value) ? value[0] ?? null : value ?? null

export const safeFetchRemote = async (
  input: string | URL,
  options: SafeRemoteFetchOptions
): Promise<SafeRemoteResponse> => {
  const maxBytes = options.maxBytes ?? DEFAULT_METADATA_MAX_BYTES
  const maxRedirects = options.maxRedirects ?? DEFAULT_METADATA_REDIRECTS
  const timeoutMs = options.timeoutMs ?? DEFAULT_METADATA_TIMEOUT_MS
  const startedAt = Date.now()
  let currentUrl = validateRemoteUrl(input)

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const remainingTime = timeoutMs - (Date.now() - startedAt)
    if (remainingTime <= 0) throw new Error('The preview request timed out.')

    const address = await resolvePublicAddress(currentUrl.hostname, options.resolver)
    const response = await requestRemote(currentUrl, address, maxBytes, remainingTime)

    if (response.status >= 300 && response.status < 400) {
      const location = getHeaderValue(response.headers.location)
      if (!location || redirectCount === maxRedirects) {
        throw new Error('The preview redirected too many times.')
      }

      const nextUrl = validateRemoteUrl(new URL(location, currentUrl))
      if (currentUrl.protocol === 'https:' && nextUrl.protocol !== 'https:') {
        throw new Error('Secure previews cannot redirect to an insecure URL.')
      }

      currentUrl = nextUrl
      continue
    }

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`The preview request returned HTTP ${response.status}.`)
    }

    const contentType = String(response.headers['content-type'] ?? '')
      .split(';', 1)[0]
      .trim()
      .toLowerCase()

    if (!contentType || !options.acceptedContentTypes.includes(contentType)) {
      throw new Error('The preview response has an unsupported content type.')
    }

    return { body: response.body, contentType, finalUrl: currentUrl, status: response.status }
  }

  throw new Error('The preview redirected too many times.')
}
