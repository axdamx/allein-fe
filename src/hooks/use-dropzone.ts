/**
 * Drag-and-drop + clipboard-paste hook for file attachments.
 *
 * Attach the returned `bind` object to any container element to make it a
 * drop target. While a compatible file is dragged over the window, set
 * `isDragging` to show a visual overlay.
 *
 * The `onFile` callback is the same `handleFile` used by the file-picker
 * button — so dropped/pasted files go through the exact same validation +
 * accept-mime path as picked ones. No parallel logic.
 */
import { useState, useEffect, useCallback, useRef } from 'react'

export interface DropzoneBind {
  /** Spread onto the container div. */
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
}

export function useDropzone(
  onFile: (file: File) => void,
  opts: {
    /** Set false to temporarily disable (e.g. while streaming). */
    enabled?: boolean
    /** Optional callback when a drag enters/leaves — for overlays. */
    onDraggingChange?: (dragging: boolean) => void
  } = {},
): { isDragging: boolean; bind: DropzoneBind } {
  const { enabled = true, onDraggingChange } = opts
  const [isDragging, setIsDragging] = useState(false)
  // Counter handles nested dragenter/dragleave — a child element entering
  // fires dragleave on the parent, which would flicker the overlay without it.
  const dragCounter = useRef(0)
  const onFileRef = useRef(onFile)
  onFileRef.current = onFile

  const setDragging = useCallback(
    (v: boolean) => {
      setIsDragging(v)
      onDraggingChange?.(v)
    },
    [onDraggingChange],
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!enabled) return
      // preventDefault is required to allow a drop.
      e.preventDefault()
    },
    [enabled],
  )

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      if (!enabled) return
      e.preventDefault()
      dragCounter.current -= 1
      if (dragCounter.current <= 0) {
        dragCounter.current = 0
        setDragging(false)
      }
    },
    [enabled, setDragging],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (!enabled) return
      e.preventDefault()
      dragCounter.current = 0
      setDragging(false)

      const files = Array.from(e.dataTransfer?.files ?? [])
      // Take the first file only — the composer is single-attachment.
      const file = files[0]
      if (file) onFileRef.current(file)
    },
    [enabled, setDragging],
  )

  // We also bump the counter on dragenter via a native listener so the overlay
  // appears as soon as the file enters the window, not just when over the
  // composer element itself.
  useEffect(() => {
    if (!enabled) return
    const onDragEnter = (e: DragEvent) => {
      e.preventDefault()
      dragCounter.current += 1
      if (e.dataTransfer?.types?.includes('Files')) {
        setDragging(true)
      }
    }
    const onDragOverDoc = (e: DragEvent) => e.preventDefault()
    const onDropDoc = (e: DragEvent) => {
      // If the drop happens outside the composer's bind target, reset state.
      e.preventDefault()
      dragCounter.current = 0
      setDragging(false)
    }
    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragover', onDragOverDoc)
    window.addEventListener('drop', onDropDoc)
    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragover', onDragOverDoc)
      window.removeEventListener('drop', onDropDoc)
    }
  }, [enabled, setDragging])

  return {
    isDragging,
    bind: { onDragOver: handleDragOver, onDragLeave: handleDragLeave, onDrop: handleDrop },
  }
}

/**
 * Paste hook — extracts image files from clipboard paste events on a target
 * element (the textarea). Browsers put pasted screenshots into
 * `clipboardData.items` as image/ files.
 */
export function usePasteFiles(
  onFile: (file: File) => void,
  opts: { enabled?: boolean } = {},
): (e: React.ClipboardEvent) => void {
  const { enabled = true } = opts
  const onFileRef = useRef(onFile)
  onFileRef.current = onFile

  return useCallback(
    (e: React.ClipboardEvent) => {
      if (!enabled) return
      const items = Array.from(e.clipboardData?.items ?? [])
      const fileItem = items.find(
        (item) => item.kind === 'file' && item.type.startsWith('image/'),
      )
      const file = fileItem?.getAsFile()
      if (file) {
        e.preventDefault()
        onFileRef.current(file)
      }
    },
    [enabled],
  )
}
