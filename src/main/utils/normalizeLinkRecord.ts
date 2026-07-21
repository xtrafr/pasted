import classifyLink from './classifyLink'
import { deserializeStringList } from './linkStringList'

type StoredLink = Omit<Link, 'description' | 'groups' | 'tags'> & {
  description?: string | null
  groups?: unknown
  tags?: unknown
}

const normalizeLinkRecord = (record: StoredLink): Link => {
  const tags = deserializeStringList(record.tags)
  const storedGroups = deserializeStringList(record.groups)
  const description = record.description ?? null
  const groups =
    storedGroups.length > 0
      ? storedGroups
      : classifyLink({
          url: record.url,
          title: record.title,
          description,
          tags
        })

  return { ...record, description, tags, groups }
}

export default normalizeLinkRecord
