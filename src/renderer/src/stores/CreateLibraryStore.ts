import { create } from 'zustand'

interface CreateLibraryState {
  libraryName: string
  libraryPath: string | null
  handleNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handlePathSelection: () => Promise<void>
}

const useCreateLibraryStore = create<CreateLibraryState>((set) => ({
  libraryName: '',
  libraryPath: null,
  handleNameChange: (e): void => set({ libraryName: e.target.value }),
  handlePathSelection: async (): Promise<void> => {
    const folderPath = await window.electron.ipcRenderer.invoke('select-folder')

    set({ libraryPath: folderPath })
  }
}))

export default useCreateLibraryStore
