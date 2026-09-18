import { useState } from 'react'
import { api } from '../api.js'

const CATEGORIES = [
  'MRO', 'IT Hardware', 'Electronic Components', 'IT Services',
  'Raw Materials', 'Mechanical Components', 'Logistics', 'Software Licensing',
]

// ── Role name humaniser ───────────────────────────────────────────────────────
const ROLE_LABELS = {
  'it-manager':         'IT Manager',
  'procurement-head':   'Procurement Head',
  'cfo':                'CFO',
  'ceo':                'CEO',
  'manager':            'Manager',
  'director':           'Director',
  'vp':                 'VP',
  'policy-owner':       'Policy Owner',
  'finance-head':       'Finance Head',
  'ops-manager':        'Operations Manager',
  'legal-counsel':      'Legal Counsel',
  'coo':                'COO',
  'cto':                'CTO',
  'procurement-manager':'Procurement Manager',
  'department-head':    'Department Head',
}

function humaniseRole(raw) {
  if (!raw) return raw
  return ROLE_LABELS[raw.toLowerCase()] ??
    raw.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ── Approval chain visual ─────────────────────────────────────────────────────
function ApprovalChain({ chain }) {
  if (!chain || chain.length === 0) return (
    <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No approvers specified.</p>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
      {chain.map((role, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Approver node */}
          <div style={{
            padding: '0.6rem 1.6rem',
            border: '2px solid var(--accent)',
            borderRadius: 8,
            background: 'var(--accent-dim)',
            fontSize: '1rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            color: 'var(--text)',
            minWidth: 180,
            textAlign: 'center',
          }}>
            {humaniseRole(role)}
          </div>
          {/* Arrow connector — shown between nodes, not after the last */}
          {i < chain.length - 1 && (
            <div style={{
              fontSize: '1.4rem',
              color: 'var(--accent)',
              lineHeight: 1.4,
              userSelect: 'none',
            }}>↓</div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Approval Decision card ────────────────────────────────────────────────────
function ApprovalDecisionCard({ decision }) {
  const isPolicyGap = decision.is_policy_gap
  return (
    <div style={{
      border: `2px solid ${isPolicyGap ? 'var(--red)' : 'var(--accent)'}`,
      borderRadius: 10,
      padding: '1.5rem 1.25rem',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {/* Shield icon SVG — inline, no external deps */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--accent)', textTransform: 'uppercase' }}>
            Approval Required
          </span>
        </div>
        {isPolicyGap && (
          <span className="badge badge-red" style={{ fontSize: '0.72rem', letterSpacing: '0.08em', padding: '3px 10px' }}>
            ⚠ POLICY GAP — Requires Policy Owner
          </span>
        )}
      </div>

      {/* Approval chain — visual centrepiece */}
      <ApprovalChain chain={decision.approval_chain} />

      {/* SLA */}
      <div style={{ textAlign: 'center' }}>
        <span style={{
          display: 'inline-block',
          padding: '0.35rem 1.1rem',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          fontSize: '0.95rem',
          fontWeight: 700,
          color: 'var(--text)',
          letterSpacing: '0.06em',
        }}>
          SLA: {decision.sla_hours} HOUR{decision.sla_hours !== 1 ? 'S' : ''}
        </span>
      </div>

      {/* Secondary metadata row */}
      <div style={{
        display: 'flex',
        gap: '1.5rem',
        justifyContent: 'center',
        flexWrap: 'wrap',
        paddingTop: '0.25rem',
        borderTop: '1px solid var(--border)',
        fontSize: '0.8rem',
        color: 'var(--muted)',
      }}>
        <span>
          Policy Rule: <strong style={{ color: 'var(--text)' }}>{decision.policy_rule_id || '—'}</strong>
        </span>
        <span>
          Policy Gap:{' '}
          {isPolicyGap
            ? <strong style={{ color: 'var(--red)' }}>Yes — requires policy owner review</strong>
            : <strong style={{ color: 'var(--green)' }}>No</strong>
          }
        </span>
        {decision.status && (
          <span>
            Decision Status: <strong style={{ color: 'var(--text)' }}>{decision.status}</strong>
          </span>
        )}
      </div>
    </div>
  )
}

// ── Supplier score secondary card ─────────────────────────────────────────────
function SupplierScoreCard({ score }) {
  const statusColors = { preferred: 'var(--green)', conditional: 'var(--blue)', 'watch-list': 'var(--yellow)', disqualified: 'var(--red)' }
  const color = statusColors[score.status] ?? 'var(--muted)'
  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '0.9rem 1.1rem',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '0.75rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--muted)', textTransform: 'uppercase' }}>
          Supplier Score
        </span>
      </div>
      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 700, color }}>
          {score.composite?.toFixed(2)}<span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 400 }}>/10</span>
        </span>
        <span className={`badge badge-${score.status === 'preferred' ? 'green' : score.status === 'conditional' ? 'blue' : score.status === 'watch-list' ? 'yellow' : 'red'}`}>
          {score.status}
        </span>
        {score.confidence != null && (
          <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
            Confidence: {(score.confidence * 100).toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ApprovalPanel() {
  const [form, setForm] = useState({
    requester: 'Engineering Team',
    supplier_name: 'TechSupply Corp',
    category: 'IT Hardware',
    value: '80000',
    currency: 'USD',
    description: 'Purchase of 50 laptops for the engineering team',
    pilot_team: 'pilot-alpha',
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lookupId, setLookupId] = useState('')
  const [lookupResult, setLookupResult] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await api.submitRequest({
        requester: form.requester,
        supplier_name: form.supplier_name || null,
        category: form.category,
        value: parseFloat(form.value),
        currency: form.currency,
        description: form.description || null,
        pilot_team: form.pilot_team || null,
      })
      setResult(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLookup = async (e) => {
    e.preventDefault()
    try {
      const res = await api.getRequest(lookupId)
      setLookupResult(res)
    } catch (err) {
      setLookupResult({ error: err.message })
    }
  }

  const lr = lookupResult  // alias for brevity

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h2>Approval Routing — Policy-Driven</h2>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
        Routing derives strictly from the policy rule table. No inferred authority.
        Policy gaps are flagged and routed to the procurement policy owner.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* Submit request */}
        <div className="card">
          <h3 style={{ marginBottom: '0.75rem' }}>Submit Purchase Request</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <FieldRow label="Requester">
              <input value={form.requester} onChange={e => setForm(f => ({ ...f, requester: e.target.value }))} placeholder="Name or team" required />
            </FieldRow>
            <FieldRow label="Supplier (optional)">
              <input value={form.supplier_name} onChange={e => setForm(f => ({ ...f, supplier_name: e.target.value }))} placeholder="Supplier name" />
            </FieldRow>
            <FieldRow label="Category">
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </FieldRow>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.5rem' }}>
              <FieldRow label="Value">
                <input value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="50000" type="number" required />
              </FieldRow>
              <FieldRow label="Currency">
                <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                  {['USD', 'INR', 'EUR', 'GBP'].map(c => <option key={c}>{c}</option>)}
                </select>
              </FieldRow>
            </div>
            <FieldRow label="Description">
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional" />
            </FieldRow>
            <FieldRow label="Pilot Team">
              <input value={form.pilot_team} onChange={e => setForm(f => ({ ...f, pilot_team: e.target.value }))} placeholder="e.g. pilot-alpha" />
            </FieldRow>
            <button type="submit" disabled={loading} style={{ marginTop: '0.25rem' }}>
              {loading ? <span className="spin">⟳</span> : 'Submit & Route'}
            </button>
          </form>
          {error && <p className="err">Error: {error}</p>}
        </div>

        {/* Routing result */}
        <div className="card">
          <h3 style={{ marginBottom: '0.75rem' }}>Routing Result</h3>
          {result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <code style={{ fontSize: '0.9rem' }}>{result.request_id}</code>
                <span className={`badge badge-${result.status === 'pending' ? 'blue' : 'green'}`}>{result.status}</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                Routing triggered in background — check status below.
              </p>
              <button onClick={() => setLookupId(result.request_id)} style={{ fontSize: '0.78rem' }}>
                Load Status for {result.request_id}
              </button>
            </div>
          ) : (
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Submit a request to see routing output.</p>
          )}
        </div>
      </div>

      {/* Status lookup */}
      <div className="card">
        <h3 style={{ marginBottom: '0.75rem' }}>Request Status Lookup</h3>
        <form onSubmit={handleLookup} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <input value={lookupId} onChange={e => setLookupId(e.target.value)} placeholder="PR-XXXXXXXX" style={{ flex: 1 }} />
          <button type="submit">Lookup</button>
        </form>

        {lr?.error && <p className="err">{lr.error}</p>}

        {lr && !lr.error && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* ── Request metadata — secondary ─────────────────────────── */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.4rem 1.5rem',
              padding: '0.75rem 1rem',
              background: 'var(--bg)',
              borderRadius: 8,
              border: '1px solid var(--border)',
              fontSize: '0.82rem',
              color: 'var(--muted)',
              alignItems: 'center',
            }}>
              <span style={{ fontFamily: 'monospace', color: 'var(--text)', fontWeight: 600 }}>{lr.request_id}</span>
              <span className={`badge badge-${lr.status === 'pending' ? 'blue' : 'green'}`} style={{ fontSize: '0.68rem' }}>{lr.status}</span>
              {lr.requester && <span>Requester: <strong style={{ color: 'var(--text)' }}>{lr.requester}</strong></span>}
              {lr.category  && <span>Category: <strong style={{ color: 'var(--text)' }}>{lr.category}</strong></span>}
              {lr.value != null && (
                <span>Value: <strong style={{ color: 'var(--text)' }}>{lr.currency} {Number(lr.value).toLocaleString()}</strong></span>
              )}
              {lr.supplier_name && <span>Supplier: <strong style={{ color: 'var(--text)' }}>{lr.supplier_name}</strong></span>}
            </div>

            {/* ── Approval Decision — prominent ────────────────────────── */}
            {lr.approval_decision
              ? <ApprovalDecisionCard decision={lr.approval_decision} />
              : (
                <div style={{
                  padding: '1rem',
                  border: '1px dashed var(--border)',
                  borderRadius: 8,
                  textAlign: 'center',
                  color: 'var(--muted)',
                  fontSize: '0.85rem',
                }}>
                  Approval decision is still being processed — try again in a moment.
                </div>
              )
            }

            {/* ── Supplier Score — secondary ───────────────────────────── */}
            {lr.supplier_score && <SupplierScoreCard score={lr.supplier_score} />}

          </div>
        )}
      </div>
    </div>
  )
}

function FieldRow({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: 2 }}>{label}</label>
      {children}
    </div>
  )
}
