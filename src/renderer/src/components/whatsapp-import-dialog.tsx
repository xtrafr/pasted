import { useEffect, useMemo, useRef, useState } from 'react'

import { AlertTriangle, Check, Link2, ShieldCheck, X } from 'lucide-react'
import { Virtuoso } from 'react-virtuoso'
import { toast } from 'sonner'

import { Button } from '@renderer/components/button'
import type { WhatsAppImportResult, WhatsAppReview } from '@renderer/types/whatsapp'

interface WhatsAppImportDialogProps {
  review: WhatsAppReview
  onClose: () => void
  onImported: () => Promise<void>
  onImport: (selection: Array<{ url: string }>) => Promise<WhatsAppImportResult>
}

const maskSensitiveUrl = (value: string): string => {
  try {
    const url = new URL(value)
    return `${url.origin}/sensitive-link-hidden`
  } catch {
    return 'Sensitive link hidden'
  }
}

const maskAdultUrl = (value: string): string => {
  try {
    return `${new URL(value).origin}/adult-link-hidden`
  } catch {
    return 'Adult link hidden'
  }
}

const WhatsAppImportDialog = ({
  review,
  onClose,
  onImported,
  onImport
}: WhatsAppImportDialogProps): JSX.Element => {
  const dialogRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const safeCandidateIds = useMemo(
    () =>
      review.candidates
        .filter(
          (candidate) =>
            !candidate.alreadySaved && !candidate.sensitive && !candidate.potentiallyAdult
        )
        .map((candidate) => candidate.id),
    [review]
  )
  const [selected, setSelected] = useState<Set<string>>(() => new Set(safeCandidateIds))
  const [sfwMode, setSfwMode] = useState(true)
  const [isImporting, setIsImporting] = useState(false)

  const adultCount = useMemo(
    () => review.candidates.filter((candidate) => candidate.potentiallyAdult).length,
    [review]
  )

  useEffect(() => {
    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeButtonRef.current?.focus()

    return (): void => previouslyFocusedRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !isImporting) onClose()

      if (event.key !== 'Tab') return

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((element) => !element.hasAttribute('hidden'))

      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return (): void => window.removeEventListener('keydown', handleKeyDown)
  }, [isImporting, onClose])

  const toggleCandidate = (id: string): void => {
    const candidate = review.candidates.find((item) => item.id === id)
    if (!candidate || candidate.alreadySaved || (sfwMode && candidate.potentiallyAdult)) return

    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSfwModeChange = (enabled: boolean): void => {
    setSfwMode(enabled)

    if (enabled) {
      const adultIds = new Set(
        review.candidates
          .filter((candidate) => candidate.potentiallyAdult)
          .map((candidate) => candidate.id)
      )

      setSelected(
        (current) => new Set([...current].filter((candidateId) => !adultIds.has(candidateId)))
      )
    }
  }

  const handleImport = async (): Promise<void> => {
    if (selected.size === 0) return

    setIsImporting(true)

    try {
      const selection = review.candidates
        .filter(
          (candidate) =>
            selected.has(candidate.id) &&
            !candidate.alreadySaved &&
            (!sfwMode || !candidate.potentiallyAdult)
        )
        .map((candidate) => ({ url: candidate.url }))
      const result = await onImport(selection)

      try {
        await onImported()
      } catch {
        toast.warning(`Imported ${result.imported} links, but the library view could not refresh.`)
        onClose()
        return
      }

      if (result.failed > 0) {
        toast.warning(`Imported ${result.imported} links. ${result.failed} could not be imported.`)
      } else if (result.metadataFailed > 0 || result.metadataSkipped > 0) {
        toast.warning(
          `Imported ${result.imported} links. ${result.metadataEnriched} previews were added, and ${result.metadataFailed + result.metadataSkipped} were unavailable or skipped.`
        )
      } else {
        toast.success(
          `Imported ${result.imported} WhatsApp links with ${result.metadataEnriched} previews`
        )
      }

      onClose()
    } catch {
      toast.error('Unable to import the selected WhatsApp links')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-6 [-webkit-app-region:no-drag]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isImporting) onClose()
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="whatsapp-import-title"
        aria-describedby="whatsapp-import-description"
        className="flex h-[min(42rem,calc(100vh-3rem))] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <header className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div>
            <div className="mb-1 flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
              <Link2 className="size-4" />
              <h2 id="whatsapp-import-title" className="text-sm font-semibold">
                Review WhatsApp links
              </h2>
            </div>
            <p
              id="whatsapp-import-description"
              className="text-xs leading-5 text-zinc-500 dark:text-zinc-400"
            >
              Only the links you select are saved. Chat messages and sender details stay out of
              Pasted.
            </p>
          </div>
          <Button
            ref={closeButtonRef}
            variant="tertiary"
            size="icon"
            aria-label="Close WhatsApp import"
            disabled={isImporting}
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </header>

        {(!review.detectedWhatsApp || review.truncated) && (
          <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-5 py-3 text-xs leading-5 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/50 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>
              {!review.detectedWhatsApp
                ? 'This file does not look like a standard WhatsApp export. Check the links before importing.'
                : 'This chat contains more than 10,000 unique links. The first 10,000 are shown.'}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
          <div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {review.candidates.length}
              </span>{' '}
              found
              {review.duplicateExisting > 0 && `, ${review.duplicateExisting} already saved`}
              {review.duplicateInFile > 0 && `, ${review.duplicateInFile} repeated in chat`}
              {adultCount > 0 && `, ${adultCount} likely adult`}
              {review.invalid > 0 && `, ${review.invalid} invalid or unsafe`}
            </p>
            <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-500">
              SFW detection runs locally and may not catch every adult link.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                role="switch"
                className="peer sr-only"
                checked={sfwMode}
                disabled={isImporting}
                onChange={(event) => handleSfwModeChange(event.target.checked)}
              />
              <span className="relative h-4 w-7 rounded-full bg-zinc-300 transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-3 after:rounded-full after:bg-white after:transition-transform after:content-[''] peer-checked:bg-zinc-700 peer-checked:after:translate-x-3 dark:bg-zinc-700 dark:peer-checked:bg-zinc-300 dark:peer-checked:after:bg-zinc-900" />
              <ShieldCheck className="size-3.5" />
              SFW
            </label>
            <Button
              variant="secondary"
              disabled={isImporting}
              onClick={() => setSelected(new Set(safeCandidateIds))}
            >
              select safe
            </Button>
            <Button
              variant="secondary"
              disabled={isImporting}
              onClick={() => setSelected(new Set())}
            >
              clear
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1">
          <Virtuoso
            data={review.candidates}
            computeItemKey={(_index, candidate) => candidate.id}
            itemContent={(_index, candidate) => {
              const filteredBySfw = sfwMode && candidate.potentiallyAdult
              const disabled = candidate.alreadySaved || filteredBySfw || isImporting
              const displayUrl = candidate.sensitive
                ? maskSensitiveUrl(candidate.url)
                : filteredBySfw
                  ? maskAdultUrl(candidate.url)
                  : candidate.url

              return (
                <label
                  className={`mx-5 flex gap-3 border-b border-zinc-100 py-3 dark:border-zinc-800 ${
                    candidate.alreadySaved || filteredBySfw
                      ? 'cursor-not-allowed opacity-55'
                      : 'cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 shrink-0 accent-zinc-700 dark:accent-zinc-300"
                    checked={selected.has(candidate.id)}
                    disabled={disabled}
                    onChange={() => toggleCandidate(candidate.id)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-800 dark:text-zinc-200">
                      {new URL(candidate.url).hostname}
                      {candidate.alreadySaved && (
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          saved
                        </span>
                      )}
                      {candidate.sensitive && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          sensitive
                        </span>
                      )}
                      {candidate.potentiallyAdult && (
                        <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          likely adult
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {displayUrl}
                    </span>
                    {candidate.sourceDate && (
                      <span className="mt-1 block text-[10px] text-zinc-400 dark:text-zinc-500">
                        {candidate.sourceDate}
                      </span>
                    )}
                  </span>
                </label>
              )
            }}
          />
        </div>

        <footer className="flex items-center justify-between gap-4 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <p
            className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400"
            aria-live="polite"
          >
            <Check className="size-3.5" /> {selected.size} selected
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" disabled={isImporting} onClick={onClose}>
              cancel
            </Button>
            <Button disabled={selected.size === 0 || isImporting} onClick={handleImport}>
              {isImporting ? 'importing and fetching details...' : `import ${selected.size} links`}
            </Button>
          </div>
        </footer>
      </section>
    </div>
  )
}

export default WhatsAppImportDialog
