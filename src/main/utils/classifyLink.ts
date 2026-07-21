import { normalizeStringList } from './linkStringList'

export const LINK_GROUP_ORDER = [
  'GitHub',
  'Programming',
  'AI',
  'Documentation',
  'Design',
  'Productivity',
  'Education',
  'Science',
  'News',
  'Video',
  'Social',
  'Music',
  'Games',
  'Shopping',
  'Finance',
  'Travel',
  'Food',
  'Health'
] as const

export type LinkGroup = (typeof LINK_GROUP_ORDER)[number]

export interface LinkClassificationInput {
  url: string
  title?: string | null
  description?: string | null
  tags?: string[] | null
}

const HOST_GROUPS: Array<{ domains: string[]; groups: LinkGroup[] }> = [
  { domains: ['github.com'], groups: ['GitHub', 'Programming'] },
  {
    domains: [
      'bitbucket.org',
      'codeberg.org',
      'gitlab.com',
      'npmjs.com',
      'pypi.org',
      'crates.io',
      'stackoverflow.com',
      'stackexchange.com'
    ],
    groups: ['Programming']
  },
  {
    domains: ['developer.mozilla.org', 'readthedocs.io', 'devdocs.io'],
    groups: ['Programming', 'Documentation']
  },
  { domains: ['openai.com', 'huggingface.co', 'anthropic.com'], groups: ['AI'] },
  { domains: ['figma.com', 'dribbble.com', 'behance.net', 'canva.com'], groups: ['Design'] },
  {
    domains: ['notion.so', 'trello.com', 'asana.com', 'linear.app', 'slack.com'],
    groups: ['Productivity']
  },
  {
    domains: ['coursera.org', 'edx.org', 'khanacademy.org', 'udemy.com', 'wikipedia.org'],
    groups: ['Education']
  },
  { domains: ['arxiv.org', 'nature.com', 'science.org'], groups: ['Science'] },
  { domains: ['reuters.com', 'apnews.com', 'bbc.com', 'bbc.co.uk'], groups: ['News'] },
  { domains: ['youtube.com', 'youtu.be', 'vimeo.com', 'twitch.tv'], groups: ['Video'] },
  {
    domains: [
      'reddit.com',
      'facebook.com',
      'instagram.com',
      'linkedin.com',
      'mastodon.social',
      'x.com',
      'twitter.com'
    ],
    groups: ['Social']
  },
  { domains: ['spotify.com', 'soundcloud.com', 'bandcamp.com'], groups: ['Music'] },
  { domains: ['steampowered.com', 'itch.io', 'gog.com'], groups: ['Games'] },
  { domains: ['amazon.com', 'ebay.com', 'etsy.com', 'aliexpress.com'], groups: ['Shopping'] },
  { domains: ['coinmarketcap.com', 'coindesk.com', 'tradingview.com'], groups: ['Finance'] }
]

const TOPIC_TERMS: Array<{ group: LinkGroup; terms: string[] }> = [
  {
    group: 'Programming',
    terms: [
      'api',
      'code',
      'coding',
      'developer',
      'javascript',
      'nodejs',
      'open source',
      'programming',
      'python',
      'react',
      'repository',
      'rust',
      'sdk',
      'software',
      'typescript'
    ]
  },
  {
    group: 'AI',
    terms: [
      'artificial intelligence',
      'chatbot',
      'generative ai',
      'large language model',
      'llm',
      'machine learning',
      'neural network',
      'openai'
    ]
  },
  {
    group: 'Documentation',
    terms: ['api reference', 'docs', 'documentation', 'guide', 'manual', 'reference', 'tutorial']
  },
  { group: 'Design', terms: ['design', 'prototype', 'typography', 'ui', 'user experience', 'ux'] },
  {
    group: 'Productivity',
    terms: ['calendar', 'notes', 'productivity', 'project management', 'task', 'workflow']
  },
  {
    group: 'Education',
    terms: ['course', 'education', 'learn', 'lecture', 'tutorial', 'university']
  },
  { group: 'Science', terms: ['paper', 'research', 'science', 'scientific', 'study'] },
  { group: 'News', terms: ['breaking news', 'journalism', 'news', 'report'] },
  { group: 'Video', terms: ['livestream', 'streaming', 'video', 'watch'] },
  { group: 'Social', terms: ['community', 'forum', 'profile', 'social network'] },
  { group: 'Music', terms: ['album', 'music', 'playlist', 'song'] },
  { group: 'Games', terms: ['game', 'games', 'gaming', 'gameplay'] },
  { group: 'Shopping', terms: ['buy', 'deal', 'price', 'product', 'sale', 'shop', 'store'] },
  { group: 'Finance', terms: ['banking', 'bitcoin', 'crypto', 'finance', 'investing', 'stock'] },
  { group: 'Travel', terms: ['flight', 'hotel', 'tourism', 'travel', 'trip'] },
  { group: 'Food', terms: ['cooking', 'food', 'recipe', 'restaurant'] },
  { group: 'Health', terms: ['fitness', 'health', 'medical', 'wellness'] }
]

const normalizeText = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()

const matchesDomain = (hostname: string, domain: string): boolean =>
  hostname === domain || hostname.endsWith(`.${domain}`)

const containsTerm = (text: string, term: string): boolean => {
  const normalizedTerm = normalizeText(term)
  return ` ${text} `.includes(` ${normalizedTerm} `)
}

export const classifyLink = ({
  url,
  title,
  description,
  tags
}: LinkClassificationInput): LinkGroup[] => {
  let hostname = ''
  let pathname = ''

  try {
    const parsed = new URL(url)
    hostname = parsed.hostname.toLowerCase().replace(/\.$/u, '')
    pathname = decodeURIComponent(parsed.pathname)
  } catch {
    pathname = url
  }

  const groups = new Set<LinkGroup>()

  for (const rule of HOST_GROUPS) {
    if (rule.domains.some((domain) => matchesDomain(hostname, domain))) {
      rule.groups.forEach((group) => groups.add(group))
    }
  }

  if (hostname.split('.').includes('docs')) groups.add('Documentation')

  const searchableText = normalizeText(
    [pathname, title ?? '', description ?? '', ...normalizeStringList(tags)].join(' ')
  )

  for (const { group, terms } of TOPIC_TERMS) {
    if (terms.some((term) => containsTerm(searchableText, term))) groups.add(group)
  }

  return LINK_GROUP_ORDER.filter((group) => groups.has(group)).slice(0, 8)
}

export default classifyLink
