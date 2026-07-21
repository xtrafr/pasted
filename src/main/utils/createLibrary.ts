import fs from 'fs'
import path from 'path'

import databaseManager from '@main/database/DatabaseManager'

import createFolder from '@main/utils/createFolder'
import createDefaultItems from '@main/utils/createDefaultItems'

const createLibrary = async (libraryName: string, libraryPath: string): Promise<string> => {
  try {
    const libraryDir = await createFolder(libraryName, libraryPath)

    const libraryJsonPath = path.join(libraryDir, 'library.json')

    if (!fs.existsSync(libraryJsonPath)) {
      const libraryJsonContent = { name: libraryName, createdAt: Date.now() }

      await fs.promises.writeFile(libraryJsonPath, JSON.stringify(libraryJsonContent))

      await databaseManager.openDatabase(libraryDir)

      try {
        await createDefaultItems()
      } catch (error) {
        console.error('Failed to create default items:', error)
      }

      return libraryDir
    } else {
      throw new Error('Library already exists at the specified path.')
    }
  } catch (error) {
    throw new Error('Failed to create library.')
  }
}

export default createLibrary
