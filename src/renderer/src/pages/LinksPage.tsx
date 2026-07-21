import { useEffect, useMemo, useState, memo } from 'react'

import { Virtuoso } from 'react-virtuoso'

import { useOutletContext } from 'react-router-dom'

import LinkCard from '@renderer/components/link-card'
import EmptyState from '@renderer/components/empty-state'
import LinkGroupFilter from '@renderer/components/link-group-filter'

import useLinksStore from '@renderer/stores/LinksStore'

const LinksPage = (): JSX.Element => {
  const { links, getLinks } = useLinksStore()
  const [activeGroup, setActiveGroup] = useState<string | null>(null)

  const scrollParent = useOutletContext<HTMLDivElement | null>()

  useEffect(() => {
    getLinks()
  }, [getLinks])

  const groups = useMemo(() => {
    const counts = new Map<string, number>()

    for (const link of links) {
      const linkGroups = Array.isArray(link.groups) ? [...new Set(link.groups)] : []
      for (const group of linkGroups) counts.set(group, (counts.get(group) ?? 0) + 1)
    }

    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => left.name.localeCompare(right.name))
  }, [links])

  const filteredLinks = useMemo(
    () =>
      activeGroup
        ? links.filter((link) => Array.isArray(link.groups) && link.groups.includes(activeGroup))
        : links,
    [activeGroup, links]
  )

  useEffect(() => {
    if (activeGroup && !groups.some((group) => group.name === activeGroup)) setActiveGroup(null)
  }, [activeGroup, groups])

  if (links.length === 0) {
    return (
      <div className="w-full h-full max-w-3xl mx-auto px-6 pb-10 pt-8 flex items-center justify-center">
        <EmptyState text="No links found" supportingText="Add your first link to get started" />
      </div>
    )
  }

  return (
    <div className="w-full h-full max-w-3xl mx-auto px-6 pb-10 pt-8 flex flex-col items-center">
      <LinkGroupFilter
        activeGroup={activeGroup}
        groups={groups}
        resultCount={filteredLinks.length}
        onChange={setActiveGroup}
      />
      <Virtuoso
        data={filteredLinks}
        computeItemKey={(_index, link) => link.id}
        itemContent={(_index, link) => <LinkCard link={link} />}
        customScrollParent={scrollParent || undefined}
        className="virtualized-links-container w-full"
      />
    </div>
  )
}

export default memo(LinksPage)
