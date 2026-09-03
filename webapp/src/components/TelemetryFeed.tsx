import { useState, useEffect } from 'react'

interface TelemetryEvent {
  id: number
  type: 'prosperity' | 'collapse' | 'seismic' | 'shockwave' | 'newage' | 'sim'
  message: string
  time: string
}

const EVENT_TYPES = {
  prosperity: 'PROSPERITY',
  collapse: 'COLLAPSE',
  seismic: 'SEISMIC',
  shockwave: 'SHOCKWAVE',
  newage: 'NEW AGE',
  sim: 'SIM',
}

const SIM_EVENTS: TelemetryEvent[] = [
  { id: 1, type: 'newage', message: 'CoreState initialized', time: 'T-00:00' },
  { id: 2, type: 'prosperity', message: 'First participant registered', time: 'T-00:01' },
  { id: 3, type: 'seismic', message: 'Redistribute() +900 field', time: 'T-00:02' },
  { id: 4, type: 'shockwave', message: '31.4 shares minted to gate', time: 'T-00:03' },
  { id: 5, type: 'prosperity', message: 'Invariants I1-I4 verified', time: 'T-00:04' },
]

export default function TelemetryFeed() {
  const [events, setEvents] = useState<TelemetryEvent[]>(SIM_EVENTS)

  useEffect(() => {
    const interval = setInterval(() => {
      setEvents(prev => {
        const types: TelemetryEvent['type'][] = ['prosperity', 'seismic', 'shockwave', 'newage']
        const type = types[Math.floor(Math.random() * types.length)]
        const messages: Record<string, string[]> = {
          prosperity: ['Field redistribution', 'New edge weight set', 'Balance updated'],
          collapse: ['Invariant violation detected', 'Protocol paused', 'Emergency halt'],
          seismic: ['Global field shifted', 'Supply recalculated', 'Base sum adjusted'],
          shockwave: ['Token issued', 'Fee collected', 'Mint invoked'],
          newage: ['Protocol tick', 'State sync', 'Invariant check passed'],
          sim: ['Simulation tick', 'Demo event', 'Test signal'],
        }
        const msg = messages[type][Math.floor(Math.random() * messages[type].length)]
        const now = new Date()
        const time = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`
        return [{ id: Date.now(), type, message: msg, time }, ...prev.slice(0, 5)]
      })
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="telemetry-feed">
      <div className="telemetry-header">
        <span className="telemetry-blink" />
        CHAIN TELEMETRY
      </div>
      <div className="telemetry-list">
        {events.map((ev) => (
          <div className="telemetry-item" key={ev.id}>
            <span className={`event-type ${ev.type}`}>{EVENT_TYPES[ev.type]}</span>
            <span>{ev.message}</span>
            <span className="event-time">{ev.time}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
