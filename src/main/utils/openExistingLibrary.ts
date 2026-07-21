import openLibrary from '@main/utils/openLibrary'
import selectFolder from '@main/utils/selectFolder'

const openExistingLibrary = async (): Promise<Library> => {
  try {
    const libraryPath = await selectFolder()

    if (!libraryPath) {
      throw new Error('No library path selected.')
    }

    const library = await openLibrary(libraryPath)

    return library
  } catch (error) {
    throw new Error('Failed to open existing library.')
  }
}

export default openExistingLibrary
