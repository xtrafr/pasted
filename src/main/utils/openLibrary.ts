import fs from 'fs'
import path from 'path'

import databaseManager from '@main/database/DatabaseManager'

import addLibrary from '@main/utils/addLibrary'

const openLibrary = async (libraryPath: string): Promise<Library> => {
  try {
    const libraryJsonPath = path.join(libraryPath, 'library.json')

    const data = await fs.promises.readFile(libraryJsonPath, 'utf-8')
    const { name, createdAt } = JSON.parse(data)

    await databaseManager.openDatabase(libraryPath)

    const library: Library = { name, path: libraryPath, createdAt }

    await addLibrary(library)

    databaseManager.setCurrentLibrary(library)

    return library
  } catch (error) {
    throw new Error('Failed to open library.')
  }
}

export default openLibrary
