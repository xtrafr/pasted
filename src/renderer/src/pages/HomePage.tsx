import { useEffect } from 'react'

import { toast } from 'sonner'
import { Link, useNavigate } from 'react-router-dom'

import { Button } from '@renderer/components/button'
import LibraryCard from '@renderer/components/library-card'
import { ScrollArea } from '@renderer/components/scroll-area'
import ThemeToggle from '@renderer/components/theme-toggle'

import useLibraryStore from '@renderer/stores/LibraryStore'

import pastedLogo from '@renderer/assets/pasted.svg'

const HomePage = (): JSX.Element => {
  const navigate = useNavigate()

  const { libraries, setLibraryStore, getLibraries } = useLibraryStore()

  useEffect(() => {
    getLibraries()
  }, [getLibraries])

  const handleOpenExistingLibrary = async (): Promise<void> => {
    try {
      const library: Library = await window.electron.ipcRenderer.invoke('open-existing-library')

      setLibraryStore(library.name, library.path, library.createdAt)

      navigate('/all-items')

      toast.success('Library opened successfully')
    } catch (error) {
      toast.error('Unable to open library')
    }
  }

  return (
    <main className="w-full h-full flex flex-col items-center justify-center">
      <header className="w-full flex h-[3.25rem] min-h-[3.25rem] items-center justify-end px-3 [-webkit-app-region:drag]">
        <ThemeToggle className="[-webkit-app-region:no-drag]" />
      </header>
      <div className="w-full h-full flex flex-col items-center justify-center px-8 py-6 gap-y-6 overflow-auto">
        <div className="flex flex-col items-center gap-y-5 text-center">
          <img src={pastedLogo} alt="Pasted" className="size-12 select-none" draggable="false" />
          <div className="select-none">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              welcome to Pasted
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              open an existing library or create a new one
            </p>
          </div>
        </div>
        {libraries.length > 0 && (
          <ScrollArea className="w-full max-w-96">
            <div className="flex flex-col w-full gap-y-2">
              {libraries.map((library) => (
                <LibraryCard key={library.path} library={library} />
              ))}
            </div>
          </ScrollArea>
        )}
        <div className="flex items-center justify-center gap-x-2">
          <Button variant="secondary" onClick={handleOpenExistingLibrary}>
            open existing library
          </Button>
          <Button asChild>
            <Link to="/create-library" draggable="false">
              create new library
            </Link>
          </Button>
        </div>
      </div>
    </main>
  )
}

export default HomePage
