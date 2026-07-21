import databaseManager from '@main/database/DatabaseManager'

import classifyLink from './classifyLink'
import { normalizeStringList, serializeStringList } from './linkStringList'
import normalizeLinkRecord from './normalizeLinkRecord'

const addLink = async (linkProps: AddLinkProps): Promise<Link> => {
  try {
    const { Link } = databaseManager.models

    if (!Link) {
      throw new Error('Link model is not initialized.')
    }

    const currentTime = Date.now()
    const tags = normalizeStringList(linkProps.tags)
    const groups =
      normalizeStringList(linkProps.groups).length > 0
        ? normalizeStringList(linkProps.groups)
        : classifyLink({
            url: linkProps.url,
            title: linkProps.title,
            description: linkProps.description,
            tags
          })

    const newLink = await Link.create({
      url: linkProps.url,
      title: linkProps.title ?? null,
      description: linkProps.description ?? null,
      iconUrl: linkProps.iconUrl ?? null,
      tags: serializeStringList(tags),
      groups: serializeStringList(groups),
      folderId: linkProps.folderId ?? null,
      productPrice: linkProps.productPrice ?? null,
      readTime: linkProps.readTime ?? null,
      isPinned: linkProps.isPinned ?? false,
      createdAt: linkProps.createdAt || currentTime,
      updatedAt: linkProps.updatedAt || currentTime
    })

    return normalizeLinkRecord(
      newLink.get({ plain: true }) as unknown as Parameters<typeof normalizeLinkRecord>[0]
    )
  } catch (error) {
    throw new Error('Failed to add link.')
  }
}

export default addLink
