import { toast } from 'sonner'
import { Link, useNavigate } from 'react-router-dom'

import { Input } from '@renderer/components/input'
import { Label } from '@renderer/components/label'
import { Button } from '@renderer/components/button'

import useLibraryStore from '@renderer/stores/LibraryStore'
import useCreateLibraryStore from '@renderer/stores/CreateLibraryStore'

import pastedLogo from '@renderer/assets/pasted.svg'

const CreateLibraryPage = (): JSX.Element => {
  const navigate = useNavigate()

  const { setLibraryStore } = useLibraryStore()
  const { libraryName, libraryPath, handleNameChange, handlePathSelection } =
    useCreateLibraryStore()

  const handleCreateLibrary = async (): Promise<void> => {
    try {
      if (!libraryName || libraryName.trim().length === 0) {
        toast.error('Please enter a library name')
        return
      }

      if (libraryName.trim().length > 50) {
        toast.error('Library name must be less than 50 characters')
        return
      }

      if (!libraryPath || libraryPath.trim().length === 0) {
        toast.error('Please select a location for your library')
        return
      }

      const libraryDir = await window.electron.ipcRenderer.invoke(
        'create-library',
        libraryName.trim(),
        libraryPath
      )

      const library: Library = await window.electron.ipcRenderer.invoke('open-library', libraryDir)

      setLibraryStore(library.name, library.path, library.createdAt)

      navigate('/all-items')
      toast.success('Library created successfully')
    } catch (error) {
      toast.error('Unable to create library')
    }
  }

  return (
    <main className="w-full h-full flex flex-col items-center justify-center">
      <header className="w-full flex h-[3.25rem] min-h-[3.25rem] [-webkit-app-region:drag]"></header>
      <div className="w-full h-full flex flex-col items-center justify-center px-8 py-6 gap-y-6 overflow-auto">
        <div className="flex flex-col items-center gap-y-5 text-center">
          <img src={pastedLogo} alt="Pasted" className="size-12 select-none" draggable="false" />
          <div className="select-none">
            <h1 className="text-2xl font-semibold text-zinc-900 mb-2">create a new library</h1>
            <p className="text-sm text-zinc-600">choose a name and location to get started</p>
          </div>
        </div>
        <div className="max-w-[30rem] w-full flex flex-col gap-y-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col select-none">
              <Label htmlFor="library-name">library name</Label>
              <p className="text-xs text-zinc-600">enter a name for your library</p>
            </div>
            <Input
              type="text"
              placeholder="library name"
              id="library-name"
              className="max-w-48"
              value={libraryName}
              onChange={handleNameChange}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex flex-col select-none">
              <Label htmlFor="library-path">location</Label>
              <p className="text-xs text-zinc-600">
                {libraryPath ? libraryPath : 'pick a place to put your new library'}
              </p>
            </div>
            <Button variant="secondary" id="library-path" onClick={handlePathSelection}>
              browse...
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-center gap-x-2">
          <Button variant="secondary" asChild>
            <Link to="/" draggable="false">
              back
            </Link>
          </Button>
          <Button onClick={handleCreateLibrary}>create new library</Button>
        </div>
      </div>
    </main>
  )
}

export default CreateLibraryPage
