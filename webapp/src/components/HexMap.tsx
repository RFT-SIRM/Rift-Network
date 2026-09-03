import { useState } from 'react'

interface HexCell {
  id: string
  label: string
  active: boolean
  type: 'core' | 'node' | 'empty'
}

function generateHexGrid(rows: number, cols: number): HexCell[][] {
  const grid: HexCell[][] = []
  const labels = ['A','B','C','D','E','F','G','H','I','J','K','L']
  for (let r = 0; r < rows; r++) {
    const row: HexCell[] = []
    for (let c = 0; c < cols; c++) {
      const isCore = r === 2 && c === 3
      const isNode = Math.random() > 0.6 && !isCore
      row.push({
        id: `${labels[r]}${c+1}`,
        label: isCore ? 'CORE' : isNode ? `N${r}${c}` : '',
        active: isCore || isNode,
        type: isCore ? 'core' : isNode ? 'node' : 'empty',
      })
    }
    grid.push(row)
  }
  return grid
}

export default function HexMap() {
  const [grid] = useState(() => generateHexGrid(5, 7))
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div className="hex-map-container">
      <div className="rift-card-title">Network Topology — Hex Grid</div>
      <div className="hex-grid">
        {grid.map((row, ri) => (
          <div className="hex-row" key={ri}>
            {row.map((cell) => (
              <div key={cell.id} className={`hex-cell ${cell.active ? 'active' : ''} ${selected === cell.id ? 'active' : ''}`} onClick={() => setSelected(cell.id)}>
                <div className="hex-content">{cell.label}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="hex-legend">
        <div className="hex-legend-item">
          <div className="hex-legend-dot" style={{ background: 'var(--rift-cyan)', borderColor: 'var(--rift-cyan)', boxShadow: '0 0 8px var(--rift-cyan-glow)' }} />
          Core State
        </div>
        <div className="hex-legend-item">
          <div className="hex-legend-dot" style={{ background: 'var(--rift-violet)', borderColor: 'var(--rift-violet)', boxShadow: '0 0 8px var(--rift-violet-glow)' }} />
          Active Node
        </div>
        <div className="hex-legend-item">
          <div className="hex-legend-dot" style={{ background: 'var(--rift-surface-raised)', borderColor: 'var(--rift-border)' }} />
          Empty Sector
        </div>
      </div>
      <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: 'var(--rift-text-muted)' }}>
        Click any sector to inspect. CoreState at sector D4.
      </div>
    </div>
  )
}
