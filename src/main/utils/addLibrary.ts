import fs from 'fs'
import path from 'path'

import envPaths from 'env-paths'

const addLibrary = async (library: Library): Promise<void> => {
  try {
    const paths = envPaths('pasted', { suffix: '' })

    const librariesFilePath = path.join(paths.data, 'libraries.json')

    await fs.promises.mkdir(path.dirname(librariesFilePath), { recursive: true })

    let libraries: Library[] = []

    if (fs.existsSync(librariesFilePath)) {
      const data = await fs.promises.readFile(librariesFilePath, 'utf-8')

      libraries = JSON.parse(data)
    }

    const existingIndex = libraries.findIndex((v) => v.path === library.path)

    if (existingIndex !== -1) {
      libraries.splice(existingIndex, 1)
    }

    libraries.unshift(library)

    await fs.promises.writeFile(librariesFilePath, JSON.stringify(libraries))
  } catch (error) {
    throw new Error('Failed to add library.')
  }
}

export default addLibrary
