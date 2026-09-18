import { useState } from 'react'
import { api } from '../api.js'

const CATEGORIES = [
  'MRO', 'IT Hardware', 'Electronic Components', 'IT Services',
  'Raw Materials', 'Mechanical Components', 'Logistics', 'Software Licensing',
]

const POLL_INTERVAL_MS = 2000   // 2 s between polls
const POLL_MAX_ATTEMPTS = 30    // 30 × 2 s = 60 s timeout

export default function SupplierPanel() {
  const [form, setForm] = useState({ supplier_name: 'TechSupply Corp', category: 'IT Hardware', pilot_team: 'pilot-alpha' })
  const [score, setScore] = useState(null)        // completed score from GET endpoint
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('') // status message shown under spinner
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setScore(null)
    setLoadingMsg('Submitting request…')

    let accepted
    try {
      // Step 1: POST → get score_id immediately (background task is now queued)
      accepted = await api.scoreSupplier({
        supplier_name: form.supplier_name,
        category: form.category,
        pilot_team: form.pilot_team || null,
      })
    } catch (err) {
      setError(`Failed to submit: ${err.message}`)
      setLoading(false)
      return
    }

    const { score_id, supplier_name, category } = accepted
    setLoadingMsg(`Scoring supplier "${supplier_name}" in ${category}…`)

    // Step 2: Poll GET /procurement/supplier/score/{score_id} until complete
    let attempts = 0
    const poll = async () => {
      attempts++
      try {
        const result = await api.getSupplierScore(score_id)

        // 200 response — scoring is complete. Map DB fields → render shape.
        setScore({
          supplier: result.supplier_name,
          category: result.category,
          reliability:  { score: result.reliability_score,  source_chunk: result.source_chunks?.reliability  || '—' },
          compliance:   { score: result.compliance_score,   source_chunk: result.source_chunks?.compliance   || '—' },
          cost:         { score: result.cost_score,         source_chunk: result.source_chunks?.cost         || '—' },
          risk:         { score: result.risk_score,         source_chunk: result.source_chunks?.risk         || '—' },
          fit:          { score: result.fit_score,          source_chunk: result.source_chunks?.fit          || '—' },
          composite:    result.composite_score,
          status:       result.status,
          confidence:   result.confidence,
          prompt_version: result.prompt_version,
          scored_at:    result.scored_at,
          input_hash:   result.score_id,   // use score_id for traceability display
        })
        setLoading(false)
        setLoadingMsg('')
      } catch (err) {
        // 404 means job is still running; anything else is a real error
        const is404 = err.message?.startsWith('404')
        if (is404 && attempts < POLL_MAX_ATTEMPTS) {
          setLoadingMsg(
            `Scoring supplier "${supplier_name}"… (${attempts * 2}s elapsed, AI evaluation in progress)`
          )
          setTimeout(poll, POLL_INTERVAL_MS)
        } else if (is404) {
          setError(
            `Scoring timed out after ${(POLL_MAX_ATTEMPTS * POLL_INTERVAL_MS) / 1000}s. ` +
            `The background task may still be running — check the Audit Log for details.`
          )
          setLoading(false)
          setLoadingMsg('')
        } else {
          setError(`Polling error: ${err.message}`)
          setLoading(false)
          setLoadingMsg('')
        }
      }
    }

    // Start first poll after one interval to give the background task a head start
    setTimeout(poll, POLL_INTERVAL_MS)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h2>Supplier Scoring — RAG-Based Evaluation</h2>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
        Retrieval runs against the knowledge base before every score. No parametric-memory-only scores.
      </p>

      <div className="card" style={{ maxWidth: 520 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Supplier Name</label>
            <input
              value={form.supplier_name}
              onChange={e => setForm(f => ({ ...f, supplier_name: e.target.value }))}
              placeholder="e.g. Acme Industrial Supplies"
              required
            />
          </div>
          <div>
            <label style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Pilot Team (optional)</label>
            <input
              value={form.pilot_team}
              onChange={e => setForm(f => ({ ...f, pilot_team: e.target.value }))}
              placeholder="e.g. pilot-alpha"
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? <span className="spin">⟳</span> : 'Score Supplier'}
          </button>
        </form>
      </div>

      {error && <p className="err">Error: {error}</p>}

      {/* Loading state card — shown while polling for a result */}
      {loading && (
        <div className="card" style={{ maxWidth: 520 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="spin" style={{ fontSize: '1.25rem' }}>⟳</span>
            <div>
              <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>Scoring supplier…</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{loadingMsg}</div>
            </div>
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--muted)' }}>
            The AI is retrieving knowledge-base chunks and evaluating the supplier across 5 dimensions.
            This typically takes 10–30 seconds.
          </div>
        </div>
      )}

      {/* Result card — shown once polling receives the completed score */}
      {score && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2>{score.supplier}</h2>
              {score.category && (
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
                  {score.category}
                </div>
              )}
              <span className="tag">
                Prompt: {score.prompt_version} · Confidence: {(score.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <StatusBadge status={score.status} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
            {['reliability', 'compliance', 'cost', 'risk', 'fit'].map(dim => (
              <DimCard key={dim} label={dim} data={score[dim]} />
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'var(--bg)', borderRadius: 6 }}>
            <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Composite Score</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: compositeColor(score.composite) }}>
              {score.composite?.toFixed(2)}/10
            </span>
            <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>Score ID: {score.input_hash}</span>
          </div>

          {score.scored_at && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--muted)' }}>
              Scored at: {new Date(score.scored_at).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DimCard({ label, data }) {
  if (!data) return null
  const pct = ((data.score / 10) * 100).toFixed(0)
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 6, padding: '0.75rem' }}>
      <h3 style={{ marginBottom: '0.4rem' }}>{label}</h3>
      <div style={{ fontSize: '1.3rem', fontWeight: 700, color: scoreColor(data.score) }}>{data.score}</div>
      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginTop: '0.4rem' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: scoreColor(data.score), borderRadius: 2 }} />
      </div>
      <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        src: {data.source_chunk}
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = { preferred: 'badge-green', conditional: 'badge-blue', 'watch-list': 'badge-yellow', disqualified: 'badge-red' }
  return <span className={`badge ${map[status] || 'badge-muted'}`}>{status}</span>
}

function scoreColor(s) {
  if (s >= 7.5) return 'var(--green)'
  if (s >= 5) return 'var(--yellow)'
  return 'var(--red)'
}

function compositeColor(s) {
  if (s >= 7.5) return 'var(--green)'
  if (s >= 6) return 'var(--blue)'
  if (s >= 4) return 'var(--yellow)'
  return 'var(--red)'
}
