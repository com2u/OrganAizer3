import { useEffect, useState, useCallback } from 'react'
import { useTheme } from '../ThemeContext'
import {
  Users, MapPin, Puzzle, Tag, Calendar, Plus, Pencil, Trash2,
  Search, X, Loader2, AlertTriangle, GripVertical
} from 'lucide-react'
import {
  fetchPersonen, createPerson, updatePerson, deletePerson,
  fetchRollen, createRolle, updateRolle, deleteRolle,
  fetchRaeume, createRaum, updateRaum, deleteRaum,
  fetchKomponenten, createKomponente, updateKomponente, deleteKomponente,
  fetchGruppen, createGruppe, updateGruppe, deleteGruppe,
  createMitglied, updateMitglied, deleteMitglied,
  fetchResourceTermine, createTermin, updateTermin, deleteTermin,
  fetchIntervalle
} from '../api'
import type { Person, Rolle, Raum, Komponente, Gruppe, GruppenMitglied, TerminDef, Intervall } from '../types'

type Tab = 'personen' | 'gruppen' | 'rollen' | 'raeume' | 'komponenten' | 'termine'

export default function RessourcenView() {
  const { t } = useTheme()
  const [tab, setTab] = useState<Tab>('gruppen')

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
          ['gruppen', Users, 'res.tab.gruppen'],
          ['personen', Users, 'res.tab.personen'],
          ['rollen', Tag, 'res.tab.rollen'],
          ['termine', Calendar, 'res.tab.termine'],
          ['raeume', MapPin, 'res.tab.raeume'],
          ['komponenten', Puzzle, 'res.tab.komponenten'],
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
        <div className="resource-form card resource-edit-modal" role="dialog" aria-modal="true">
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
                <tr key={p.id} onDoubleClick={() => setEditing(p)} title={t('res.doubleClickEdit')}>
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
  const [error, setError] = useState('')
  const [editingGruppe, setEditingGruppe] = useState<{ gruppe: string; bereich: string; isNew: boolean } | null>(null)
  const [deletingGruppe, setDeletingGruppe] = useState<string | null>(null)
  const [editingMitglied, setEditingMitglied] = useState<{ gruppe: string; nummer: string; bezeichnung: string; name: string; isNew: boolean } | null>(null)
  const [deletingMitglied, setDeletingMitglied] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setItems(await fetchGruppen()); setError('') }
    catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const saveGruppe = async () => {
    if (!editingGruppe) return
    try {
      if (editingGruppe.isNew) await createGruppe({ gruppe: editingGruppe.gruppe, bereich: editingGruppe.bereich })
      else await updateGruppe(editingGruppe.gruppe, { bereich: editingGruppe.bereich })
      setEditingGruppe(null); load()
    } catch (e: any) { setError(e.message) }
  }

  const removeGruppe = async (gruppe: string) => {
    try { await deleteGruppe(gruppe); setDeletingGruppe(null); load() }
    catch (e: any) { setError(e.message) }
  }

  const saveMitglied = async () => {
    if (!editingMitglied) return
    try {
      if (editingMitglied.isNew)
        await createMitglied(editingMitglied.gruppe, { nummer: editingMitglied.nummer, bezeichnung: editingMitglied.bezeichnung, name: editingMitglied.name })
      else
        await updateMitglied(editingMitglied.nummer, { bezeichnung: editingMitglied.bezeichnung, name: editingMitglied.name })
      setEditingMitglied(null); load()
    } catch (e: any) { setError(e.message) }
  }

  const removeMitglied = async (nummer: string) => {
    try { await deleteMitglied(nummer); setDeletingMitglied(null); load() }
    catch (e: any) { setError(e.message) }
  }

  if (loading) return <div className="loading-state"><Loader2 size={24} className="spin" /></div>

  return (
    <div className="resource-panel">
      <div className="resource-toolbar">
        <div />
        <button className="btn btn-primary" onClick={() => setEditingGruppe({ gruppe: '', bereich: '', isNew: true })}>
          <Plus size={16} /> {t('res.gruppe.add')}
        </button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {editingGruppe && (
        <div className="resource-form card resource-edit-modal" role="dialog" aria-modal="true">
          <div className="form-grid">
            <label>{t('res.gruppe')}<input value={editingGruppe.gruppe} disabled={!editingGruppe.isNew} onChange={e => setEditingGruppe({ ...editingGruppe, gruppe: e.target.value })} /></label>
            <label>{t('res.bereich')}<input value={editingGruppe.bereich} onChange={e => setEditingGruppe({ ...editingGruppe, bereich: e.target.value })} /></label>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={saveGruppe}>{t('res.save')}</button>
            <button className="btn btn-ghost" onClick={() => setEditingGruppe(null)}>{t('res.cancel')}</button>
          </div>
        </div>
      )}
      {editingMitglied && (
        <div className="resource-form card resource-edit-modal" role="dialog" aria-modal="true">
          <div className="form-grid">
            <label>{t('res.nummer')}<input value={editingMitglied.nummer} disabled={!editingMitglied.isNew} onChange={e => setEditingMitglied({ ...editingMitglied, nummer: e.target.value })} /></label>
            <label>{t('res.bezeichnung')}<input value={editingMitglied.bezeichnung} onChange={e => setEditingMitglied({ ...editingMitglied, bezeichnung: e.target.value })} /></label>
            <label>{t('res.name')}<input value={editingMitglied.name} onChange={e => setEditingMitglied({ ...editingMitglied, name: e.target.value })} /></label>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={saveMitglied}>{t('res.save')}</button>
            <button className="btn btn-ghost" onClick={() => setEditingMitglied(null)}>{t('res.cancel')}</button>
          </div>
        </div>
      )}
      {items.length === 0 ? <EmptyState text={t('res.empty')} /> : items.map(g => (
        <div key={g.gruppe} className="card" style={{ marginBottom: '1rem' }} onDoubleClick={() => setEditingGruppe({ gruppe: g.gruppe, bereich: g.bereich, isNew: false })} title={t('res.doubleClickEdit')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3>{g.bereich} ({g.gruppe})</h3>
            <div className="actions">
              {deletingGruppe === g.gruppe ? <DeleteConfirm onConfirm={() => removeGruppe(g.gruppe)} onCancel={() => setDeletingGruppe(null)} t={t} /> : (
                <>
                  <button className="btn-icon" onClick={() => setEditingGruppe({ gruppe: g.gruppe, bereich: g.bereich, isNew: false })}><Pencil size={14} /></button>
                  <button className="btn-icon danger" onClick={() => setDeletingGruppe(g.gruppe)}><Trash2 size={14} /></button>
                  <button className="btn-icon" title={t('res.mitglied.add')} onClick={() => setEditingMitglied({ gruppe: g.gruppe, nummer: '', bezeichnung: '', name: '', isNew: true })}><Plus size={14} /></button>
                </>
              )}
            </div>
          </div>
          <p className="text-secondary">{t('res.mitglieder')}: {g.mitglieder.length}</p>
          {g.mitglieder.length > 0 && (
            <table className="resource-table compact">
              <tbody>
                {g.mitglieder.map((m: GruppenMitglied) => (
                  <tr key={m.nummer} onDoubleClick={(event) => { event.stopPropagation(); setEditingMitglied({ gruppe: g.gruppe, nummer: m.nummer, bezeichnung: m.bezeichnung, name: m.name || '', isNew: false }) }} title={t('res.doubleClickEdit')}>
                    <td>{m.nummer}</td>
                    <td>{m.bezeichnung}</td>
                    <td>{m.name || '-'}</td>
                    <td className="actions">
                      {deletingMitglied === m.nummer ? <DeleteConfirm onConfirm={() => removeMitglied(m.nummer)} onCancel={() => setDeletingMitglied(null)} t={t} /> : (
                        <>
                          <button className="btn-icon" onClick={() => setEditingMitglied({ gruppe: g.gruppe, nummer: m.nummer, bezeichnung: m.bezeichnung, name: m.name || '', isNew: false })}><Pencil size={14} /></button>
                          <button className="btn-icon danger" onClick={() => setDeletingMitglied(m.nummer)}><Trash2 size={14} /></button>
                        </>
                      )}
                    </td>
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
        <div className="resource-form card resource-edit-modal" role="dialog" aria-modal="true">
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
                <tr key={r.id} onDoubleClick={() => setEditing(r)} title={t('res.doubleClickEdit')}>
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
        <div className="resource-form card resource-edit-modal" role="dialog" aria-modal="true">
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
                <tr key={r.id} onDoubleClick={() => setEditing(r)} title={t('res.doubleClickEdit')}>
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
        <div className="resource-form card resource-edit-modal" role="dialog" aria-modal="true">
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
                <tr key={k.id} onDoubleClick={() => setEditing(k)} title={t('res.doubleClickEdit')}>
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
  const [intervalle, setIntervalle] = useState<Intervall[]>([])
  const [gruppen, setGruppen] = useState<Gruppe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Partial<TerminDef> & { isNew?: boolean } | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rows, iv, groupRows] = await Promise.all([fetchResourceTermine(), fetchIntervalle(), fetchGruppen()])
      setItems(rows); setIntervalle(iv); setGruppen(groupRows); setError('')
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!editing) return
    const payload = {
      bezeichnung: editing.bezeichnung || '',
      intervall: editing.intervall || '',
      dauer_min: Number(editing.dauer_min) || 0,
      teilnehmer: editing.teilnehmer || [],
    }
    try {
      if (editing.isNew) await createTermin(payload)
      else if (editing.bespr_nr != null) await updateTermin(editing.bespr_nr, payload)
      setEditing(null); load()
    } catch (e: any) { setError(e.message) }
  }

  const remove = async (nr: number) => {
    try { await deleteTermin(nr); setDeleting(null); load() }
    catch (e: any) { setError(e.message) }
  }

  const addParticipant = (nummer: string) => {
    if (!editing) return
    const selected = editing.teilnehmer || []
    if (!selected.includes(nummer)) setEditing({ ...editing, teilnehmer: [...selected, nummer] })
  }

  const removeParticipant = (nummer: string) => {
    if (!editing) return
    setEditing({ ...editing, teilnehmer: (editing.teilnehmer || []).filter(value => value !== nummer) })
  }

  const allMembers = gruppen.flatMap(group =>
    group.mitglieder.map(member => ({ ...member, gruppe: group.gruppe, bereich: group.bereich }))
  )

  return (
    <div className="resource-panel">
      <div className="resource-toolbar">
        <div />
        <button className="btn btn-primary" onClick={() => setEditing({ bezeichnung: '', intervall: intervalle[0]?.kuerzel || '', dauer_min: 30, isNew: true })}>
          <Plus size={16} /> {t('res.add')}
        </button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {editing && (
        <div className="resource-form card resource-edit-modal termin-edit-modal" role="dialog" aria-modal="true">
          <div className="form-grid">
            <label>{t('res.bezeichnung')}<input value={editing.bezeichnung || ''} onChange={e => setEditing({ ...editing, bezeichnung: e.target.value })} /></label>
            <label>{t('res.intervall')}
              <select value={editing.intervall || ''} onChange={e => setEditing({ ...editing, intervall: e.target.value })}>
                {intervalle.map(iv => <option key={iv.kuerzel} value={iv.kuerzel}>{iv.bedeutung} ({iv.kuerzel})</option>)}
              </select>
            </label>
            <label>{t('res.dauer')}<input type="number" min={0} value={editing.dauer_min ?? 0} onChange={e => setEditing({ ...editing, dauer_min: Number(e.target.value) })} /></label>
          </div>
          <div className="participant-picker">
            <div className="participant-column">
              <h4>Verfügbare Gruppen / Benutzer</h4>
              <p className="text-secondary">Einträge per Drag-and-drop oder Klick hinzufügen.</p>
              <div className="participant-list" onDragOver={event => event.preventDefault()}>
                {gruppen.map(group => (
                  <section key={group.gruppe} className="participant-group">
                    <strong>{group.bereich} ({group.gruppe})</strong>
                    {group.mitglieder.filter(member => !(editing.teilnehmer || []).includes(member.nummer)).map(member => (
                      <button key={member.nummer} type="button" className="participant-chip" draggable
                        onDragStart={event => event.dataTransfer.setData('text/plain', member.nummer)}
                        onClick={() => addParticipant(member.nummer)}>
                        <GripVertical size={14} />
                        <span>{member.bezeichnung}<small>{member.nummer}{member.name ? ` · ${member.name}` : ''}</small></span>
                      </button>
                    ))}
                  </section>
                ))}
              </div>
            </div>
            <div className="participant-column participant-selected"
              onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move' }}
              onDrop={event => { event.preventDefault(); addParticipant(event.dataTransfer.getData('text/plain')) }}>
              <h4>Teilnehmer am Termin</h4>
              <p className="text-secondary">{(editing.teilnehmer || []).length} ausgewählt</p>
              <div className="participant-list">
                {(editing.teilnehmer || []).map(nummer => {
                  const member = allMembers.find(item => item.nummer === nummer)
                  return (
                    <button key={nummer} type="button" className="participant-chip selected" draggable
                      onDragStart={event => event.dataTransfer.setData('text/plain', nummer)}
                      onClick={() => removeParticipant(nummer)}>
                      <GripVertical size={14} />
                      <span>{member?.bezeichnung || nummer}<small>{member?.bereich || 'Gruppe'} · {nummer}</small></span>
                      <X size={14} />
                    </button>
                  )
                })}
                {(editing.teilnehmer || []).length === 0 && <div className="participant-drop-hint">Benutzer hier ablegen</div>}
              </div>
            </div>
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
            <thead><tr><th>Nr</th><th>{t('res.bezeichnung')}</th><th>{t('res.intervall')}</th><th>{t('res.dauer')}</th><th></th></tr></thead>
            <tbody>
              {items.map(tm => (
                <tr key={tm.bespr_nr} onDoubleClick={() => setEditing({ ...tm, teilnehmer: tm.teilnehmer || [] })} title={t('res.doubleClickEdit')}>
                  <td>{tm.bespr_nr}</td>
                  <td>{tm.bezeichnung}</td>
                  <td>{tm.intervall_text || tm.intervall}</td>
                  <td>{tm.dauer_min} min</td>
                  <td className="actions">
                    {deleting === tm.bespr_nr ? <DeleteConfirm onConfirm={() => remove(tm.bespr_nr)} onCancel={() => setDeleting(null)} t={t} /> : (
                      <><button className="btn-icon" onClick={() => setEditing({ ...tm })}><Pencil size={14} /></button><button className="btn-icon danger" onClick={() => setDeleting(tm.bespr_nr)}><Trash2 size={14} /></button></>
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
