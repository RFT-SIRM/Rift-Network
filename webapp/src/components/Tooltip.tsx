import { ReactNode, useRef, useState, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  text: string
  formula?: string
  children: ReactNode
}

export default function Tooltip({ text, formula, children }: TooltipProps) {
  const anchorRef = useRef<HTMLSpanElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return
    const anchorRect = anchorRef.current.getBoundingClientRect()
    const popupWidth = popupRef.current?.offsetWidth ?? 260
    const margin = 8

    let left = anchorRect.left + anchorRect.width / 2 - popupWidth / 2
    left = Math.max(margin, Math.min(left, window.innerWidth - popupWidth - margin))

    let top = anchorRect.top - margin
    let placeBelow = false
    if (top < 60) {
      top = anchorRect.bottom + margin
      placeBelow = true
    }

    setPos({ top, left })
    if (popupRef.current) {
      popupRef.current.dataset.placement = placeBelow ? 'bottom' : 'top'
    }
  }, [open])

  return (
    <span
      className="tooltip-container"
      ref={anchorRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onTouchStart={() => setOpen(v => !v)}
    >
      {children}
      {open &&
        createPortal(
          <div
            className="tooltip-popup-fixed"
            ref={popupRef}
            style={{ top: pos.top, left: pos.left }}
          >
            {text}
            {formula && <div className="tooltip-formula">{formula}</div>}
          </div>,
          document.body
        )}
    </span>
  )
}
