import { useEffect, useState, useCallback } from 'react'
import { useTheme } from '../ThemeContext'
import {
  Users, MapPin, Puzzle, Tag, Calendar, Plus, Pencil, Trash2,
  Search, X, Loader2, AlertTriangle
} from 'lucide-react'
import {
  fetchPersonen, createPerson, updatePerson, deletePerson,
  fetchRollen, createRolle, updateRolle, deleteRolle,
  fetchRaeume, createRaum, updateRaum, deleteRaum,
  fetchKomponenten, createKomponente, updateKomponente, deleteKomponente,
  fetchGruppen, fetchResourceTermine
} from '../api'
import type { Person, Rolle, Raum, Komponente, Gruppe, TerminDef } from '../types'

type Tab = 'personen' | 'gruppen' | 'rollen' | 'raeume' | 'komponenten' | 'termine'

export default function RessourcenView() {
  const { t } = useTheme()
  const [tab, setTab] = useState<Tab>('personen')

  return (
    <section className="view ressourcen-view">
      <header className="view-header">
        <div>
          <span className="eyebrow">{t('res.eyebrow')}</span>
          <h1>{t('res.title')}</h1>
          <p className="subtitle">{t('res.sub')}</p>
        </div>
      </header>

      <div className="tab-bar">
        {([
          ['personen', Users, 'res.tab.personen'],
          ['gruppen', Users, 'res.tab.gruppen'],
          ['rollen', Tag, 'res.tab.rollen'],
          ['raeume', MapPin, 'res.tab.raeume'],
          ['komponenten', Puzzle, 'res.tab.komponenten'],
          ['termine', Calendar, 'res.tab.termine'],
        ] as const).map(([key, Icon, label]) => (
          <button
            key={key}
            className={`tab-btn ${tab === key ? 'active' : ''}`}
            onClick={() => setTab(key as Tab)}
          >
            <Icon size={16} />
            {t(label)}
          </button>
        ))}
      </div>

      <div className="view-content">
        {tab === 'personen' && <PersonenTab />}
        {tab === 'gruppen' && <GruppenTab />}
        {tab === 'rollen' && <RollenTab />}
        {tab === 'raeume' && <RaeumeTab />}
        {tab === 'komponenten' && <KomponentenTab />}
        {tab === 'termine' && <TermineTab />}
      </div>
    </section>
  )
}

// ===== Generic CRUD helpers =====

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state"><AlertTriangle size={24} /><p>{text}</p></div>
}

function DeleteConfirm({ onConfirm, onCancel, t: _t }: { onConfirm: () => void; onCancel: () => void; t: (k: string) => string }) {
  return (
    <div className="delete-confirm">
      <span>{_t('res.deleteConfirm')}</span>
      <button className="btn btn-danger btn-sm" onClick={onConfirm}>{_t('res.delete')}</button>
      <button className="btn btn-ghost btn-sm" onClick={onCancel}>{_t('res.cancel')}</button>
    </div>
  )
}

// ===== Personen =====

function PersonenTab() {
  const { t } = useTheme()
  const [items, setItems] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Partial<Person> | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setItems(await fetchPersonen(search)); setError('') }
    catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!editing) return
    try {
      if (editing.id) await updatePerson(editing.id, editing)
      else await createPerson(editing)
      setEditing(null)
      load()
    } catch (e: any) { setError(e.message) }
  }

  const remove = async (id: number) => {
    try { await deletePerson(id); setDeleting(null); load() }
    catch (e: any) { setError(e.message) }
  }

  return (
    <div className="resource-panel">
      <div className="resource-toolbar">
        <div className="search-box">
          <Search size={16} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('res.search')} />
          {search && <button className="btn-icon" onClick={() => setSearch('')}><X size={14} /></button>}
        </div>
        <button className="btn btn-primary" onClick={() => setEditing({ vorname: '', nachname: '', email: '', telefon: '', aktiv: 1 })}>
          <Plus size={16} /> {t('res.add')}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {editing && (
        <div className="resource-form card">
          <div className="form-grid">
            <label>{t('res.vorname')}<input value={editing.vorname || ''} onChange={e => setEditing({ ...editing, vorname: e.target.value })} /></label>
            <label>{t('res.nachname')}<input value={editing.nachname || ''} onChange={e => setEditing({ ...editing, nachname: e.target.value })} /></label>
            <label>{t('res.email')}<input value={editing.email || ''} onChange={e => setEditing({ ...editing, email: e.target.value })} /></label>
            <label>{t('res.telefon')}<input value={editing.telefon || ''} onChange={e => setEditing({ ...editing, telefon: e.target.value })} /></label>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={save}>{t('res.save')}</button>
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>{t('res.cancel')}</button>
          </div>
        </div>
      )}

      {loading ? <div className="loading-state"><Loader2 size={24} className="spin" /></div> :
        items.length === 0 ? <EmptyState text={t('res.empty')} /> : (
          <table className="resource-table">
            <thead>
              <tr>
                <th>{t('res.vorname')}</th>
                <th>{t('res.nachname')}</th>
                <th>{t('res.email')}</th>
                <th>{t('res.telefon')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(p => (
                <tr key={p.id}>
                  <td>{p.vorname}</td>
                  <td>{p.nachname}</td>
                  <td>{p.email}</td>
                  <td>{p.telefon}</td>
                  <td className="actions">
                    {deleting === p.id ? (
                      <DeleteConfirm onConfirm={() => remove(p.id)} onCancel={() => setDeleting(null)} t={t} />
                    ) : (
                      <>
                        <button className="btn-icon" onClick={() => setEditing(p)} title={t('res.edit')}><Pencil size={14} /></button>
                        <button className="btn-icon danger" onClick={() => setDeleting(p.id)} title={t('res.delete')}><Trash2 size={14} /></button>
                      </>
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

// ===== Gruppen (read-only from bereiche/usergruppen) =====

function GruppenTab() {
  const { t } = useTheme()
  const [items, setItems] = useState<Gruppe[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGruppen().then(setItems).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading-state"><Loader2 size={24} className="spin" /></div>
  if (items.length === 0) return <EmptyState text={t('res.empty')} />

  return (
    <div className="resource-panel">
      {items.map(g => (
        <div key={g.gruppe} className="card" style={{ marginBottom: '1rem' }}>
          <h3>{g.bereich} ({g.gruppe})</h3>
          <p className="text-secondary">{t('res.mitglieder')}: {g.mitglieder.length}</p>
          {g.mitglieder.length > 0 && (
            <table className="resource-table compact">
              <tbody>
                {g.mitglieder.map(m => (
                  <tr key={m.nummer}>
                    <td>{m.nummer}</td>
                    <td>{m.bezeichnung}</td>
                    <td>{m.name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  )
}

// ===== Rollen =====

function RollenTab() {
  const { t } = useTheme()
  const [items, setItems] = useState<Rolle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Partial<Rolle> | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setItems(await fetchRollen()); setError('') }
    catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!editing) return
    try {
      if (editing.id) await updateRolle(editing.id, editing)
      else await createRolle(editing)
      setEditing(null); load()
    } catch (e: any) { setError(e.message) }
  }

  const remove = async (id: number) => {
    try { await deleteRolle(id); setDeleting(null); load() }
    catch (e: any) { setError(e.message) }
  }

  return (
    <div className="resource-panel">
      <div className="resource-toolbar">
        <div />
        <button className="btn btn-primary" onClick={() => setEditing({ bezeichnung: '', beschreibung: '', farbe: '#71717a' })}>
          <Plus size={16} /> {t('res.add')}
        </button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {editing && (
        <div className="resource-form card">
          <div className="form-grid">
            <label>{t('res.bezeichnung')}<input value={editing.bezeichnung || ''} onChange={e => setEditing({ ...editing, bezeichnung: e.target.value })} /></label>
            <label>{t('res.beschreibung')}<textarea value={editing.beschreibung || ''} onChange={e => setEditing({ ...editing, beschreibung: e.target.value })} /></label>
            <label>{t('res.farbe')}<input type="color" value={editing.farbe || '#71717a'} onChange={e => setEditing({ ...editing, farbe: e.target.value })} /></label>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={save}>{t('res.save')}</button>
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>{t('res.cancel')}</button>
          </div>
        </div>
      )}
      {loading ? <div className="loading-state"><Loader2 size={24} className="spin" /></div> :
        items.length === 0 ? <EmptyState text={t('res.empty')} /> : (
          <table className="resource-table">
            <thead><tr><th>{t('res.bezeichnung')}</th><th>{t('res.beschreibung')}</th><th>{t('res.farbe')}</th><th></th></tr></thead>
            <tbody>
              {items.map(r => (
                <tr key={r.id}>
                  <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}><span style={{ width: 12, height: 12, borderRadius: '50%', background: r.farbe, display: 'inline-block' }} />{r.bezeichnung}</span></td>
                  <td>{r.beschreibung || '-'}</td>
                  <td>{r.farbe}</td>
                  <td className="actions">
                    {deleting === r.id ? <DeleteConfirm onConfirm={() => remove(r.id)} onCancel={() => setDeleting(null)} t={t} /> : (
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

// ===== Räume =====

function RaeumeTab() {
  const { t } = useTheme()
  const [items, setItems] = useState<Raum[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Partial<Raum> | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setItems(await fetchRaeume(search)); setError('') }
    catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!editing) return
    try {
      if (editing.id) await updateRaum(editing.id, editing)
      else await createRaum(editing)
      setEditing(null); load()
    } catch (e: any) { setError(e.message) }
  }

  const remove = async (id: number) => {
    try { await deleteRaum(id); setDeleting(null); load() }
    catch (e: any) { setError(e.message) }
  }

  return (
    <div className="resource-panel">
      <div className="resource-toolbar">
        <div className="search-box">
          <Search size={16} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('res.search')} />
          {search && <button className="btn-icon" onClick={() => setSearch('')}><X size={14} /></button>}
        </div>
        <button className="btn btn-primary" onClick={() => setEditing({ bezeichnung: '', gebaeude: '', kapazitaet: 0, ausstattung: '', aktiv: 1 })}>
          <Plus size={16} /> {t('res.add')}
        </button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {editing && (
        <div className="resource-form card">
          <div className="form-grid">
            <label>{t('res.bezeichnung')}<input value={editing.bezeichnung || ''} onChange={e => setEditing({ ...editing, bezeichnung: e.target.value })} /></label>
            <label>{t('res.gebaeude')}<input value={editing.gebaeude || ''} onChange={e => setEditing({ ...editing, gebaeude: e.target.value })} /></label>
            <label>{t('res.kapazitaet')}<input type="number" min={0} value={editing.kapazitaet ?? 0} onChange={e => setEditing({ ...editing, kapazitaet: parseInt(e.target.value) || 0 })} /></label>
            <label>{t('res.ausstattung')}<textarea value={editing.ausstattung || ''} onChange={e => setEditing({ ...editing, ausstattung: e.target.value })} /></label>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={save}>{t('res.save')}</button>
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>{t('res.cancel')}</button>
          </div>
        </div>
      )}
      {loading ? <div className="loading-state"><Loader2 size={24} className="spin" /></div> :
        items.length === 0 ? <EmptyState text={t('res.empty')} /> : (
          <table className="resource-table">
            <thead><tr><th>{t('res.bezeichnung')}</th><th>{t('res.gebaeude')}</th><th>{t('res.kapazitaet')}</th><th>{t('res.ausstattung')}</th><th></th></tr></thead>
            <tbody>
              {items.map(r => (
                <tr key={r.id}>
                  <td>{r.bezeichnung}</td>
                  <td>{r.gebaeude || '-'}</td>
                  <td>{r.kapazitaet}</td>
                  <td>{r.ausstattung || '-'}</td>
                  <td className="actions">
                    {deleting === r.id ? <DeleteConfirm onConfirm={() => remove(r.id)} onCancel={() => setDeleting(null)} t={t} /> : (
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

// ===== Komponenten =====

function KomponentenTab() {
  const { t } = useTheme()
  const [items, setItems] = useState<Komponente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Partial<Komponente> | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setItems(await fetchKomponenten(search)); setError('') }
    catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!editing) return
    try {
      if (editing.id) await updateKomponente(editing.id, editing)
      else await createKomponente(editing)
      setEditing(null); load()
    } catch (e: any) { setError(e.message) }
  }

  const remove = async (id: number) => {
    try { await deleteKomponente(id); setDeleting(null); load() }
    catch (e: any) { setError(e.message) }
  }

  return (
    <div className="resource-panel">
      <div className="resource-toolbar">
        <div className="search-box">
          <Search size={16} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('res.search')} />
          {search && <button className="btn-icon" onClick={() => setSearch('')}><X size={14} /></button>}
        </div>
        <button className="btn btn-primary" onClick={() => setEditing({ bezeichnung: '', typ: '', beschreibung: '', verfuegbar: 1 })}>
          <Plus size={16} /> {t('res.add')}
        </button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {editing && (
        <div className="resource-form card">
          <div className="form-grid">
            <label>{t('res.bezeichnung')}<input value={editing.bezeichnung || ''} onChange={e => setEditing({ ...editing, bezeichnung: e.target.value })} /></label>
            <label>{t('res.typ')}<input value={editing.typ || ''} onChange={e => setEditing({ ...editing, typ: e.target.value })} /></label>
            <label>{t('res.beschreibung')}<textarea value={editing.beschreibung || ''} onChange={e => setEditing({ ...editing, beschreibung: e.target.value })} /></label>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={save}>{t('res.save')}</button>
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>{t('res.cancel')}</button>
          </div>
        </div>
      )}
      {loading ? <div className="loading-state"><Loader2 size={24} className="spin" /></div> :
        items.length === 0 ? <EmptyState text={t('res.empty')} /> : (
          <table className="resource-table">
            <thead><tr><th>{t('res.bezeichnung')}</th><th>{t('res.typ')}</th><th>{t('res.beschreibung')}</th><th>{t('res.verfuegbar')}</th><th></th></tr></thead>
            <tbody>
              {items.map(k => (
                <tr key={k.id}>
                  <td>{k.bezeichnung}</td>
                  <td>{k.typ || '-'}</td>
                  <td>{k.beschreibung || '-'}</td>
                  <td>{k.verfuegbar ? 'Ja' : 'Nein'}</td>
                  <td className="actions">
                    {deleting === k.id ? <DeleteConfirm onConfirm={() => remove(k.id)} onCancel={() => setDeleting(null)} t={t} /> : (
                      <><button className="btn-icon" onClick={() => setEditing(k)}><Pencil size={14} /></button><button className="btn-icon danger" onClick={() => setDeleting(k.id)}><Trash2 size={14} /></button></>
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

// ===== Termine (read-only from existing termine table) =====

function TermineTab() {
  const { t } = useTheme()
  const [items, setItems] = useState<TerminDef[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchResourceTermine().then(setItems).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading-state"><Loader2 size={24} className="spin" /></div>
  if (items.length === 0) return <EmptyState text={t('res.empty')} />

  return (
    <div className="resource-panel">
      <table className="resource-table">
        <thead><tr><th>Nr</th><th>{t('res.bezeichnung')}</th><th>Intervall</th><th>Dauer</th></tr></thead>
        <tbody>
          {items.map(tm => (
            <tr key={tm.bespr_nr}>
              <td>{tm.bespr_nr}</td>
              <td>{tm.bezeichnung}</td>
              <td>{tm.intervall_text || tm.intervall}</td>
              <td>{tm.dauer_min} min</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
