import { ipcMain } from 'electron'

import apiManager from '@main/api/APIManager'

import openLibrary from '@main/utils/openLibrary'
import getLibraries from '@main/utils/getLibraries'
import createLibrary from '@main/utils/createLibrary'
import selectFolder from '@main/utils/selectFolder'
import updateLibraryName from '@main/utils/updateLibraryName'
import openExistingLibrary from '@main/utils/openExistingLibrary'
import showLibraryLocation from '@main/utils/showLibraryLocation'
import removeLibraryFromRecent from '@main/utils/removeLibraryFromRecent'

ipcMain.handle('select-folder', async () => {
  try {
    const folderPath = await selectFolder()

    return folderPath
  } catch (error) {
    throw new Error('Failed to select folder.')
  }
})

ipcMain.handle('create-library', async (_event, libraryName, libraryPath) => {
  try {
    const libraryDir = await createLibrary(libraryName, libraryPath)

    return libraryDir
  } catch (error) {
    throw new Error('Failed to create library.')
  }
})

ipcMain.handle('open-library', async (_event, libraryPath) => {
  try {
    const libraryData = await openLibrary(libraryPath)

    return libraryData
  } catch (error) {
    throw new Error('Failed to open library.')
  }
})

ipcMain.handle('open-existing-library', async () => {
  try {
    const libraryData = await openExistingLibrary()

    return libraryData
  } catch (error) {
    throw new Error('Failed to open existing library.')
  }
})

ipcMain.handle('get-libraries', async () => {
  try {
    const libraries = await getLibraries()

    return libraries
  } catch (error) {
    throw new Error('Failed to get libraries.')
  }
})

ipcMain.handle('show-library-location', async (_event, libraryPath) => {
  try {
    await showLibraryLocation(libraryPath)
  } catch (error) {
    throw new Error('Failed to show library location.')
  }
})

ipcMain.handle('remove-library-from-recent', async (_event, libraryPath) => {
  try {
    await removeLibraryFromRecent(libraryPath)
  } catch (error) {
    throw new Error('Failed to remove library from recent.')
  }
})

ipcMain.handle('update-library-name', async (_event, libraryPath, newLibraryName) => {
  try {
    await updateLibraryName(libraryPath, newLibraryName)
  } catch (error) {
    throw new Error('Failed to update library name.')
  }
})

ipcMain.handle('get-api-port', () => {
  return apiManager.getPort()
})

ipcMain.handle('update-api-port', async (_event, port) => {
  try {
    await apiManager.updatePort(port)

    return { success: true, port }
  } catch (error) {
    throw new Error('Failed to update API port')
  }
})
