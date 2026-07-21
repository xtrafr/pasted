import fs from 'fs'
import path from 'path'

import envPaths from 'env-paths'

import databaseManager from '@main/database/DatabaseManager'

const updateLibraryName = async (libraryPath: string, newLibraryName: string): Promise<void> => {
  try {
    await databaseManager.closeDatabase()

    const libraryJsonPath = path.join(libraryPath, 'library.json')

    if (!fs.existsSync(libraryJsonPath)) {
      throw new Error('Library configuration file not found.')
    }

    const libraryJsonContent = await fs.promises.readFile(libraryJsonPath, 'utf-8')
    const libraryConfig = JSON.parse(libraryJsonContent)

    libraryConfig.name = newLibraryName

    await fs.promises.writeFile(libraryJsonPath, JSON.stringify(libraryConfig))

    const currentDirPath = libraryPath
    const parentDirPath = path.dirname(currentDirPath)
    const newDirPath = path.join(parentDirPath, newLibraryName)

    if (fs.existsSync(newDirPath)) {
      throw new Error('A folder with the new library name already exists.')
    }

    await fs.promises.rename(currentDirPath, newDirPath)

    const paths = envPaths('pasted', { suffix: '' })
    const librariesFilePath = path.join(paths.data, 'libraries.json')

    if (fs.existsSync(librariesFilePath)) {
      const librariesData = await fs.promises.readFile(librariesFilePath, 'utf-8')
      const libraries: Library[] = JSON.parse(librariesData)

      const updatedLibraries = libraries.map((library) => {
        if (library.path === currentDirPath) {
          return {
            ...library,
            name: newLibraryName,
            path: newDirPath
          }
        }

        return library
      })

      await fs.promises.writeFile(librariesFilePath, JSON.stringify(updatedLibraries))
    }
  } catch (error) {
    throw new Error('Failed to update library name.')
  }
}

export default updateLibraryName
