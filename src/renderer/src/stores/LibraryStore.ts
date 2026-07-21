import { create } from 'zustand'

interface LibraryState {
  name: string | null
  path: string | null
  createdAt: number | null
  libraries: Library[]
  apiPort: number | null
  setLibraryStore: (name: string, path: string, createdAt: number) => void
  getLibraries: () => Promise<void>
  removeLibraryFromRecent: (libraryPath: string) => Promise<void>
  updateLibraryName: (libraryPath: string, newLibraryName: string) => Promise<void>
  getApiPort: () => Promise<void>
  updateApiPort: (port: number) => Promise<void>
}

const useLibraryStore = create<LibraryState>((set, get) => ({
  name: null,
  path: null,
  createdAt: null,
  libraries: [],
  apiPort: null,
  setLibraryStore: (name, path, createdAt): void => {
    set({ name, path, createdAt })
  },
  getLibraries: async (): Promise<void> => {
    try {
      const libraries: Library[] = await window.electron.ipcRenderer.invoke('get-libraries')

      set({ libraries })
    } catch (error) {
      throw new Error('Failed to get libraries.')
    }
  },
  removeLibraryFromRecent: async (libraryPath): Promise<void> => {
    try {
      await window.electron.ipcRenderer.invoke('remove-library-from-recent', libraryPath)

      await get().getLibraries()
    } catch (error) {
      throw new Error('Failed to remove library from recent.')
    }
  },
  updateLibraryName: async (libraryPath, newLibraryName): Promise<void> => {
    try {
      await window.electron.ipcRenderer.invoke('update-library-name', libraryPath, newLibraryName)

      await get().getLibraries()
    } catch (error) {
      throw new Error('Failed to rename library.')
    }
  },
  getApiPort: async (): Promise<void> => {
    try {
      const port = await window.electron.ipcRenderer.invoke('get-api-port')

      set({ apiPort: port })
    } catch (error) {
      throw new Error('Failed to get API port.')
    }
  },
  updateApiPort: async (port: number): Promise<void> => {
    try {
      await window.electron.ipcRenderer.invoke('update-api-port', port)

      await get().getApiPort()
    } catch (error) {
      throw new Error('Failed to update API port.')
    }
  }
}))

export default useLibraryStore
