import fs from 'fs'
import path from 'path'

import envPaths from 'env-paths'

const getLibraries = async (): Promise<Library[]> => {
  try {
    const paths = envPaths('pasted', { suffix: '' })

    const librariesFilePath = path.join(paths.data, 'libraries.json')

    if (!fs.existsSync(librariesFilePath)) {
      return []
    }

    const data = await fs.promises.readFile(librariesFilePath, 'utf-8')

    const libraries: Library[] = JSON.parse(data)

    return libraries
  } catch (error) {
    throw new Error('Failed to get libraries.')
  }
}

export default getLibraries
