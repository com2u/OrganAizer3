import { useEffect, useState, useCallback } from 'react'
import { useTheme } from '../ThemeContext'
import {
  List, Play, Plus, Pencil, Trash2, Loader2, AlertTriangle,
  CheckCircle, XCircle, FileText, Zap, Link2, ChevronDown, Search, ShieldCheck, Download
} from 'lucide-react'
import {
  fetchPlanungsregeln, createPlanungsregel, updatePlanungsregel, deletePlanungsregel,
  fetchPlanungsauftraege, fetchPlanungsauftrag, createPlanungsauftrag, runPlanungsauftrag,
  fetchWeeks, fetchAbhaengigkeiten, createAbhaengigkeit, updateAbhaengigkeit, deleteAbhaengigkeit,
  fetchOpenRouterModels, validatePlanning, downloadPlanningExcel
} from '../api'
import type { Planungsregel, Planungsauftrag, RegelTyp, Abhaengigkeit, AbhaengigkeitTyp, ZielTyp, OpenRouterModel, PlanningIssue } from '../types'

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
        <div className="resource-form card resource-edit-modal" role="dialog" aria-modal="true">
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
            <thead><tr><th>Nr.</th><th>{t('plan.regel.bezeichnung')}</th><th>{t('plan.regel.typ')}</th><th>{t('plan.regel.bedingung')}</th><th>Prio</th><th>{t('plan.regel.aktiv')}</th><th></th></tr></thead>
            <tbody>
              {items.map(r => (
                <tr key={r.id} onDoubleClick={() => setEditing(r)} title={t('res.doubleClickEdit')}>
                  <td className="text-secondary">{r.id}</td>
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
  const [validating, setValidating] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [models, setModels] = useState<OpenRouterModel[]>([])
  const [model, setModel] = useState('')
  const [modelSearch, setModelSearch] = useState('')
  const [issues, setIssues] = useState<PlanningIssue[] | null>(null)
  const [issueTitle, setIssueTitle] = useState('')
  const [result, setResult] = useState<Planungsauftrag | null>(null)
  const [error, setError] = useState('')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    if (!running) return
    const startedAt = Date.now()
    setElapsedSeconds(0)
    const timer = window.setInterval(
      () => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)),
      1000,
    )
    return () => window.clearInterval(timer)
  }, [running])

  useEffect(() => {
    fetchPlanungsregeln().then(r => {
      const active = r.filter(x => x.aktiv)
      setRegeln(active)
      setSelectedRegeln(active.map(rule => rule.id))
    }).catch(() => {})
    fetchWeeks().then(w => { setWeeks(w); if (w.length) { setWocheVon(w[0]); setWocheBis(w[w.length - 1]) } }).catch(() => {})
    fetchOpenRouterModels().then(data => {
      setModels(data.models)
      setModel(data.models.some(item => item.id === data.default) ? data.default : data.models[0]?.id || '')
    }).catch((e: any) => setError(e.message))
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
        model,
      })
      let completed = r
      setResult(completed)
      if (runAi && completed.status === 'laeuft') {
        const deadline = Date.now() + 15 * 60_000
        let consecutivePollErrors = 0
        while (completed.status === 'laeuft' && Date.now() < deadline) {
          await new Promise(resolve => window.setTimeout(resolve, 2_000))
          try {
            completed = await fetchPlanungsauftrag(completed.id)
            consecutivePollErrors = 0
            setResult(completed)
          } catch (pollError) {
            consecutivePollErrors += 1
            if (consecutivePollErrors >= 3) throw pollError
          }
        }
        if (completed.status === 'laeuft') {
          throw new Error('Die Planung läuft länger als 15 Minuten. Sie kann im Tab „Aufträge“ weiter verfolgt werden.')
        }
      }
      const conflicts = completed.ergebnis?.konflikte || []
      if (conflicts.length) {
        setIssueTitle('Hinweise aus der Planung')
        setIssues(conflicts)
      }
    } catch (e: any) { setError(e.message) }
    finally { setRunning(false) }
  }

  const runValidation = async () => {
    setValidating(true)
    setError('')
    try {
      const validation = await validatePlanning({
        woche_von: wocheVon,
        woche_bis: wocheBis,
        regel_ids: selectedRegeln,
        model,
      })
      setIssueTitle(validation.valid ? 'Validierung abgeschlossen' : 'Unstimmigkeiten gefunden')
      setIssues(validation.issues.length ? validation.issues : [{
        severity: 'info',
        title: 'Keine Widersprüche erkannt',
        description: validation.summary || 'Die ausgewählten Regeln und Meetingvorgaben sind grundsätzlich konsistent.',
      }])
    } catch (e: any) { setError(e.message) }
    finally { setValidating(false) }
  }

  const allSelected = regeln.length > 0 && selectedRegeln.length === regeln.length
  const filteredModels = models.filter(item =>
    `${item.name} ${item.id} ${item.description}`.toLowerCase().includes(modelSearch.toLowerCase())
  )

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

        <div className="planning-model-picker">
          <label>OpenRouter-Modell</label>
          <div className="model-search"><Search size={15} /><input value={modelSearch} onChange={e => setModelSearch(e.target.value)} placeholder="Modelle durchsuchen…" /></div>
          <select value={model} onChange={e => setModel(e.target.value)}>
            {filteredModels.map(item => <option key={item.id} value={item.id}>{item.name} · {item.id}</option>)}
          </select>
          {model && <small className="text-secondary">{models.find(item => item.id === model)?.description}</small>}
        </div>

        <div className="planning-rules">
          <button type="button" className="planning-rules-summary" onClick={() => setRulesOpen(value => !value)} aria-expanded={rulesOpen}>
            <ChevronDown size={17} className={rulesOpen ? 'expanded' : ''} />
            <span><strong>{t('plan.selectRegeln')}</strong><small>{selectedRegeln.length} von {regeln.length} ausgewählt</small></span>
          </button>
          {rulesOpen && (
            <div className="checkbox-list planning-rule-details">
              <label className="checkbox-item select-all">
                <input type="checkbox" checked={allSelected} onChange={() => setSelectedRegeln(allSelected ? [] : regeln.map(rule => rule.id))} />
                <span>Alle Regeln auswählen</span>
              </label>
              {regeln.map(r => (
                <label key={r.id} className="checkbox-item">
                  <input type="checkbox" checked={selectedRegeln.includes(r.id)} onChange={() => toggleRegel(r.id)} />
                  <span><strong>#{r.id} {r.bezeichnung}</strong><small className="text-secondary">{r.bedingung}</small></span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="form-actions">
          <button className="btn btn-primary" onClick={() => runPlanning(true)} disabled={running || validating || !model || !selectedRegeln.length}>
            {running ? <><Loader2 size={16} className="spin" /> {t('plan.running')}</> : <><Play size={16} /> {t('plan.run_ai')}</>}
          </button>
          <button className="btn btn-secondary" onClick={runValidation} disabled={running || validating || !model || !selectedRegeln.length}>
            {validating ? <><Loader2 size={16} className="spin" /> Validierung läuft…</> : <><ShieldCheck size={16} /> Validieren</>}
          </button>
          <button className="btn btn-ghost" onClick={() => runPlanning(false)} disabled={running || validating}>
            <FileText size={16} /> {t('plan.create_draft')}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {result && (
        <div className="card">
          <h3>{t('plan.status')}: <span className={`badge badge-${result.status}`}>{result.status}</span></h3>
          {result.status === 'laeuft' && (
            <div className="planning-progress" role="status" aria-live="polite">
              <Loader2 size={20} className="spin" />
              <div>
                <strong>{result.ergebnis?.phase || 'Planungsauftrag wird vorbereitet…'}</strong>
                <small>Laufzeit: {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')} min</small>
                {result.ergebnis?.progress_messages?.length ? (
                  <ol>{result.ergebnis.progress_messages.map((message, index) => <li key={index}>{message}</li>)}</ol>
                ) : null}
              </div>
            </div>
          )}
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
              {result.ergebnis.summary && <p>{result.ergebnis.summary}</p>}
              {result.status === 'vorschlag' && result.ergebnis.vorschlaege && result.ergebnis.vorschlaege.length > 0 && (
                <div className="form-actions" style={{ marginTop: '1rem' }}>
                  <button className="btn btn-primary" onClick={() => downloadPlanningExcel(result.id).catch((e: any) => setError(e.message))}>
                    <Download size={16} /> Excel-Vorschlag herunterladen
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {issues && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="planning-issues-title">
          <div className="modal-content planning-issues-modal">
            <h2 id="planning-issues-title">{issueTitle}</h2>
            <div className="planning-issue-list">
              {issues.map((issue, index) => (
                <article key={index} className={`planning-issue issue-${issue.severity || 'info'}`}>
                  <strong>{issue.title}</strong>
                  <p>{issue.description}</p>
                  {(issue.related_rules?.length || issue.related_meetings?.length) ? (
                    <small>Regeln: {issue.related_rules?.join(', ') || '–'} · Meetings: {issue.related_meetings?.join(', ') || '–'}</small>
                  ) : null}
                </article>
              ))}
            </div>
            <div className="form-actions"><button className="btn btn-primary" onClick={() => setIssues(null)}>Schließen</button></div>
          </div>
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
