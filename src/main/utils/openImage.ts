import path from 'path'

import { shell } from 'electron'

import databaseManager from '@main/database/DatabaseManager'

const openImage = async (image: Image): Promise<void> => {
  try {
    const currentLibrary = databaseManager.getCurrentLibrary()

    if (!currentLibrary) {
      throw new Error('No library is currently open.')
    }

    const imagePath = path.join(currentLibrary.path, 'images', image.fileName)

    await shell.openPath(imagePath)
  } catch (error) {
    throw new Error('Failed to open image.')
  }
}

export default openImage
