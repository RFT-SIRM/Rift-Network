import Tooltip from './Tooltip'

const FACTIONS = [
  { id: 'resonance', name: 'RESONANCE GUILD', icon: '◈', color: 'cyan', desc: 'Masters of field manipulation. They believe global_field is the true measure of wealth.', members: 142, power: 'High', field: '+2,340' },
  { id: 'invariant', name: 'INVARIANT ORDER', icon: '◉', color: 'violet', desc: 'Guardians of mathematical truth. They enforce I1-I4 at every block.', members: 89, power: 'Medium', field: '+1,120' },
  { id: 'entropy', name: 'ENTROPY CULT', icon: '◐', color: 'amber', desc: 'Believers in controlled chaos. They trigger neg_entropy to test protocol resilience.', members: 256, power: 'Very High', field: '-890' },
  { id: 'genesis', name: 'GENESIS CIRCLE', icon: '●', color: 'green', desc: 'Founding participants. They hold original gate keys and mint authority.', members: 7, power: 'Absolute', field: '+31,400' },
]

export default function Factions() {
  return (
    <div>
      <div className="rift-card">
        <div className="rift-card-title">Active Factions</div>
        <div className="factions-grid">
          {FACTIONS.map((f) => (
            <Tooltip key={f.id} text={`${f.desc} Field: ${f.field}`}>
              <div className={`faction-card ${f.color}`}>
                <div className="faction-icon" style={{ color: `var(--rift-${f.color})` }}>{f.icon}</div>
                <div className="faction-name">{f.name}</div>
                <div className="faction-desc">{f.desc}</div>
                <div className="faction-stats">
                  <div className="faction-stat">Members: <span>{f.members}</span></div>
                  <div className="faction-stat">Power: <span>{f.power}</span></div>
                </div>
              </div>
            </Tooltip>
          ))}
        </div>
      </div>
    </div>
  )
}
