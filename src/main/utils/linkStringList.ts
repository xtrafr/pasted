export const replaceControlCharacters = (value: string): string =>
  Array.from(value, (character) => {
    const code = character.charCodeAt(0)
    return code <= 0x1f || code === 0x7f ? ' ' : character
  }).join('')

export const normalizeStringList = (
  value: unknown,
  { maxItems = 24, maxLength = 80 }: { maxItems?: number; maxLength?: number } = {}
): string[] => {
  if (!Array.isArray(value)) return []

  const normalized = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => replaceControlCharacters(item).replace(/\s+/gu, ' ').trim())
    .filter(Boolean)
    .map((item) => item.slice(0, maxLength))

  return [...new Set(normalized)].slice(0, maxItems)
}

export const deserializeStringList = (value: unknown): string[] => {
  if (Array.isArray(value)) return normalizeStringList(value)
  if (typeof value !== 'string' || !value) return []

  try {
    return normalizeStringList(JSON.parse(value))
  } catch {
    return []
  }
}

export const serializeStringList = (value: unknown): string =>
  JSON.stringify(normalizeStringList(value))
