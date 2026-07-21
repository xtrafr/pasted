import addLink from '@main/utils/addLink'
import addNote from '@main/utils/addNote'

const DEFAULT_LINK = {
  url: 'https://github.com/xtrafr/pasted',
  title: 'xtrafr/pasted: your private local library for links, notes, images, and chats.',
  iconUrl: 'https://github.githubassets.com/favicons/favicon.svg'
}

const DEFAULT_NOTE = {
  content:
    '<h1>welcome to Pasted</h1><p>Save links, notes, images, and selected links from WhatsApp exports in one private local library.</p><p>Create folders to stay organized.</p><p>Use Markdown to write rich notes.</p><p>Your content stays on your computer.</p>'
}

const createDefaultItems = async (): Promise<void> => {
  try {
    await addLink(DEFAULT_LINK)

    await addNote(DEFAULT_NOTE)
  } catch (error) {
    console.error('Failed to create default items:', error)

    throw new Error('Failed to create default items')
  }
}

export default createDefaultItems
