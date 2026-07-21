const storedTheme = localStorage.getItem('pasted-theme')
const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
const theme =
  storedTheme === 'light' || storedTheme === 'dark'
    ? storedTheme
    : systemPrefersDark
      ? 'dark'
      : 'light'

document.documentElement.classList.toggle('dark', theme === 'dark')
document.documentElement.style.colorScheme = theme
