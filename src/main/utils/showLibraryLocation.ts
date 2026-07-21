import { shell } from 'electron'

const showLibraryLocation = async (libraryPath: string): Promise<void> => {
  try {
    await shell.openPath(libraryPath)
  } catch (error) {
    throw new Error('Failed to show library location.')
  }
}

export default showLibraryLocation
