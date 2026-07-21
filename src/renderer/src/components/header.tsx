import { useState, useEffect } from 'react'

import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import { Ellipsis, PanelRightOpen, PanelRightClose } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent
} from '@renderer/components/dropdown-menu'
import { Input } from '@renderer/components/input'
import { Button } from '@renderer/components/button'
import WhatsAppImportDialog from '@renderer/components/whatsapp-import-dialog'
import ThemeToggle from '@renderer/components/theme-toggle'

import useLibraryStore from '@renderer/stores/LibraryStore'
import useLinksStore from '@renderer/stores/LinksStore'
import useSidebarStore from '@renderer/stores/SidebarStore'

import cn from '@renderer/utils/cn'
import type { WhatsAppReview } from '@renderer/types/whatsapp'

const Header = (): JSX.Element => {
  const { getLinks, importBookmarks, exportBookmarks, selectWhatsAppChat, importWhatsAppLinks } =
    useLinksStore()
  const { isSidebarOpen, setIsSidebarOpen } = useSidebarStore()
  const { name, apiPort, getApiPort, updateApiPort } = useLibraryStore()

  const [open, setOpen] = useState(false)
  const [newPort, setNewPort] = useState('')
  const [whatsAppReview, setWhatsAppReview] = useState<WhatsAppReview | null>(null)

  const isMacOS = window.api.platform === 'darwin'

  useEffect(() => {
    const loadApiPort = async (): Promise<void> => {
      try {
        await getApiPort()
      } catch (error) {
        toast.error('Unable to load API port')
      }
    }

    loadApiPort()
  }, [getApiPort])

  useEffect(() => {
    if (apiPort) {
      setNewPort(apiPort.toString())
    }
  }, [apiPort])

  const handleUpdatePort = async (): Promise<void> => {
    try {
      const portNumber = parseInt(newPort, 10)

      if (!newPort || newPort.trim().length === 0) {
        toast.error('Please enter a port number')
        return
      }

      if (isNaN(portNumber)) {
        toast.error('Port must be a valid number')
        return
      }

      if (portNumber < 1024 || portNumber > 65535) {
        toast.error('Port must be between 1024 and 65535')
        return
      }

      if (portNumber === apiPort) {
        setOpen(false)
        return
      }

      await updateApiPort(portNumber)

      setOpen(false)

      toast.success('API port updated successfully')
    } catch (error) {
      toast.error('Unable to update API port')
    }
  }

  const handleOpenChange = async (isOpen: boolean): Promise<void> => {
    try {
      if (isOpen) {
        await getApiPort()

        if (apiPort) {
          setNewPort(apiPort.toString())
        }
      }

      setOpen(isOpen)
    } catch (error) {
      toast.error('Unable to load API port')

      setOpen(false)
    }
  }

  const handleImportBookmarks = async (): Promise<void> => {
    try {
      await importBookmarks()

      toast.success('Bookmarks imported successfully')
    } catch (error) {
      toast.error('Unable to import bookmarks')
    }
  }

  const handleExportBookmarks = async (): Promise<void> => {
    try {
      await exportBookmarks()

      toast.success('Bookmarks exported successfully')
    } catch (error) {
      toast.error('Unable to export bookmarks')
    }
  }

  const handleSelectWhatsAppChat = async (): Promise<void> => {
    try {
      const result = await selectWhatsAppChat()

      if (result.status === 'cancelled') return
      if (result.status === 'empty') {
        toast.info('No links were found in that chat export')
        return
      }

      setWhatsAppReview({ ...result, status: 'ready' })
    } catch {
      toast.error('Unable to read that WhatsApp export')
    }
  }

  return (
    <>
      <header
        className={cn(
          'w-full flex items-center justify-between px-2.5 py-3 [-webkit-app-region:drag]',
          !isSidebarOpen && isMacOS && 'pl-[6.375rem]'
        )}
      >
        <div className="flex items-center gap-x-2">
          <Button
            variant="tertiary"
            size="icon"
            className="[-webkit-app-region:no-drag]"
            aria-label={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            aria-expanded={isSidebarOpen}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? (
              <PanelRightOpen className="size-5 text-zinc-600 dark:text-zinc-400" />
            ) : (
              <PanelRightClose className="size-5 text-zinc-600 dark:text-zinc-400" />
            )}
          </Button>
          <Button asChild variant="tertiary" className="[-webkit-app-region:no-drag]">
            <Link to="/" draggable="false">
              {name}
            </Link>
          </Button>
        </div>
        <div className="flex items-center gap-1 [-webkit-app-region:no-drag]">
          <ThemeToggle />
          <DropdownMenu open={open} onOpenChange={handleOpenChange}>
            <DropdownMenuTrigger asChild>
              <Button variant="tertiary" size="icon" aria-label="Open Pasted menu">
                <Ellipsis className="size-5 text-zinc-600 dark:text-zinc-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleSelectWhatsAppChat}>
                import WhatsApp chat
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleImportBookmarks}>import bookmarks</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportBookmarks}>export bookmarks</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>update api port</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <div className="w-full relative flex flex-col gap-y-1">
                    <Input
                      type="number"
                      aria-label="API port"
                      placeholder="api port"
                      className="w-full h-[1.625rem] text-xs appearance-none"
                      value={newPort}
                      min={1024}
                      max={65535}
                      onChange={(e) => setNewPort(e.target.value)}
                    />
                    <Button variant="secondary" onClick={handleUpdatePort}>
                      update
                    </Button>
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      {whatsAppReview && (
        <WhatsAppImportDialog
          review={whatsAppReview}
          onClose={() => setWhatsAppReview(null)}
          onImported={getLinks}
          onImport={importWhatsAppLinks}
        />
      )}
    </>
  )
}

export default Header
