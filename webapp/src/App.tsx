import { useState } from 'react'
import { NotificationProvider } from './utils/notifications'
import WalletBar from './components/WalletBar'
import WorldLiquidity from './components/WorldLiquidity'
import Dashboard from './components/Dashboard'
import HexMap from './components/HexMap'
import Factions from './components/Factions'
import HowToPlay from './components/HowToPlay'
import IssueRift from './components/IssueRift'
import CoreAccount from './components/CoreAccount'
import Transfer from './components/Transfer'
import GateAdmin from './components/GateAdmin'
import TelemetryFeed from './components/TelemetryFeed'

type Tab = 'rift' | 'map' | 'factions' | 'dashboard' | 'howto' | 'issue' | 'core' | 'transfer' | 'gate'

function AppInner() {
  const [tab, setTab] = useState<Tab>('rift')

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'rift', label: 'RIFT', icon: '◈' },
    { key: 'map', label: 'MAP', icon: '▣' },
    { key: 'factions', label: 'FACTIONS', icon: '◉' },
    { key: 'dashboard', label: 'DASHBOARD', icon: '◐' },
    { key: 'howto', label: 'HOW TO PLAY', icon: '?' },
  ]

  const actionTabs: { key: Tab; label: string }[] = [
    { key: 'issue', label: 'ISSUE RIFT' },
    { key: 'core', label: 'CORE ACCOUNT' },
    { key: 'transfer', label: 'TRANSFER' },
    { key: 'gate', label: 'GATE ADMIN' },
  ]

  const goBack = () => { setTab('rift') }

  const isActionTab = actionTabs.some(t => t.key === tab)

  return (
    <div className="rift-app">
      <div className="crt-overlay" />
      <div className="grid-bg" />
      <div className="scanline-overlay" />
      <div className="rift-header">
        <div className="rift-brand">
          <div className="rift-logo-wrap">
            <svg className="rift-logo-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
                <filter id="logoGlow">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <ellipse cx="24" cy="24" rx="18" ry="10" stroke="url(#logoGrad)" strokeWidth="1.5" fill="none" opacity="0.9" filter="url(#logoGlow)"/>
              <ellipse cx="24" cy="24" rx="18" ry="10" stroke="url(#logoGrad)" strokeWidth="1.5" fill="none" opacity="0.7" transform="rotate(60 24 24)" filter="url(#logoGlow)"/>
              <ellipse cx="24" cy="24" rx="18" ry="10" stroke="url(#logoGrad)" strokeWidth="1.5" fill="none" opacity="0.5" transform="rotate(120 24 24)" filter="url(#logoGlow)"/>
              <line x1="24" y1="14" x2="24" y2="34" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" opacity="0.8"/>
              <circle cx="24" cy="24" r="2" fill="#22d3ee" filter="url(#logoGlow)">
                <animate attributeName="r" values="2;3;2" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
              </circle>
            </svg>
            <div>
              <h1>RIFT NETWORK</h1>
              <p className="rift-subtitle">SIRM INVARIANT LAYER · <span className="devnet-badge">DEVNET</span></p>
            </div>
          </div>
        </div>
        <TelemetryFeed />
      </div>
      <WalletBar />
      <WorldLiquidity />
      <div className="rift-tabs">
        {tabs.map((t) => (
          <button key={t.key} className={`rift-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </div>
      {isActionTab && (
        <div className="rift-action-bar">
          <button className="rift-back-btn" onClick={goBack}><span>←</span> BACK</button>
          <div className="rift-action-tabs">
            {actionTabs.map((t) => (
              <button key={t.key} className={`rift-action-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
            ))}
          </div>
        </div>
      )}
      <div className="rift-content">
        {tab === 'rift' && <Dashboard />}
        {tab === 'map' && <HexMap />}
        {tab === 'factions' && <Factions />}
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'howto' && <HowToPlay />}
        {tab === 'issue' && <IssueRift />}
        {tab === 'core' && <CoreAccount />}
        {tab === 'transfer' && <Transfer />}
        {tab === 'gate' && <GateAdmin />}
      </div>
      <div className="rift-footer">
        <div className="rift-footer-left"><span className="footer-blink">●</span> SYSTEM ONLINE</div>
        <div className="rift-footer-right">RFT-SIRM · ULTRACORE · 2026</div>
      </div>
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
