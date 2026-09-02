import { useState } from 'react'
import { NotificationProvider } from './utils/notifications'
import WalletBar from './components/WalletBar'
import WorldLiquidity from './components/WorldLiquidity'
import Overview from './components/Overview'
import IssueRift from './components/IssueRift'
import CoreAccount from './components/CoreAccount'
import Transfer from './components/Transfer'
import GateAdmin from './components/GateAdmin'

type Tab = 'overview' | 'issue' | 'core' | 'transfer' | 'gate'

function AppInner() {
  const [tab, setTab] = useState<Tab>('overview')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'issue', label: 'Issue RIFT' },
    { key: 'core', label: 'Core account' },
    { key: 'transfer', label: 'Transfer' },
    { key: 'gate', label: 'Gate admin' },
  ]

  return (
    <div className="rift-app">
      <div className="rift-hero">
        <div className="rift-logo-wrap">
          <svg className="rift-logo-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ animation: 'spin 20s linear infinite' }}>
            <ellipse cx="24" cy="24" rx="18" ry="10" stroke="#22d3ee" strokeWidth="2" fill="none" opacity="0.85"/>
            <ellipse cx="24" cy="24" rx="18" ry="10" stroke="#22d3ee" strokeWidth="2" fill="none" opacity="0.85" transform="rotate(60 24 24)"/>
            <ellipse cx="24" cy="24" rx="18" ry="10" stroke="#22d3ee" strokeWidth="2" fill="none" opacity="0.85" transform="rotate(120 24 24)"/>
            <line x1="24" y1="14" x2="24" y2="34" stroke="#fafafa" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="24" cy="24" r="2" fill="#22d3ee"/>
          </svg>
          <div>
            <h1>Rift Network</h1>
            <p>SIRM invariant layer on Solana · Devnet</p>
          </div>
        </div>
      </div>

      <WalletBar />
      <WorldLiquidity />

      <div className="rift-tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`rift-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview />}
      {tab === 'issue' && <IssueRift />}
      {tab === 'core' && <CoreAccount />}
      {tab === 'transfer' && <Transfer />}
      {tab === 'gate' && <GateAdmin />}
    </div>
  )
}

export default function App() {
  return (
    <NotificationProvider>
      <AppInner />
    </NotificationProvider>
  )
}
