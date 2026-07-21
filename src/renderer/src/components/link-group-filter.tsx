interface LinkGroupFilterProps {
  activeGroup: string | null
  groups: Array<{ name: string; count: number }>
  resultCount: number
  onChange: (group: string | null) => void
}

const LinkGroupFilter = ({
  activeGroup,
  groups,
  resultCount,
  onChange
}: LinkGroupFilterProps): JSX.Element => {
  if (groups.length === 0) return <></>

  return (
    <div className="mb-4 w-full">
      <div
        role="group"
        aria-label="Filter links by topic"
        className="flex w-full items-center gap-1.5 overflow-x-auto pb-1"
      >
        <button
          type="button"
          aria-pressed={activeGroup === null}
          className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 dark:focus-visible:ring-zinc-400 dark:focus-visible:ring-offset-zinc-950 ${
            activeGroup === null
              ? 'border-zinc-800 bg-zinc-800 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950'
              : 'border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
          }`}
          onClick={() => onChange(null)}
        >
          all
        </button>
        {groups.map((group) => (
          <button
            key={group.name}
            type="button"
            aria-pressed={activeGroup === group.name}
            className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 dark:focus-visible:ring-zinc-400 dark:focus-visible:ring-offset-zinc-950 ${
              activeGroup === group.name
                ? 'border-zinc-800 bg-zinc-800 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950'
                : 'border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
            onClick={() => onChange(group.name)}
          >
            {group.name.toLowerCase()} {group.count}
          </button>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {resultCount} {resultCount === 1 ? 'link' : 'links'} shown
      </p>
    </div>
  )
}

export default LinkGroupFilter
