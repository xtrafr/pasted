import { Moon, Sun } from 'lucide-react'

import { Button } from '@renderer/components/button'
import { useTheme } from '@renderer/components/theme-provider'

const ThemeToggle = ({ className }: { className?: string }): JSX.Element => {
  const { theme, setTheme } = useTheme()
  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  return (
    <Button
      variant="tertiary"
      size="icon"
      className={className}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
      onClick={() => setTheme(nextTheme)}
    >
      {theme === 'dark' ? (
        <Sun className="size-4 text-zinc-400" />
      ) : (
        <Moon className="size-4 text-zinc-600" />
      )}
    </Button>
  )
}

export default ThemeToggle
