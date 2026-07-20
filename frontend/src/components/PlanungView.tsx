import { useEffect, useState, useCallback } from 'react'
import { useTheme } from '../ThemeContext'
import {
  List, Play, Plus, Pencil, Trash2, Loader2, AlertTriangle,
  CheckCircle, XCircle, FileText, Zap, Link2
} from 'lucide-react'
import {
  fetchPlanungsregeln, createPlanungsregel, updatePlanungsregel, deletePlanungsregel,
  fetchPlanungsauftraege, createPlanungsauftrag, runPlanungsauftrag, applyPlanungsauftrag,
  fetchWeeks, fetchAbhaengigkeiten, createAbhaengigkeit, updateAbhaengigkeit, deleteAbhaengigkeit
} from '../api'
import type { Planungsregel, Planungsauftrag, RegelTyp, Abhaengigkeit, AbhaengigkeitTyp, ZielTyp } from '../types'

type Tab = 'regeln' | 'planen' | 'auftraege' | 'abhaengigkeiten'

export default function PlanungView() {
  const { t } = useTheme()
  const [tab, setTab] = useState<Tab>('regeln')

  return (
    <section className="view planung-view">
      <header className="view-header">
        <div>
          <span className="eyebrow">{t('plan.eyebrow')}</span>
          <h1>{t('plan.title')}</h1>
          <p className="subtitle">{t('plan.sub')}</p>
        </div>
      </header>

      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'regeln' ? 'active' : ''}`} onClick={() => setTab('regeln')}>
          <List size={16} /> {t('plan.tab.regeln')}
        </button>
        <button className={`tab-btn ${tab === 'planen' ? 'active' : ''}`} onClick={() => setTab('planen')}>
          <Zap size={16} /> {t('plan.tab.planen')}
        </button>
        <button className={`tab-btn ${tab === 'auftraege' ? 'active' : ''}`} onClick={() => setTab('auftraege')}>
          <FileText size={16} /> {t('plan.tab.auftraege')}
        </button>
        <button className={`tab-btn ${tab === 'abhaengigkeiten' ? 'active' : ''}`} onClick={() => setTab('abhaengigkeiten')}>
          <Link2 size={16} /> {t('plan.tab.abhaengigkeiten')}
        </button>
      </div>

      <div className="view-content">
        {tab === 'regeln' && <RegelnTab />}
        {tab === 'planen' && <PlanenTab />}
        {tab === 'auftraege' && <AuftraegeTab />}
        {tab === 'abhaengigkeiten' && <AbhaengigkeitenTab />}
      </div>
    </section>
  )
}

const REGEL_TYPEN: RegelTyp[] = ['constraint', 'preference', 'exclusion', 'requirement']

function RegelnTab() {
  const { t } = useTheme()
  const [items, setItems] = useState<Planungsregel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Partial<Planungsregel> | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setItems(await fetchPlanungsregeln()); setError('') }
    catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!editing) return
    try {
      if (editing.id) await updatePlanungsregel(editing.id, editing)
      else await createPlanungsregel(editing)
      setEditing(null); load()
    } catch (e: any) { setError(e.message) }
  }

  const remove = async (id: number) => {
    try { await deletePlanungsregel(id); setDeleting(null); load() }
    catch (e: any) { setError(e.message) }
  }

  return (
    <div className="resource-panel">
      <div className="resource-toolbar">
        <div />
        <button className="btn btn-primary" onClick={() => setEditing({ bezeichnung: '', typ: 'constraint', bedingung: '', prioritaet: 5, aktiv: 1 })}>
          <Plus size={16} /> {t('res.add')}
        </button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {editing && (
        <div className="resource-form card">
          <div className="form-grid">
            <label>{t('plan.regel.bezeichnung')}<input value={editing.bezeichnung || ''} onChange={e => setEditing({ ...editing, bezeichnung: e.target.value })} /></label>
            <label>{t('plan.regel.typ')}
              <select value={editing.typ || 'constraint'} onChange={e => setEditing({ ...editing, typ: e.target.value as RegelTyp })}>
                {REGEL_TYPEN.map(rt => <option key={rt} value={rt}>{t(`plan.typ.${rt}`)}</option>)}
              </select>
            </label>
            <label>{t('plan.regel.bedingung')}<textarea value={editing.bedingung || ''} onChange={e => setEditing({ ...editing, bedingung: e.target.value })} rows={3} /></label>
            <label>{t('plan.regel.prioritaet')}<input type="number" min={1} max={10} value={editing.prioritaet ?? 5} onChange={e => setEditing({ ...editing, prioritaet: parseInt(e.target.value) || 5 })} /></label>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={save}>{t('res.save')}</button>
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>{t('res.cancel')}</button>
          </div>
        </div>
      )}
      {loading ? <div className="loading-state"><Loader2 size={24} className="spin" /></div> :
        items.length === 0 ? <div className="empty-state"><AlertTriangle size={24} /><p>{t('res.empty')}</p></div> : (
          <table className="resource-table">
            <thead><tr><th>{t('plan.regel.bezeichnung')}</th><th>{t('plan.regel.typ')}</th><th>{t('plan.regel.bedingung')}</th><th>Prio</th><th>{t('plan.regel.aktiv')}</th><th></th></tr></thead>
            <tbody>
              {items.map(r => (
                <tr key={r.id}>
                  <td>{r.bezeichnung}</td>
                  <td><span className={`badge badge-${r.typ}`}>{t(`plan.typ.${r.typ}`)}</span></td>
                  <td className="text-secondary">{r.bedingung}</td>
                  <td>{r.prioritaet}</td>
                  <td>{r.aktiv ? <CheckCircle size={14} className="text-success" /> : <XCircle size={14} className="text-error" />}</td>
                  <td className="actions">
                    {deleting === r.id ? (
                      <div className="delete-confirm">
                        <button className="btn btn-danger btn-sm" onClick={() => remove(r.id)}>{t('res.delete')}</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setDeleting(null)}>{t('res.cancel')}</button>
                      </div>
                    ) : (
                      <><button className="btn-icon" onClick={() => setEditing(r)}><Pencil size={14} /></button><button className="btn-icon danger" onClick={() => setDeleting(r.id)}><Trash2 size={14} /></button></>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </div>
  )
}

function PlanenTab() {
  const { t } = useTheme()
  const [regeln, setRegeln] = useState<Planungsregel[]>([])
  const [weeks, setWeeks] = useState<number[]>([])
  const [selectedRegeln, setSelectedRegeln] = useState<number[]>([])
  const [wocheVon, setWocheVon] = useState(1)
  const [wocheBis, setWocheBis] = useState(1)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<Planungsauftrag | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPlanungsregeln().then(r => setRegeln(r.filter(x => x.aktiv))).catch(() => {})
    fetchWeeks().then(w => { setWeeks(w); if (w.length) { setWocheVon(w[0]); setWocheBis(w[w.length - 1]) } }).catch(() => {})
  }, [])

  const toggleRegel = (id: number) => {
    setSelectedRegeln(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const runPlanning = async (runAi: boolean) => {
    setRunning(true); setError(''); setResult(null)
    try {
      const r = await createPlanungsauftrag({
        woche_von: wocheVon,
        woche_bis: wocheBis,
        regel_ids: selectedRegeln,
        run_ai: runAi,
      })
      setResult(r)
    } catch (e: any) { setError(e.message) }
    finally { setRunning(false) }
  }

  const applyResult = async () => {
    if (!result) return
    try {
      await applyPlanungsauftrag(result.id)
      setResult(null)
      setError('')
    } catch (e: any) { setError(e.message) }
  }

  return (
    <div className="resource-panel">
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3>{t('plan.tab.planen')}</h3>
        <div className="form-grid">
          <label>{t('plan.woche_von')}
            <select value={wocheVon} onChange={e => setWocheVon(Number(e.target.value))}>
              {weeks.map(w => <option key={w} value={w}>KW {w}</option>)}
              {weeks.length === 0 && <option value={1}>KW 1</option>}
            </select>
          </label>
          <label>{t('plan.woche_bis')}
            <select value={wocheBis} onChange={e => setWocheBis(Number(e.target.value))}>
              {weeks.map(w => <option key={w} value={w}>KW {w}</option>)}
              {weeks.length === 0 && <option value={1}>KW 1</option>}
            </select>
          </label>
        </div>

        <div style={{ margin: '1rem 0' }}>
          <h4>{t('plan.selectRegeln')}</h4>
          {regeln.length === 0 ? <p className="text-secondary">{t('res.empty')}</p> : (
            <div className="checkbox-list">
              {regeln.map(r => (
                <label key={r.id} className="checkbox-item">
                  <input type="checkbox" checked={selectedRegeln.includes(r.id)} onChange={() => toggleRegel(r.id)} />
                  <span>{r.bezeichnung} <small className="text-secondary">({t(`plan.typ.${r.typ}`)})</small></span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="form-actions">
          <button className="btn btn-primary" onClick={() => runPlanning(true)} disabled={running}>
            {running ? <><Loader2 size={16} className="spin" /> {t('plan.running')}</> : <><Play size={16} /> {t('plan.run_ai')}</>}
          </button>
          <button className="btn btn-ghost" onClick={() => runPlanning(false)} disabled={running}>
            <FileText size={16} /> {t('plan.create_draft')}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {result && (
        <div className="card">
          <h3>{t('plan.status')}: <span className={`badge badge-${result.status}`}>{result.status}</span></h3>
          {result.ergebnis && (
            <div>
              {result.ergebnis.error && (
                <div className="alert alert-warning">
                  <AlertTriangle size={16} />
                  <div>
                    <strong>{t('plan.provider_error')}</strong>
                    <p>{result.ergebnis.error}</p>
                    {result.ergebnis.hinweis && <p className="text-secondary">{result.ergebnis.hinweis}</p>}
                  </div>
                </div>
              )}
              <div className="plan-stats">
                <span>Termine: {result.ergebnis.bestehende_termine}</span>
                <span>Regeln: {result.ergebnis.regeln_geladen}</span>
                <span>{t('plan.vorschlaege')}: {result.ergebnis.vorschlaege?.length || 0}</span>
                <span>{t('plan.konflikte')}: {result.ergebnis.konflikte?.length || 0}</span>
              </div>
              {result.ergebnis.ai_response && (
                <details style={{ marginTop: '1rem' }}>
                  <summary>KI-Antwort</summary>
                  <pre className="ai-response">{result.ergebnis.ai_response}</pre>
                </details>
              )}
              {result.status === 'vorschlag' && result.ergebnis.vorschlaege && result.ergebnis.vorschlaege.length > 0 && (
                <div className="form-actions" style={{ marginTop: '1rem' }}>
                  <button className="btn btn-primary" onClick={applyResult}>
                    <CheckCircle size={16} /> {t('plan.apply')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AuftraegeTab() {
  const { t } = useTheme()
  const [items, setItems] = useState<Planungsauftrag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPlanungsauftraege().then(setItems).catch((e: any) => setError(e.message)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading-state"><Loader2 size={24} className="spin" /></div>
  if (error) return <div className="alert alert-error">{error}</div>
  if (items.length === 0) return <div className="empty-state"><FileText size={24} /><p>{t('plan.no_auftraege')}</p></div>

  const handleRun = async (id: number) => {
    try {
      await runPlanungsauftrag(id)
      const updated = await fetchPlanungsauftraege()
      setItems(updated)
    } catch (e: any) { setError(e.message) }
  }

  return (
    <div className="resource-panel">
      <table className="resource-table">
        <thead><tr><th>ID</th><th>{t('res.bezeichnung')}</th><th>KW</th><th>{t('plan.status')}</th><th></th></tr></thead>
        <tbody>
          {items.map(a => (
            <tr key={a.id}>
              <td>{a.id}</td>
              <td>{a.bezeichnung}</td>
              <td>{a.woche_von}–{a.woche_bis}</td>
              <td><span className={`badge badge-${a.status}`}>{a.status}</span></td>
              <td className="actions">
                {a.status === 'entwurf' && (
                  <button className="btn btn-primary btn-sm" onClick={() => handleRun(a.id)}>
                    <Play size={14} /> {t('plan.run_ai')}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const ABH_TYPEN: AbhaengigkeitTyp[] = ['requires', 'blocks', 'conflicts', 'supports']
const ZIEL_TYPEN: ZielTyp[] = ['regel', 'person', 'gruppe', 'rolle', 'raum', 'komponente', 'termin']

function AbhaengigkeitenTab() {
  const { t } = useTheme()
  const [items, setItems] = useState<Abhaengigkeit[]>([])
  const [regeln, setRegeln] = useState<Planungsregel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterRegel, setFilterRegel] = useState<number | undefined>(undefined)
  const [editing, setEditing] = useState<Partial<Abhaengigkeit> | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [abh, r] = await Promise.all([fetchAbhaengigkeiten(filterRegel), fetchPlanungsregeln()])
      setItems(abh); setRegeln(r); setError('')
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [filterRegel])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!editing) return
    try {
      if (editing.id) await updateAbhaengigkeit(editing.id, editing)
      else await createAbhaengigkeit(editing)
      setEditing(null); load()
    } catch (e: any) { setError(e.message) }
  }

  const remove = async (id: number) => {
    try { await deleteAbhaengigkeit(id); setDeleting(null); load() }
    catch (e: any) { setError(e.message) }
  }

  const regelName = (id: number) => regeln.find(r => r.id === id)?.bezeichnung || `#${id}`

  return (
    <div className="resource-panel">
      <div className="resource-toolbar">
        <select value={filterRegel ?? ''} onChange={e => setFilterRegel(e.target.value ? Number(e.target.value) : undefined)}>
          <option value="">{t('plan.abh.alle')}</option>
          {regeln.map(r => <option key={r.id} value={r.id}>{r.bezeichnung}</option>)}
        </select>
        <button className="btn btn-primary" onClick={() => setEditing({ regel_id: filterRegel || regeln[0]?.id, typ: 'requires', ziel_typ: 'regel', aktiv: 1 })}>
          <Plus size={16} /> {t('res.add')}
        </button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {editing && (
        <div className="resource-form card">
          <div className="form-grid">
            <label>{t('plan.abh.regel')}
              <select value={editing.regel_id || ''} onChange={e => setEditing({ ...editing, regel_id: Number(e.target.value) })}>
                {regeln.map(r => <option key={r.id} value={r.id}>{r.bezeichnung}</option>)}
              </select>
            </label>
            <label>{t('plan.abh.typ')}
              <select value={editing.typ || 'requires'} onChange={e => setEditing({ ...editing, typ: e.target.value as AbhaengigkeitTyp })}>
                {ABH_TYPEN.map(at => <option key={at} value={at}>{t(`plan.abh.typ.${at}`)}</option>)}
              </select>
            </label>
            <label>{t('plan.abh.ziel_typ')}
              <select value={editing.ziel_typ || 'regel'} onChange={e => setEditing({ ...editing, ziel_typ: e.target.value as ZielTyp })}>
                {ZIEL_TYPEN.map(zt => <option key={zt} value={zt}>{t(`plan.abh.ziel.${zt}`)}</option>)}
              </select>
            </label>
            <label>{t('plan.abh.ziel_id')}<input type="number" min={1} value={editing.ziel_id ?? ''} onChange={e => setEditing({ ...editing, ziel_id: e.target.value ? Number(e.target.value) : null })} /></label>
            <label>{t('plan.abh.ziel_text')}<input value={editing.ziel_text || ''} onChange={e => setEditing({ ...editing, ziel_text: e.target.value })} /></label>
            <label>{t('plan.abh.bedingung')}<input value={editing.bedingung || ''} onChange={e => setEditing({ ...editing, bedingung: e.target.value })} /></label>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={save}>{t('res.save')}</button>
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>{t('res.cancel')}</button>
          </div>
        </div>
      )}
      {loading ? <div className="loading-state"><Loader2 size={24} className="spin" /></div> :
        items.length === 0 ? <div className="empty-state"><Link2 size={24} /><p>{t('plan.abh.empty')}</p></div> : (
          <table className="resource-table">
            <thead><tr><th>{t('plan.abh.regel')}</th><th>{t('plan.abh.typ')}</th><th>{t('plan.abh.ziel_typ')}</th><th>{t('plan.abh.ziel_id')}</th><th>{t('plan.abh.bedingung')}</th><th>{t('plan.abh.aktiv')}</th><th></th></tr></thead>
            <tbody>
              {items.map(a => (
                <tr key={a.id}>
                  <td>{regelName(a.regel_id)}</td>
                  <td><span className={`badge`}>{t(`plan.abh.typ.${a.typ}`)}</span></td>
                  <td>{t(`plan.abh.ziel.${a.ziel_typ}`)}</td>
                  <td>{a.ziel_id ?? a.ziel_text}</td>
                  <td className="text-secondary">{a.bedingung}</td>
                  <td>{a.aktiv ? <CheckCircle size={14} className="text-success" /> : <XCircle size={14} className="text-error" />}</td>
                  <td className="actions">
                    {deleting === a.id ? (
                      <div className="delete-confirm">
                        <button className="btn btn-danger btn-sm" onClick={() => remove(a.id)}>{t('res.delete')}</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setDeleting(null)}>{t('res.cancel')}</button>
                      </div>
                    ) : (
                      <><button className="btn-icon" onClick={() => setEditing(a)}><Pencil size={14} /></button><button className="btn-icon danger" onClick={() => setDeleting(a.id)}><Trash2 size={14} /></button></>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </div>
  )
}
