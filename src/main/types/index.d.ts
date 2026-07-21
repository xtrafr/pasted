interface Library {
  name: string
  path: string
  createdAt: number
}

interface Link {
  id: number
  url: string
  title: string | null
  description: string | null
  iconUrl: string | null
  tags: string[]
  groups: string[]
  folderId: number | null
  productPrice: string | null
  readTime: string | null
  isPinned: boolean
  createdAt: number
  updatedAt: number
}

interface AddLinkProps {
  url: string
  title?: string | null
  description?: string | null
  iconUrl?: string | null
  tags?: string[]
  groups?: string[]
  folderId?: number | null
  productPrice?: string | null
  readTime?: string | null
  isPinned?: boolean
  createdAt?: number
  updatedAt?: number
}

interface Metadata {
  title: string | null
  description: string | null
  iconUrl: string | null
  tags: string[]
  groups: string[]
  productPrice: string | null
  readTime: string | null
}

interface Note {
  id: number
  content: string
  folderId: number | null
  createdAt: number
  updatedAt: number
}

interface AddNoteProps {
  content: string
  folderId?: number | null
  createdAt?: number
  updatedAt?: number
}

interface Image {
  id: number
  fileName: string
  folderId: number | null
  createdAt: number
}

interface Folder {
  id: number
  name: string
  createdAt: number
  updatedAt: number
}

interface AddFolderProps {
  name: string
  createdAt?: number
  updatedAt?: number
}

interface BookmarkLink {
  type: 'url'
  url?: string
  title: string
  dateAdded?: string
  dateModified?: string
}

interface BookmarkFolder {
  type: 'folder'
  title: string
  dateAdded?: string
  dateModified?: string
  children: (BookmarkLink | BookmarkFolder)[]
}

interface Bookmarks {
  children: (BookmarkLink | BookmarkFolder)[]
}

interface FlattenedBookmarkLink {
  type: 'url'
  url: string
  title?: string | null
  createdAt?: number
  updatedAt?: number
}

interface FlattenedBookmarkFolder {
  type: 'folder'
  name: string
  createdAt?: number
  updatedAt?: number
  links: FlattenedBookmarkLink[]
}

type FlattenedBookmarks = (FlattenedBookmarkLink | FlattenedBookmarkFolder)[]
