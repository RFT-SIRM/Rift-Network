import { ReactNode } from 'react'

interface TooltipProps {
  text: string
  formula?: string
  children: ReactNode
}

export default function Tooltip({ text, formula, children }: TooltipProps) {
  return (
    <span className="tooltip-container">
      {children}
      <span className="tooltip-popup">
        {text}
        {formula && <div className="tooltip-formula">{formula}</div>}
      </span>
    </span>
  )
}
