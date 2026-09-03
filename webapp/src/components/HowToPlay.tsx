export default function HowToPlay() {
  return (
    <div>
      <div className="rift-card">
        <div className="rift-card-title">Protocol Guide</div>
        <div className="howto-section">
          <div className="howto-title">What is Rift Network?</div>
          <div className="howto-text">
            Rift Network is a Solana protocol enforcing deterministic economic invariants on-chain.
            It separates mathematical state (CoreState) from economic interface (rift_token).
            The token layer can never corrupt the mathematical model — by construction.
          </div>
        </div>
        <div className="howto-section">
          <div className="howto-title">Key Concepts</div>
          <div className="howto-text">
            <strong>Global Field</strong> — A single number representing redistribution across all participants.
            Instead of updating 1,000,000 balances individually (O(N)), we update one field (O(1)).<br/><br/>
            <strong>Effective Balance</strong> — Your actual balance is <code>base_balance + global_field</code>.
            When the field increases, every participant gets richer simultaneously.<br/><br/>
            <strong>Gate Authority</strong> — The admin address that can register users, redistribute, pause/unpause.
          </div>
        </div>
        <div className="howto-section">
          <div className="howto-title">How to Interact</div>
          <div className="howto-steps">
            <div className="howto-step">
              <div className="howto-step-num">1</div>
              <div className="howto-step-text">
                <strong>Connect Wallet</strong> — Click wallet button. Use Phantom, Solflare, Backpack, or any supported Solana wallet.
              </div>
            </div>
            <div className="howto-step">
              <div className="howto-step-num">2</div>
              <div className="howto-step-text">
                <strong>Issue RIFT</strong> — Go to ISSUE RIFT tab. Send SOL to mint RIFT shares based on field pressure.
              </div>
            </div>
            <div className="howto-step">
              <div className="howto-step-num">3</div>
              <div className="howto-step-text">
                <strong>Check Account</strong> — CORE ACCOUNT shows your base balance, effective balance, and debt headroom.
              </div>
            </div>
            <div className="howto-step">
              <div className="howto-step-num">4</div>
              <div className="howto-step-text">
                <strong>Transfer</strong> — Send RIFT to another registered participant. Optional: use directed edge weights.
              </div>
            </div>
            <div className="howto-step">
              <div className="howto-step-num">5</div>
              <div className="howto-step-text">
                <strong>Gate Operations</strong> — If you are gate admin, access GATE ADMIN to register users, redistribute, or pause.
              </div>
            </div>
          </div>
        </div>
        <div className="howto-section">
          <div className="howto-title">SIRM Invariants</div>
          <div className="howto-text">
            Four mathematical rules that must always hold:<br/><br/>
            <code>I1</code> — Supply consistency: total supply equals base sum plus field times participants.<br/>
            <code>I2</code> — Mint/burn accounting: supply equals total minted minus total burned.<br/>
            <code>I3</code> — Dust bound: dust accumulator must be less than participant count.<br/>
            <code>I4</code> — Debt limit: no effective balance below negative supply divided by 10p.
          </div>
        </div>
        <div className="howto-section">
          <div className="howto-title">Important Notes</div>
          <div className="howto-text">
            • This is <strong>DEVNET</strong> — all transactions use test SOL.<br/>
            • Programs verified on-chain via solana-verify.<br/>
            • If protocol is paused, transfers and issuance are blocked.<br/>
            • Fee is capped at 0.10% (10 bps).
          </div>
        </div>
      </div>
    </div>
  )
}
