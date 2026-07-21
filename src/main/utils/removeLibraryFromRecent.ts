import fs from 'fs'
import path from 'path'

import envPaths from 'env-paths'

const removeLibraryFromRecent = async (libraryPath: string): Promise<void> => {
  try {
    const paths = envPaths('pasted', { suffix: '' })

    const librariesFilePath = path.join(paths.data, 'libraries.json')

    if (!fs.existsSync(librariesFilePath)) {
      return
    }

    const data = await fs.promises.readFile(librariesFilePath, 'utf-8')

    const libraries: Library[] = JSON.parse(data)

    const updatedLibraries = libraries.filter((library) => library.path !== libraryPath)

    await fs.promises.writeFile(librariesFilePath, JSON.stringify(updatedLibraries))
  } catch (error) {
    throw new Error('Failed to remove library from recent.')
  }
}

export default removeLibraryFromRecent
