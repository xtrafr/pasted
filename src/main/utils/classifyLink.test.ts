import { describe, expect, it } from 'vitest'

import classifyLink from './classifyLink'

describe('classifyLink', () => {
  it('assigns both GitHub and programming groups to GitHub links', () => {
    expect(classifyLink({ url: 'https://github.com/xtrafr/pasted' })).toEqual([
      'GitHub',
      'Programming'
    ])
  })

  it('uses metadata and tags as well as the domain', () => {
    expect(
      classifyLink({
        url: 'https://example.com/article',
        title: 'Machine learning API guide',
        description: 'A reference for software developers',
        tags: ['LLM', 'documentation']
      })
    ).toEqual(['Programming', 'AI', 'Documentation'])
  })

  it('does not match lookalike domains by substring', () => {
    expect(classifyLink({ url: 'https://notgithub.com/photos' })).not.toContain('GitHub')
  })

  it('deduplicates groups and keeps a stable display order', () => {
    expect(
      classifyLink({
        url: 'https://docs.example.com/api/tutorial',
        description: 'Documentation tutorial for a programming API',
        tags: ['documentation', 'tutorial']
      })
    ).toEqual(['Programming', 'Documentation', 'Education'])
  })
})
