import databaseManager from '@main/database/DatabaseManager'

import normalizeLinkRecord from './normalizeLinkRecord'

const getLinks = async (): Promise<Link[]> => {
  try {
    const { Link } = databaseManager.models

    if (!Link) {
      throw new Error('Link model is not initialized.')
    }

    const links = await Link.findAll({ raw: true, order: [['createdAt', 'DESC']] })

    return links.map((link) =>
      normalizeLinkRecord(link as unknown as Parameters<typeof normalizeLinkRecord>[0])
    )
  } catch (error) {
    throw new Error('Failed to fetch links.')
  }
}

export default getLinks
