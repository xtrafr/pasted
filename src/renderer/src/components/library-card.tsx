import { useState, useEffect } from 'react'

import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { Library, Ellipsis } from 'lucide-react'
import { useClickAway } from '@uidotdev/usehooks'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@renderer/components/dropdown-menu'
import { Input } from '@renderer/components/input'
import { Button } from '@renderer/components/button'

import useLibraryStore from '@renderer/stores/LibraryStore'

const LibraryCard = ({ library }: { library: Library }): JSX.Element => {
  const navigate = useNavigate()

  const { setLibraryStore, removeLibraryFromRecent, updateLibraryName } = useLibraryStore()

  const [isEditingLibrary, setIsEditingLibrary] = useState(false)
  const [newLibraryName, setNewLibraryName] = useState(library.name)

  const inputRef = useClickAway<HTMLInputElement>(() => {
    setIsEditingLibrary(false)
    setNewLibraryName(library.name)
  })

  useEffect(() => {
    if (isEditingLibrary && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.select()
      }, 100)
    }
  }, [isEditingLibrary])

  useEffect(() => {
    setNewLibraryName(library.name)
  }, [library.name])

  const handleOpenLibrary = async (): Promise<void> => {
    try {
      const openedLibrary: Library = await window.electron.ipcRenderer.invoke(
        'open-library',
        library.path
      )

      setLibraryStore(openedLibrary.name, openedLibrary.path, openedLibrary.createdAt)

      navigate('/all-items')

      toast.success('Library opened successfully')
    } catch (error) {
      toast.error('Unable to open library')
    }
  }

  const handleShowLibraryLocation = async (): Promise<void> => {
    try {
      await window.electron.ipcRenderer.invoke('show-library-location', library.path)
    } catch (error) {
      toast.error('Unable to show library location')
    }
  }

  const handleRemoveLibraryFromRecent = async (): Promise<void> => {
    try {
      await removeLibraryFromRecent(library.path)

      toast.success('Library removed from recent')
    } catch (error) {
      toast.error('Unable to remove library from recent')
    }
  }

  const handleRenameLibrary = async (): Promise<void> => {
    try {
      if (!newLibraryName || newLibraryName.trim().length === 0) {
        toast.error('Please enter a library name')
        return
      }

      if (newLibraryName.trim() === library.name) {
        setIsEditingLibrary(false)
        return
      }

      if (newLibraryName.trim().length > 50) {
        toast.error('Library name must be less than 50 characters')
        return
      }

      await updateLibraryName(library.path, newLibraryName.trim())

      setIsEditingLibrary(false)

      toast.success('Library renamed successfully')
    } catch (error) {
      toast.error('Unable to rename library')

      setNewLibraryName(library.name)

      setIsEditingLibrary(false)
    }
  }

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>): Promise<void> => {
    if (e.key === 'Enter') {
      await handleRenameLibrary()
    } else if (e.key === 'Escape') {
      setNewLibraryName(library.name)

      setIsEditingLibrary(false)
    }
  }

  return (
    <div className="flex items-center justify-between p-3 border border-zinc-200 dark:border-zinc-800 rounded-md">
      <div className="flex items-center gap-x-2">
        <Library className="size-6 text-zinc-700 dark:text-zinc-300" />
        {isEditingLibrary ? (
          <Input
            ref={inputRef}
            spellCheck="false"
            placeholder="library name"
            value={newLibraryName}
            className="max-w-32 h-auto rounded-none border-0 bg-transparent p-0 text-xs font-medium text-zinc-900 dark:text-zinc-100"
            onKeyDown={handleKeyDown}
            onClick={(e) => e.preventDefault()}
            onChange={(e) => setNewLibraryName(e.target.value)}
          />
        ) : (
          <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 select-none">
            {library.name}
          </p>
        )}
      </div>
      <div className="flex items-center gap-x-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="tertiary">
              <Ellipsis className="size-5 text-zinc-600 dark:text-zinc-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleShowLibraryLocation}>
              show library location
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsEditingLibrary(true)}>
              rename library
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleRemoveLibraryFromRecent}>
              remove from recent
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="secondary" onClick={handleOpenLibrary}>
          open
        </Button>
      </div>
    </div>
  )
}

export default LibraryCard
