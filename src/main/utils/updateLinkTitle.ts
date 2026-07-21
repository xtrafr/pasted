import databaseManager from '@main/database/DatabaseManager'

import classifyLink from './classifyLink'
import { deserializeStringList, serializeStringList } from './linkStringList'

const updateLinkTitle = async (linkId: number, newTitle: string | null): Promise<void> => {
  try {
    const { Link } = databaseManager.models

    if (!Link) {
      throw new Error('Link model is not initialized.')
    }

    const link = await Link.findByPk(linkId)
    if (!link) throw new Error('Link not found.')

    const groups = classifyLink({
      url: link.get('url'),
      title: newTitle,
      description: link.get('description'),
      tags: deserializeStringList(link.get('tags'))
    })

    await Link.update(
      { title: newTitle, groups: serializeStringList(groups), updatedAt: Date.now() },
      {
        where: {
          id: linkId
        }
      }
    )
  } catch (error) {
    throw new Error('Failed to update link title.')
  }
}

export default updateLinkTitle
