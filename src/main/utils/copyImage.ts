import fs from 'fs'
import path from 'path'

import { clipboard, nativeImage } from 'electron'

import databaseManager from '@main/database/DatabaseManager'

const copyImage = async (image: Image): Promise<void> => {
  try {
    const currentLibrary = databaseManager.getCurrentLibrary()

    if (!currentLibrary) {
      throw new Error('No library is currently open.')
    }

    const imagePath = path.join(currentLibrary.path, 'images', image.fileName)

    const imageBuffer = await fs.promises.readFile(imagePath)
    const nativeImg = nativeImage.createFromBuffer(imageBuffer)

    clipboard.writeImage(nativeImg)
  } catch (error) {
    throw new Error('Failed to copy image.')
  }
}

export default copyImage
