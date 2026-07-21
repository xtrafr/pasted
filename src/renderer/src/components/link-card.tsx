import { useState, useEffect } from 'react'

import { toast } from 'sonner'

import { Check, Globe } from 'lucide-react'

import { useClickAway } from '@uidotdev/usehooks'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@renderer/components/tooltip'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent
} from '@renderer/components/context-menu'
import { Input } from '@renderer/components/input'
import { ScrollArea } from '@renderer/components/scroll-area'
import ImageWithFallback from '@renderer/components/image-with-fallback'

import useLinksStore from '@renderer/stores/LinksStore'
import useFoldersStore from '@renderer/stores/FoldersStore'

import formatTimestamp from '@renderer/utils/formatTimestamp'

const getDisplayHostname = (url: string): string => {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

const LinkCard = ({ link }: { link: Link }): JSX.Element => {
  const { folders } = useFoldersStore()
  const { deleteLink, updateLinkFolder, updateLinkTitle, updateLinkPin } = useLinksStore()

  const [isEditingLink, setIsEditingLink] = useState(false)
  const [newLinkTitle, setNewLinkTitle] = useState(link.title)

  const inputRef = useClickAway<HTMLInputElement>(() => {
    setIsEditingLink(false)
    setNewLinkTitle(link.title)
  })

  useEffect(() => {
    if (isEditingLink && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.select()
      }, 100)
    }
  }, [isEditingLink])

  useEffect(() => {
    setNewLinkTitle(link.title)
  }, [link.title])

  const handleDeleteLink = async (): Promise<void> => {
    try {
      await deleteLink(link.id)

      toast.success('Link deleted successfully')
    } catch (error) {
      toast.error('Unable to delete link')
    }
  }

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>): Promise<void> => {
    if (e.key === 'Enter') {
      try {
        if (!newLinkTitle || newLinkTitle.trim().length === 0) {
          toast.error('Please enter a link title')
          return
        }

        if (newLinkTitle.trim() === link.title) {
          setIsEditingLink(false)
          return
        }

        if (newLinkTitle.trim().length > 100) {
          toast.error('Link title must be less than 100 characters')
          return
        }

        await updateLinkTitle(link.id, newLinkTitle.trim())

        setIsEditingLink(false)

        toast.success('Link renamed successfully')
      } catch (error) {
        toast.error('Unable to rename link')

        setNewLinkTitle(link.title)
        setIsEditingLink(false)
      }
    } else if (e.key === 'Escape') {
      setNewLinkTitle(link.title)

      setIsEditingLink(false)
    }
  }

  const handleOpenLink = (): void => {
    try {
      window.open(link.url, '_blank')
    } catch (error) {
      toast.error('Unable to open link')
    }
  }

  const handleCopyUrl = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(link.url)
      toast.success('Link copied to clipboard')
    } catch (error) {
      toast.error('Unable to copy link')
    }
  }

  const handleUpdateLinkPin = async (): Promise<void> => {
    try {
      await updateLinkPin(link.id, !link.isPinned)

      toast.success(link.isPinned ? 'Link unpinned successfully' : 'Link pinned successfully')
    } catch (error) {
      toast.error('Unable to update link pin status')
    }
  }

  const handleUpdateLinkFolder = async (folderId: number | null): Promise<void> => {
    try {
      await updateLinkFolder(link.id, folderId)

      toast.success('Link moved successfully')
    } catch (error) {
      toast.error('Unable to move link')
    }
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          role="link"
          tabIndex={isEditingLink ? -1 : 0}
          aria-label={`Open ${link.title || link.url}`}
          className="group flex w-full cursor-default select-none items-center justify-between gap-3 rounded-md px-3 py-2 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-1 data-[state=open]:bg-zinc-50 dark:hover:bg-zinc-900 dark:focus-visible:ring-zinc-400 dark:focus-visible:ring-offset-zinc-950 dark:data-[state=open]:bg-zinc-900"
          onClick={handleOpenLink}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              handleOpenLink()
            }
          }}
        >
          <div className="flex min-w-0 flex-1 items-start gap-x-2">
            <ImageWithFallback
              src={link.iconUrl}
              className="mt-0.5 size-5 rounded select-none"
              fallback={
                <Globe className="mt-0.5 size-5 min-h-5 min-w-5 text-zinc-500 dark:text-zinc-400" />
              }
            />
            {isEditingLink ? (
              <Input
                ref={inputRef}
                spellCheck="false"
                placeholder="link title"
                value={newLinkTitle ?? ''}
                className="h-auto rounded-none border-0 bg-transparent p-0 text-sm font-medium text-zinc-900 dark:text-zinc-100"
                onKeyDown={handleKeyDown}
                onClick={(event) => event.stopPropagation()}
                onChange={(e) => setNewLinkTitle(e.target.value)}
              />
            ) : (
              <div className="min-w-0 flex-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {link.title || link.url}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent
                      collisionPadding={12}
                      className="max-w-[30rem] max-[560px]:max-w-96"
                    >
                      {link.title || link.url}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                  <p className="min-w-0 flex-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {link.description || getDisplayHostname(link.url)}
                  </p>
                  {Array.isArray(link.groups) &&
                    link.groups.slice(0, 2).map((group) => (
                      <span
                        key={group}
                        className="hidden shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 sm:inline dark:bg-zinc-800 dark:text-zinc-400"
                      >
                        {group.toLowerCase()}
                      </span>
                    ))}
                  {Array.isArray(link.groups) && link.groups.length > 2 && (
                    <span className="hidden shrink-0 text-[10px] text-zinc-400 sm:inline dark:text-zinc-500">
                      +{link.groups.length - 2}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          {!isEditingLink && (
            <p className="hidden whitespace-nowrap text-xs font-medium text-zinc-500 group-hover:block dark:text-zinc-400">
              {link.productPrice
                ? link.productPrice
                : link.readTime
                  ? link.readTime
                  : formatTimestamp(link.createdAt)}
            </p>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={handleOpenLink}>open link</ContextMenuItem>
        <ContextMenuItem onClick={handleCopyUrl}>copy url</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleUpdateLinkPin}>
          {link.isPinned ? 'unpin link' : 'pin link'}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => setIsEditingLink(true)}>rename link</ContextMenuItem>
        {folders.length > 0 && (
          <>
            <ContextMenuSub>
              <ContextMenuSubTrigger>move to folder</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ScrollArea className="max-h-64 flex flex-col">
                  {folders.map((folder) => (
                    <ContextMenuItem
                      key={folder.id}
                      onClick={() =>
                        handleUpdateLinkFolder(folder.id === link.folderId ? null : folder.id)
                      }
                    >
                      {folder.name}
                      {folder.id === link.folderId && (
                        <Check className="size-4 ml-auto text-zinc-500 dark:text-zinc-400" />
                      )}
                    </ContextMenuItem>
                  ))}
                </ScrollArea>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleDeleteLink}>delete link</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

export default LinkCard
