import { useState, useEffect, useCallback, useRef, KeyboardEvent } from 'react'
import MDEditor from '@uiw/react-md-editor'
import { useTheme } from '../ThemeContext'
import {
  Search, Clock, Tag, Loader2, FolderOpen, ChevronRight, ChevronDown,
  File, Folder, RefreshCw, Save, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown,
  LibraryBig, Plus, ExternalLink, ShieldCheck, Sparkles, KeyRound, Check,
  Presentation, Maximize2, Clapperboard,
} from 'lucide-react'
import {
  fetchObsidianTree, searchObsidian, fetchObsidianTags, fetchObsidianRecent,
  fetchObsidianNote, saveObsidianNote,
  ObsidianTreeNode, ObsidianDirNode,
  ObsidianSearchResult, ObsidianTag, ObsidianNote,
  fetchOpenNotebookStatus, fetchOpenNotebookAccess, fetchResearchNotebooks, createResearchNotebook,
  OpenNotebookStatus, ResearchNotebook,
  fetchIntegrationCapabilities, IntegrationCapabilities, fetchSlidevProject, saveSlidevProject,
  fetchWorkspaceTicket, fetchHyperframesStatus,
} from '../api'

type Tab = 'search' | 'navigation' | 'tags' | 'recent' | 'research' | 'slidev' | 'hyperframes'

// ── Editor ────────────────────────────────────────────────────────────────────

interface EditorProps {
  path: string
  onClose?: () => void
}

function NoteEditor({ path }: EditorProps) {
  const { t, theme } = useTheme()
  const [content, setContent] = useState('')
  const [original, setOriginal] = useState('')
  const [mtime, setMtime] = useState<number | undefined>()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)

  const loadNote = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSaveMsg(null)
    setConflict(false)
    try {
      const note = await fetchObsidianNote(path)
      setContent(note.content)
      setOriginal(note.content)
      setMtime(note.mtime)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [path])

  useEffect(() => { loadNote() }, [loadNote])

  const isDirty = content !== original

  const save = useCallback(async () => {
    if (!isDirty || saving) return
    setSaving(true)
    setSaveMsg(null)
    setError(null)
    setConflict(false)
    try {
      const result = await saveObsidianNote(path, content, mtime)
      setOriginal(content)
      setMtime(result.mtime)
      setSaveMsg(t('wissen.saved'))
      setTimeout(() => setSaveMsg(null), 2000)
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'conflict' in e) {
        setConflict(true)
      } else {
        setError(e instanceof Error ? e.message : String(e))
      }
    } finally {
      setSaving(false)
    }
  }, [path, content, mtime, isDirty, saving, t])

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      save()
    }
  }

  if (loading) {
    return (
      <div className="note-editor-loading">
        <Loader2 size={18} className="spin" />
        <span>{t('wissen.loading')}</span>
      </div>
    )
  }

  if (error && !content) {
    return (
      <div className="note-editor-error">
        <AlertTriangle size={16} />
        <span>{t('wissen.loadError')}: {error}</span>
        <button className="secondary-btn" onClick={loadNote}>{t('wissen.reload')}</button>
      </div>
    )
  }

  return (
    <div className="note-editor" onKeyDown={handleKeyDown}>
      <div className="note-editor-toolbar">
        <span className="note-editor-path">{path}</span>
        <div className="note-editor-actions">
          {isDirty && !saving && <span className="note-dirty-indicator">{t('wissen.unsavedChanges')}</span>}
          {saveMsg && <span className="note-saved-indicator">{saveMsg}</span>}
          {error && <span className="note-error-indicator"><AlertTriangle size={12} /> {error}</span>}
          <button
            className="primary-btn note-save-btn"
            onClick={save}
            disabled={!isDirty || saving}
            title="Ctrl+S"
          >
            {saving ? <><Loader2 size={13} className="spin" /> {t('wissen.saving')}</> : <><Save size={13} /> {t('wissen.save')}</>}
          </button>
        </div>
      </div>
      {conflict && (
        <div className="note-conflict-banner">
          <AlertTriangle size={14} />
          <span>{t('wissen.conflict')}</span>
          <button className="secondary-btn" onClick={loadNote}>{t('wissen.conflictReload')}</button>
        </div>
      )}
      <div className="note-md-editor" data-color-mode={theme}>
        <MDEditor
          value={content}
          onChange={(val) => setContent(val || '')}
          preview="live"
          height="100%"
          visibleDragbar={false}
          hideToolbar={false}
        />
      </div>
    </div>
  )
}

// ── Tree ──────────────────────────────────────────────────────────────────────

interface TreeNodeProps {
  node: ObsidianTreeNode
  selectedPath: string | null
  onSelect: (path: string) => void
  depth: number
}

function TreeNodeItem({ node, selectedPath, onSelect, depth }: TreeNodeProps) {
  const [open, setOpen] = useState(false)

  if (node.type === 'file') {
    return (
      <button
        className={`tree-file${selectedPath === node.path ? ' active' : ''}`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        onClick={() => onSelect(node.path)}
        title={node.path}
      >
        <File size={13} />
        <span>{node.name}</span>
      </button>
    )
  }

  const dir = node as ObsidianDirNode
  return (
    <div className="tree-dir">
      {dir.name && (
        <button
          className="tree-dir-toggle"
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          onClick={() => setOpen(o => !o)}
        >
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          <Folder size={13} />
          <span>{dir.name}</span>
        </button>
      )}
      {(open || !dir.name) && dir.children.map((child, i) => (
        <TreeNodeItem
          key={child.path ?? i}
          node={child}
          selectedPath={selectedPath}
          onSelect={onSelect}
          depth={dir.name ? depth + 1 : depth}
        />
      ))}
    </div>
  )
}

// ── Search Tab ────────────────────────────────────────────────────────────────

interface SearchTabProps {
  onOpenNote: (path: string) => void
}

function SearchTab({ onOpenNote }: SearchTabProps) {
  const { t } = useTheme()
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'fulltext' | 'headings'>('fulltext')
  const [results, setResults] = useState<ObsidianSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  const doSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    setResults([])
    setSearched(true)
    try {
      const data = await searchObsidian(query.trim(), mode)
      setResults(data.results)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') doSearch()
  }

  return (
    <div className="wissen-search">
      <div className="search-controls">
        <div className="search-input-row">
          <input
            type="text"
            className="search-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder={t('wissen.searchPlaceholder')}
            aria-label={t('wissen.searchTerm')}
          />
          <button className="primary-btn" onClick={doSearch} disabled={loading || !query.trim()}>
            {loading ? <Loader2 size={14} className="spin" /> : <Search size={14} />}
            {loading ? t('wissen.searching') : t('wissen.searchBtn')}
          </button>
        </div>
        <div className="search-mode-row">
          <span className="search-mode-label">{t('wissen.mode')}:</span>
          <label className="radio-label">
            <input type="radio" name="search-mode" value="fulltext" checked={mode === 'fulltext'} onChange={() => setMode('fulltext')} />
            {t('wissen.modeFulltext')}
          </label>
          <label className="radio-label">
            <input type="radio" name="search-mode" value="headings" checked={mode === 'headings'} onChange={() => setMode('headings')} />
            {t('wissen.modeHeadings')}
          </label>
        </div>
      </div>

      {error && (
        <div className="wissen-error"><AlertTriangle size={14} /> {error}</div>
      )}

      {!loading && searched && results.length === 0 && !error && (
        <div className="wissen-empty">{t('wissen.noResults')}</div>
      )}

      <div className="search-results">
        {results.map((r, i) => (
          <div key={i} className="search-result-card">
            <div className="result-header">
              <span className="result-title">{r.title}</span>
              <button className="ghost-btn" onClick={() => onOpenNote(r.path)} title={t('wissen.openNote')}>
                <FolderOpen size={13} /> {t('wissen.openNote')}
              </button>
            </div>
            <p className="result-snippet">{r.snippet}</p>
            <div className="result-meta">
              <span className="result-path"><FolderOpen size={11} /> {r.path}</span>
              {r.tags.length > 0 && (
                <div className="result-tags">
                  {r.tags.slice(0, 5).map(tag => <span key={tag} className="tag-chip">#{tag}</span>)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Navigation Tab ────────────────────────────────────────────────────────────

function NavigationTab() {
  const { t } = useTheme()
  const [tree, setTree] = useState<ObsidianDirNode | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [vaultMissing, setVaultMissing] = useState(false)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<'tree' | 'editor'>('tree')

  const loadTree = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchObsidianTree()
      setTree(data.tree)
      setVaultMissing(!!data.vault_missing)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTree() }, [])

  const handleSelect = (path: string) => {
    setSelectedPath(path)
    setMobileView('editor')
  }

  return (
    <div className="nav-tab">
      <div className="nav-toolbar">
        <button className="ghost-btn" onClick={loadTree} disabled={loading} aria-label={t('wissen.reload')}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> {t('wissen.reload')}
        </button>
        {selectedPath && (
          <button className="ghost-btn nav-back-btn" onClick={() => setMobileView('tree')}>
            <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} /> {t('wissen.navigation')}
          </button>
        )}
      </div>

      {error && <div className="wissen-error"><AlertTriangle size={14} /> {error}</div>}

      <div className={`nav-layout ${mobileView}`}>
        <div className="nav-tree-pane">
          {loading && !tree && (
            <div className="wissen-loading"><Loader2 size={16} className="spin" /> {t('wissen.loading')}</div>
          )}
          {vaultMissing && (
            <div className="wissen-empty">
              <p>{t('wissen.noVault')}</p>
              <p className="hint">{t('wissen.noVaultHint')}</p>
            </div>
          )}
          {tree && !vaultMissing && (
            <div className="tree-container">
              <TreeNodeItem node={tree} selectedPath={selectedPath} onSelect={handleSelect} depth={0} />
            </div>
          )}
        </div>
        <div className="nav-editor-pane">
          {!selectedPath ? (
            <div className="wissen-empty">
              <p>{t('wissen.selectNote')}</p>
              <p className="hint">{t('wissen.selectNoteHint')}</p>
            </div>
          ) : (
            <NoteEditor key={selectedPath} path={selectedPath} />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Tags Tab ──────────────────────────────────────────────────────────────────

interface TagsTabProps {
  onOpenNote: (path: string) => void
}

function TagsTab({ onOpenNote }: TagsTabProps) {
  const { t } = useTheme()
  const [tags, setTags] = useState<ObsidianTag[]>([])
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState<ObsidianTag | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchObsidianTags()
      .then(d => setTags(d.tags))
      .catch(e => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter
    ? tags.filter(t => t.tag.toLowerCase().includes(filter.toLowerCase()))
    : tags

  return (
    <div className="tags-tab">
      <div className="tags-search-row">
        <input
          type="text"
          className="search-input"
          value={filter}
          onChange={e => { setFilter(e.target.value); setSelected(null) }}
          placeholder={t('wissen.tagFilter')}
          aria-label={t('wissen.tagFilter')}
        />
      </div>

      {error && <div className="wissen-error"><AlertTriangle size={14} /> {error}</div>}

      {loading && <div className="wissen-loading"><Loader2 size={16} className="spin" /> {t('wissen.loading')}</div>}

      {!loading && tags.length === 0 && !error && (
        <div className="wissen-empty">
          <p>{t('wissen.noTags')}</p>
          <p className="hint">{t('wissen.tagsHint')}</p>
        </div>
      )}

      <div className="tags-layout">
        <div className="tags-list-pane">
          {filtered.map(tag => (
            <button
              key={tag.tag}
              className={`tag-item${selected?.tag === tag.tag ? ' active' : ''}`}
              onClick={() => setSelected(tag)}
            >
              <Tag size={12} />
              <span className="tag-name">#{tag.tag}</span>
              <span className="tag-count">{tag.count}</span>
            </button>
          ))}
        </div>
        <div className="tags-files-pane">
          {!selected ? (
            <p className="hint">{t('wissen.tagSelectHint')}</p>
          ) : selected.files.length === 0 ? (
            <p className="hint">{t('wissen.tagNoFiles')}</p>
          ) : (
            <div className="tag-files-list">
              <div className="tag-files-header">
                <Tag size={13} /> <strong>#{selected.tag}</strong>
                <span className="tag-count-label">{selected.count} {t('wissen.tagFiles')}</span>
              </div>
              {selected.files.map(f => (
                <button key={f} className="tag-file-item ghost-btn" onClick={() => onOpenNote(f)}>
                  <File size={12} />
                  <span>{f}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Recent Tab ────────────────────────────────────────────────────────────────

interface RecentTabProps {
  onOpenNote: (path: string) => void
}

function RecentTab({ onOpenNote }: RecentTabProps) {
  const { t } = useTheme()
  const [notes, setNotes] = useState<ObsidianNote[]>([])
  const [sort, setSort] = useState<'modified' | 'created'>('modified')
  const [order, setOrder] = useState<'desc' | 'asc'>('desc')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchObsidianRecent(sort, order)
      .then(d => setNotes(d.notes))
      .catch(e => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [sort, order])

  useEffect(() => { load() }, [load])

  const fmt = (ts: number) =>
    new Date(ts * 1000).toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

  const toggleSort = (field: 'modified' | 'created') => {
    if (sort === field) {
      setOrder(o => o === 'desc' ? 'asc' : 'desc')
    } else {
      setSort(field)
      setOrder('desc')
    }
  }

  const SortIcon = ({ field }: { field: 'modified' | 'created' }) => {
    if (sort !== field) return <ArrowUpDown size={12} />
    return order === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />
  }

  return (
    <div className="recent-tab">
      {error && <div className="wissen-error"><AlertTriangle size={14} /> {error}</div>}
      {loading && <div className="wissen-loading"><Loader2 size={16} className="spin" /> {t('wissen.loading')}</div>}
      {!loading && notes.length === 0 && !error && (
        <div className="wissen-empty">
          <p>{t('wissen.noRecent')}</p>
          <p className="hint">{t('wissen.recentHint')}</p>
        </div>
      )}
      {notes.length > 0 && (
        <table className="recent-table">
          <thead>
            <tr>
              <th>{t('wissen.path')}</th>
              <th>
                <button className="sort-btn" onClick={() => toggleSort('modified')}>
                  {t('wissen.sortModified')} <SortIcon field="modified" />
                </button>
              </th>
              <th>
                <button className="sort-btn" onClick={() => toggleSort('created')}>
                  {t('wissen.sortCreated')} <SortIcon field="created" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {notes.map(n => (
              <tr key={n.path} className="recent-row" onClick={() => onOpenNote(n.path)} style={{ cursor: 'pointer' }}>
                <td className="recent-path"><File size={12} /> {n.path}</td>
                <td className="recent-ts">{fmt(n.mtime)}</td>
                <td className="recent-ts">{fmt(n.created)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── Floating editor overlay (open from Search/Tags/Recent) ────────────────────

interface FloatingEditorProps {
  path: string
  onClose: () => void
}

function FloatingEditor({ path, onClose }: FloatingEditorProps) {
  return (
    <div className="floating-editor-overlay" role="dialog" aria-modal="true" aria-label={path}>
      <div className="floating-editor-backdrop" onClick={onClose} />
      <div className="floating-editor-panel">
        <div className="floating-editor-header">
          <span className="floating-editor-title">{path}</span>
          <button className="ghost-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <NoteEditor path={path} />
      </div>
    </div>
  )
}

function ResearchNotebooksTab() {
  const { t } = useTheme()
  const [status, setStatus] = useState<OpenNotebookStatus | null>(null)
  const [notebooks, setNotebooks] = useState<ResearchNotebook[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'studio' | 'overview'>('studio')
  const [accessCopied, setAccessCopied] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const nextStatus = await fetchOpenNotebookStatus()
      setStatus(nextStatus)
      if (nextStatus.available) setNotebooks(await fetchResearchNotebooks())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const create = async () => {
    if (!name.trim()) return
    setCreating(true)
    setError(null)
    try {
      await createResearchNotebook(name.trim(), description.trim())
      setName('')
      setDescription('')
      setShowForm(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setCreating(false)
    }
  }

  const copyAccess = async () => {
    try {
      const access = await fetchOpenNotebookAccess()
      if (!access.configured || !access.password) throw new Error(t('wissen.researchAccessMissing'))
      await navigator.clipboard.writeText(access.password)
      setAccessCopied(true)
      setTimeout(() => setAccessCopied(false), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="research-workspace">
      <div className="research-hero">
        <div>
          <span className="research-eyebrow"><Sparkles size={14} /> {t('wissen.researchGrounded')}</span>
          <h3>{t('wissen.researchTitle')}</h3>
          <p>{t('wissen.researchIntro')}</p>
        </div>
        <div className={`service-pill ${status?.available ? 'online' : 'offline'}`}>
          <span className="service-dot" />
          {loading ? t('wissen.loading') : status?.available ? t('wissen.researchReady') : t('wissen.researchOffline')}
        </div>
      </div>

      <div className="research-mode-switch" role="tablist" aria-label={t('wissen.research')}>
        <button className={mode === 'studio' ? 'active' : ''} role="tab" aria-selected={mode === 'studio'} onClick={() => setMode('studio')}>
          <Sparkles size={14} /> {t('wissen.researchStudio')}
        </button>
        <button className={mode === 'overview' ? 'active' : ''} role="tab" aria-selected={mode === 'overview'} onClick={() => setMode('overview')}>
          <LibraryBig size={14} /> {t('wissen.researchOverview')}
        </button>
      </div>

      {!loading && !status?.available && (
        <div className="research-offline-card">
          <AlertTriangle size={20} />
          <div><strong>{t('wissen.researchOfflineTitle')}</strong><p>{t('wissen.researchOfflineHint')}</p></div>
        </div>
      )}

      {mode === 'studio' && status?.public_url && (
        <div className="research-studio-shell">
          <div className="research-studio-toolbar">
            <span><ShieldCheck size={14} /> {t('wissen.researchEmbedded')}</span>
            <div className="research-studio-toolbar-actions">
              <button onClick={copyAccess}>
                {accessCopied ? <Check size={14} /> : <KeyRound size={14} />}
                {accessCopied ? t('wissen.researchAccessCopied') : t('wissen.researchCopyAccess')}
              </button>
              <a href={status.public_url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> {t('wissen.researchNewWindow')}</a>
            </div>
          </div>
          <iframe
            className="research-studio-frame"
            src={status.public_url}
            title={t('wissen.researchStudio')}
            allow="clipboard-read; clipboard-write; microphone; autoplay"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      )}

      {mode === 'overview' && <>
      <div className="research-actions">
        <button className="primary-btn" onClick={() => setShowForm(true)} disabled={!status?.available}>
          <Plus size={15} /> {t('wissen.researchNew')}
        </button>
        <button className="secondary-btn" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> {t('wissen.reload')}
        </button>
        {status?.public_url && (
          <a className="secondary-btn" href={status.public_url} target="_blank" rel="noreferrer">
            <ExternalLink size={14} /> {t('wissen.researchStudio')}
          </a>
        )}
      </div>

      {error && <div className="wissen-error"><AlertTriangle size={14} /> {error}</div>}
      {showForm && (
        <div className="research-create-card">
          <label>{t('wissen.researchName')}<input autoFocus value={name} onChange={e => setName(e.target.value)} maxLength={160} /></label>
          <label>{t('wissen.researchDescription')}<textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} maxLength={2000} /></label>
          <div className="modal-actions">
            <button className="secondary-btn" onClick={() => setShowForm(false)}>{t('cancel')}</button>
            <button className="primary-btn" onClick={create} disabled={!name.trim() || creating}>
              {creating && <Loader2 size={14} className="spin" />} {t('wissen.researchCreate')}
            </button>
          </div>
        </div>
      )}

      {status?.available && !loading && notebooks.length === 0 && !showForm && (
        <div className="research-empty">
          <LibraryBig size={32} />
          <h4>{t('wissen.researchEmpty')}</h4>
          <p>{t('wissen.researchEmptyHint')}</p>
        </div>
      )}
      <div className="research-grid">
        {notebooks.map(notebook => (
          <article className="research-card" key={notebook.id}>
            <div className="research-card-icon"><LibraryBig size={20} /></div>
            <div><h4>{notebook.name}</h4><p>{notebook.description || t('wissen.researchNoDescription')}</p></div>
            {status?.public_url && <a href={status.public_url} target="_blank" rel="noreferrer" aria-label={notebook.name}><ExternalLink size={16} /></a>}
          </article>
        ))}
      </div>

      <div className="research-capabilities">
        <span><ShieldCheck size={16} /> {t('wissen.researchPrivate')}</span>
        <span>{t('wissen.researchSources')}</span>
        <span>{t('wissen.researchChat')}</span>
        <span>{t('wissen.researchAudio')}</span>
      </div>
      </>}
    </div>
  )
}

// ── Main WissenView ───────────────────────────────────────────────────────────

function SlidevTab({ publicUrl }: { publicUrl: string }) {
  const { theme } = useTheme()
  const [mode, setMode] = useState<'editor' | 'presentation'>('editor')
  const [content, setContent] = useState('')
  const [message, setMessage] = useState('')
  const [embedUrl, setEmbedUrl] = useState('')
  const frame = useCallback((node: HTMLIFrameElement | null) => { (window as unknown as { __slidevFrame?: HTMLIFrameElement }).__slidevFrame = node || undefined }, [])
  useEffect(() => {
    fetchSlidevProject().then(r => setContent(r.content)).catch(e => setMessage(e.message))
  }, [])
  const save = async () => {
    setMessage('Speichert…')
    try { await saveSlidevProject(content); setMessage('Gespeichert. Slidev lädt die Präsentation automatisch neu.') }
    catch (e) { setMessage(e instanceof Error ? e.message : String(e)) }
  }
  const fullscreen = () => {
    const el = (window as unknown as { __slidevFrame?: HTMLIFrameElement }).__slidevFrame
    el?.requestFullscreen?.()
  }
  const openPresentation = async () => {
    setMode('presentation')
    setMessage('Sicherer Präsentationszugang wird vorbereitet…')
    try {
      const ticket = await fetchWorkspaceTicket('slidev')
      setEmbedUrl(`${new URL(publicUrl).origin}/workspace-login/slidev?ticket=${encodeURIComponent(ticket)}`)
      setMessage('')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e))
    }
  }
  return <div className="slidev-workspace">
    <div className="slidev-toolbar">
      <div className="segmented"><button className={mode === 'editor' ? 'active' : ''} onClick={() => setMode('editor')}>Markdown bearbeiten</button><button className={mode === 'presentation' ? 'active' : ''} onClick={openPresentation}>Präsentation</button></div>
      {mode === 'editor' ? <button className="primary-btn" onClick={save}><Save size={15} /> Speichern</button> : <><button className="secondary-btn" onClick={openPresentation}><RefreshCw size={15} /> Neu verbinden</button><button className="primary-btn" onClick={fullscreen}><Maximize2 size={15} /> Vollbild</button></>}
    </div>
    {message && <p className="slidev-message">{message}</p>}
    {mode === 'editor'
      ? <div data-color-mode={theme === 'dark' ? 'dark' : 'light'}><MDEditor value={content} onChange={v => setContent(v || '')} height={620} preview="live" /></div>
      : embedUrl ? <iframe ref={frame} className="slidev-frame" src={embedUrl} title="Slidev Präsentation" allow="fullscreen" /> : <div className="embedded-loading"><Loader2 className="spin" /> Verbindung wird vorbereitet…</div>}
  </div>
}

function HyperframesTab({ publicUrl }: { publicUrl: string }) {
  const [embedUrl, setEmbedUrl] = useState('')
  const [status, setStatus] = useState<{ available: boolean; version: string } | null>(null)
  const [error, setError] = useState('')
  const frameRef = useRef<HTMLIFrameElement>(null)
  const connect = useCallback(async () => {
    setError('')
    try {
      const [health, ticket] = await Promise.all([fetchHyperframesStatus(), fetchWorkspaceTicket('hyperframes')])
      setStatus(health)
      if (!health.available) throw new Error('Der HyperFrames-Renderer ist noch nicht erreichbar.')
      setEmbedUrl(`${new URL(publicUrl).origin}/workspace-login/hyperframes?ticket=${encodeURIComponent(ticket)}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [publicUrl])
  useEffect(() => { connect() }, [connect])
  return <div className="embedded-app-shell hyperframes-workspace">
    <div className="embedded-app-toolbar">
      <div><strong>HyperFrames Studio</strong><small>{status?.available ? `Renderer ${status.version} ist bereit` : 'Renderer wird geprüft…'}</small></div>
      <div className="workspace-actions"><button className="secondary-btn" onClick={connect}><RefreshCw size={15} /> Neu verbinden</button><button className="primary-btn" onClick={() => frameRef.current?.requestFullscreen?.()} disabled={!embedUrl}><Maximize2 size={15} /> Vollbild</button></div>
    </div>
    {error && <div className="wissen-error"><AlertTriangle size={14} /> {error}</div>}
    {embedUrl ? <iframe ref={frameRef} className="embedded-app-frame" src={embedUrl} title="HyperFrames Studio" allow="fullscreen; clipboard-read; clipboard-write" /> : !error && <div className="embedded-loading"><Loader2 className="spin" /> HyperFrames wird verbunden…</div>}
  </div>
}

export default function WissenView() {
  const { t } = useTheme()
  const [activeTab, setActiveTab] = useState<Tab>('navigation')
  const [floatingNote, setFloatingNote] = useState<string | null>(null)
  const [capabilities, setCapabilities] = useState<IntegrationCapabilities | null>(null)
  useEffect(() => { fetchIntegrationCapabilities().then(setCapabilities).catch(() => setCapabilities(null)) }, [])
  useEffect(() => {
    if (activeTab === 'research' && !capabilities?.open_notebook.configured) setActiveTab('navigation')
    if (activeTab === 'slidev' && !capabilities?.slidev.configured) setActiveTab('navigation')
    if (activeTab === 'hyperframes' && !capabilities?.hyperframes?.configured) setActiveTab('navigation')
  }, [activeTab, capabilities])

  const openNote = (path: string) => {
    // If on Navigation tab, switch to it - otherwise open floating editor
    if (activeTab === 'navigation') {
      // Can't directly control tree selection here; open floating editor
      setFloatingNote(path)
    } else {
      setFloatingNote(path)
    }
  }

  return (
    <section className="view wissen-view">
      <header className="view-header">
        <div className="view-title">
          <h2>{t('wissen.title')}</h2>
          <p className="view-sub">{t('wissen.sub')}</p>
        </div>
      </header>

      <div className="wissen-tabs">
        <button className={`tab-btn${activeTab === 'navigation' ? ' active' : ''}`} onClick={() => setActiveTab('navigation')}>
          <FolderOpen size={14} /> {t('wissen.navigation')}
        </button>
        <button className={`tab-btn${activeTab === 'search' ? ' active' : ''}`} onClick={() => setActiveTab('search')}>
          <Search size={14} /> {t('wissen.search')}
        </button>
        <button className={`tab-btn${activeTab === 'tags' ? ' active' : ''}`} onClick={() => setActiveTab('tags')}>
          <Tag size={14} /> {t('wissen.tags')}
        </button>
        <button className={`tab-btn${activeTab === 'recent' ? ' active' : ''}`} onClick={() => setActiveTab('recent')}>
          <Clock size={14} /> {t('wissen.recent')}
        </button>
        {capabilities?.open_notebook.configured && <button className={`tab-btn${activeTab === 'research' ? ' active' : ''}`} onClick={() => setActiveTab('research')}>
          <LibraryBig size={14} /> {t('wissen.research')}
        </button>}
        {capabilities?.slidev.configured && <button className={`tab-btn${activeTab === 'slidev' ? ' active' : ''}`} onClick={() => setActiveTab('slidev')}>
          <Presentation size={14} /> Präsentationen
        </button>}
        {capabilities?.hyperframes?.configured && <button className={`tab-btn${activeTab === 'hyperframes' ? ' active' : ''}`} onClick={() => setActiveTab('hyperframes')}>
          <Clapperboard size={14} /> HyperFrames
        </button>}
      </div>

      <div className="wissen-tab-content">
        {activeTab === 'search' && <SearchTab onOpenNote={openNote} />}
        {activeTab === 'navigation' && <NavigationTab />}
        {activeTab === 'tags' && <TagsTab onOpenNote={openNote} />}
        {activeTab === 'recent' && <RecentTab onOpenNote={openNote} />}
        {activeTab === 'research' && <ResearchNotebooksTab />}
        {activeTab === 'slidev' && <SlidevTab publicUrl={capabilities?.slidev.public_url || ''} />}
        {activeTab === 'hyperframes' && <HyperframesTab publicUrl={capabilities?.hyperframes.public_url || ''} />}
      </div>

      {floatingNote && (
        <FloatingEditor path={floatingNote} onClose={() => setFloatingNote(null)} />
      )}
    </section>
  )
}
