import { useState, useEffect, useCallback, useRef } from 'react'
import { useTheme } from '../ThemeContext'
import { Cable, Plus, Pencil, Trash2, Zap, X, Loader2, AlertCircle, Info, CheckCircle, XCircle, ShieldAlert, Server, Cloud, Building2 } from 'lucide-react'
import {
  AIConnection, AIConnectionInput, AITestResult,
  fetchAIConnections, createAIConnection, updateAIConnection,
  deleteAIConnection, testAIConnection,
} from '../api'

const PROVIDERS = [
  { value: 'ollama', kategorie: 'lokal' },
  { value: 'llama_cpp', kategorie: 'lokal' },
  { value: 'bedrock', kategorie: 'eigen' },
  { value: 'copilot', kategorie: 'cloud' },
  { value: 'openai', kategorie: 'cloud' },
  { value: 'claude', kategorie: 'cloud' },
  { value: 'gemini', kategorie: 'cloud' },
  { value: 'openrouter', kategorie: 'cloud' },
] as const

type ProviderKey = typeof PROVIDERS[number]['value']
type FilterKey = 'all' | 'lokal' | 'eigen' | 'cloud'

function emptyForm(): AIConnectionInput {
  return { name: '', provider: 'ollama', model_name: '', base_url: '', region: '', endpoint: '', secret_ref: '', aktiv: true }
}

function providerMonogram(provider: string): string {
  const map: Record<string, string> = {
    ollama: 'OL', llama_cpp: 'LC', bedrock: 'BR', copilot: 'CP', openai: 'OA', claude: 'CL', gemini: 'GE', openrouter: 'OR',
  }
  return map[provider] || provider.slice(0, 2).toUpperCase()
}

function CategoryIcon({ cat }: { cat: string }) {
  if (cat === 'lokal') return <Server size={14} />
  if (cat === 'eigen') return <Building2 size={14} />
  return <Cloud size={14} />
}

export default function KIVerbindungView() {
  const { t } = useTheme()
  const [connections, setConnections] = useState<AIConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<number | null>(null)
  const [form, setForm] = useState<AIConnectionInput>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [testResults, setTestResults] = useState<Record<number, AITestResult>>({})
  const [testing, setTesting] = useState<number | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [filter, setFilter] = useState<FilterKey>('all')
  const modalRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const data = await fetchAIConnections()
      setConnections(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Close modal on Escape
  useEffect(() => {
    if (editing === null) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') cancelEdit() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [editing])

  const startEdit = (conn: AIConnection) => {
    setEditing(conn.id)
    setForm({
      name: conn.name,
      provider: conn.provider,
      model_name: conn.model_name || '',
      base_url: conn.base_url || '',
      region: conn.region || '',
      endpoint: conn.endpoint || '',
      secret_ref: '',
      aktiv: conn.aktiv === 1,
    })
    setFormError('')
  }

  const startNew = () => {
    setEditing(0)
    setForm(emptyForm())
    setFormError('')
  }

  const cancelEdit = () => {
    setEditing(null)
    setFormError('')
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError(t('ai.validation.nameRequired')); return }
    setSaving(true)
    setFormError('')
    try {
      const payload: AIConnectionInput = { ...form }
      if (!payload.secret_ref) delete payload.secret_ref
      if (editing === 0) {
        await createAIConnection(payload)
      } else if (editing) {
        await updateAIConnection(editing, payload)
      }
      setEditing(null)
      await load()
    } catch (e: any) {
      setFormError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteAIConnection(id)
      setDeleteConfirm(null)
      await load()
    } catch (e: any) {
      setError(e.message)
    }
  }

  const handleTest = async (id: number) => {
    setTesting(id)
    try {
      const result = await testAIConnection(id)
      setTestResults(prev => ({ ...prev, [id]: result }))
    } catch (e: any) {
      setTestResults(prev => ({ ...prev, [id]: { status: 'error', message: e.message } }))
    } finally {
      setTesting(null)
    }
  }

  const providerLabel = (p: string) => t(`ai.provider.${p}`) || p
  const catLabel = (c: string) => t(`ai.cat.${c}`) || c

  const selectedProvider = form.provider as ProviderKey
  const needsBaseUrl = selectedProvider === 'ollama' || selectedProvider === 'llama_cpp'
  const needsRegion = selectedProvider === 'bedrock'
  const needsModel = ['copilot', 'openai', 'claude', 'gemini', 'openrouter', 'bedrock'].includes(selectedProvider)
  const needsSecret = ['bedrock', 'copilot', 'openai', 'claude', 'gemini', 'openrouter'].includes(selectedProvider)

  // KPI data
  const totalCount = connections.length
  const activeCount = connections.filter(c => c.aktiv === 1).length
  const secretCount = connections.filter(c => c.secret_configured).length

  // Filter
  const filtered = filter === 'all' ? connections : connections.filter(c => c.kategorie === filter)
  const countFor = (f: FilterKey) => f === 'all' ? totalCount : connections.filter(c => c.kategorie === f).length

  // Test result helper
  const testStatusIcon = (result: AITestResult) => {
    if (result.status === 'ok' || result.status === 'configured') return <CheckCircle size={14} className="text-success" />
    if (result.status === 'unsupported') return <ShieldAlert size={14} className="text-warning" />
    return <XCircle size={14} className="text-error" />
  }

  // Modal overlay for editing
  const renderModal = () => {
    if (editing === null) return null
    return (
      <div className="bento-modal-overlay" onClick={e => { if (e.target === e.currentTarget) cancelEdit() }} role="dialog" aria-modal="true" aria-label={editing === 0 ? t('ai.add') : t('ai.edit')}>
        <div className="bento-modal" ref={modalRef}>
          <header className="bento-modal-header">
            <h2>{editing === 0 ? t('ai.add') : t('ai.edit')}</h2>
            <button className="btn btn-icon" onClick={cancelEdit} aria-label={t('ai.cancel')}><X size={18} /></button>
          </header>

          {formError && <div className="alert alert-error"><AlertCircle size={16} /> {formError}</div>}

          <div className="bento-modal-body">
            <div className="form-group">
              <label>{t('ai.provider')}</label>
              <select value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value, kategorie: PROVIDERS.find(p => p.value === e.target.value)?.kategorie })}>
                <optgroup label={t('ai.cat.lokal')}>
                  <option value="ollama">Ollama</option>
                  <option value="llama_cpp">llama.cpp</option>
                </optgroup>
                <optgroup label={t('ai.cat.eigen')}>
                  <option value="bedrock">Amazon Bedrock</option>
                </optgroup>
                <optgroup label={t('ai.cat.cloud')}>
                  <option value="copilot">Copilot</option>
                  <option value="openai">OpenAI</option>
                  <option value="claude">Claude</option>
                  <option value="gemini">Gemini</option>
                  <option value="openrouter">OpenRouter</option>
                </optgroup>
              </select>
            </div>

            <div className="form-group">
              <label>{t('ai.name')} *</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={providerLabel(form.provider)} autoFocus />
            </div>

            {needsBaseUrl && (
              <div className="form-group">
                <label>{t('ai.baseUrl')}</label>
                <input type="url" value={form.base_url || ''} onChange={e => setForm({ ...form, base_url: e.target.value })} placeholder="http://localhost:11434" />
              </div>
            )}

            {needsRegion && (
              <div className="form-group">
                <label>{t('ai.region')}</label>
                <input type="text" value={form.region || ''} onChange={e => setForm({ ...form, region: e.target.value })} placeholder="us-east-1" />
              </div>
            )}

            {needsModel && (
              <div className="form-group">
                <label>{t('ai.model')}</label>
                <input type="text" value={form.model_name || ''} onChange={e => setForm({ ...form, model_name: e.target.value })} placeholder={selectedProvider === 'claude' ? 'claude-sonnet-4-20250514' : 'model-id'} />
              </div>
            )}

            <div className="form-group">
              <label>{t('ai.endpoint')} (optional)</label>
              <input type="url" value={form.endpoint || ''} onChange={e => setForm({ ...form, endpoint: e.target.value })} placeholder="https://..." />
            </div>

            {needsSecret && (
              <div className="form-group">
                <label>{t('ai.secretRef')}</label>
                <input type="text" value={form.secret_ref || ''} onChange={e => setForm({ ...form, secret_ref: e.target.value })} placeholder="MY_API_KEY" />
                <small className="form-hint">{t('ai.secretHint')}</small>
              </div>
            )}

            <div className="form-group">
              <label className="toggle-label">
                <input type="checkbox" checked={form.aktiv !== false} onChange={e => setForm({ ...form, aktiv: e.target.checked })} />
                <span>{form.aktiv !== false ? t('ai.active') : t('ai.inactive')}</span>
              </label>
            </div>
          </div>

          <footer className="bento-modal-footer">
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 size={16} className="spin" /> {t('ai.save')}</> : t('ai.save')}
            </button>
            <button className="btn btn-ghost" onClick={cancelEdit}>{t('ai.cancel')}</button>
          </footer>

          <div className="bento-modal-hint">
            <Info size={14} /> <small>{t('ai.hermesBoundary')}</small>
          </div>
        </div>
      </div>
    )
  }

  return (
    <section className="view bento-ai">
      {/* Page header – matches .view-header pattern */}
      <header className="view-header">
        <div className="view-title">
          <h2><Cable size={18} style={{verticalAlign:'middle',marginRight:6}} />{t('ai.title')}</h2>
          <p className="view-sub">{t('ai.subtitle')}</p>
        </div>
        <div className="view-header-controls">
          <button className="btn btn-primary" onClick={startNew}>
            <Plus size={16} /> {t('ai.add')}
          </button>
        </div>
      </header>

      {/* Scrollable body */}
      <div className="bento-ai-body">

      {error && <div className="alert alert-error"><AlertCircle size={16} /> {error}</div>}

      {/* KPI Tiles */}
      <div className="bento-kpis">
        <div className="bento-kpi">
          <span className="bento-kpi-value">{totalCount}</span>
          <span className="bento-kpi-label">{t('ai.kpi.total')}</span>
        </div>
        <div className="bento-kpi">
          <span className="bento-kpi-value">{activeCount}</span>
          <span className="bento-kpi-label">{t('ai.kpi.active')}</span>
        </div>
        <div className="bento-kpi">
          <span className="bento-kpi-value">{secretCount}</span>
          <span className="bento-kpi-label">{t('ai.kpi.secrets')}</span>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="bento-filters" role="tablist" aria-label={t('ai.filterLabel')}>
        {(['all', 'lokal', 'eigen', 'cloud'] as FilterKey[]).map(f => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            className={`bento-chip ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f !== 'all' && <CategoryIcon cat={f} />}
            {f === 'all' ? t('ai.filter.all') : catLabel(f)}
            <span className="bento-chip-count">{countFor(f)}</span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="loading-state"><Loader2 size={24} className="spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Cable size={48} strokeWidth={1} />
          <p>{t('ai.empty')}</p>
          <small>{t('ai.emptyHint')}</small>
        </div>
      ) : (
        <div className="bento-grid">
          {filtered.map(conn => {
            const result = testResults[conn.id]
            return (
              <div key={conn.id} className={`bento-card ${conn.aktiv ? '' : 'bento-card--inactive'}`}>
                <div className="bento-card-top">
                  <div className="bento-card-monogram" aria-hidden="true">{providerMonogram(conn.provider)}</div>
                  <div className="bento-card-meta">
                    <strong className="bento-card-name">{conn.name}</strong>
                    <span className="bento-card-provider">
                      <CategoryIcon cat={conn.kategorie} />
                      {providerLabel(conn.provider)}
                    </span>
                  </div>
                  <span className={`badge ${conn.aktiv ? 'badge-success' : 'badge-muted'}`}>
                    {conn.aktiv ? t('ai.active') : t('ai.inactive')}
                  </span>
                </div>

                <div className="bento-card-details">
                  {conn.model_name && <span className="bento-detail">{t('ai.model')}: {conn.model_name}</span>}
                  {conn.base_url && <span className="bento-detail mono">{conn.base_url}</span>}
                  {conn.region && <span className="bento-detail">{conn.region}</span>}
                  {conn.endpoint && <span className="bento-detail mono">{conn.endpoint}</span>}
                  <span className="bento-detail">
                    {conn.secret_configured
                      ? <><CheckCircle size={12} className="text-success" /> {t('ai.secretConfigured')}</>
                      : <><XCircle size={12} className="text-error" /> {t('ai.secretMissing')}</>
                    }
                  </span>
                </div>

                {/* Test result inline */}
                {result && (
                  <div className={`bento-test-result bento-test-result--${result.status === 'ok' || result.status === 'configured' ? 'success' : result.status === 'unsupported' ? 'info' : 'error'}`}>
                    {testStatusIcon(result)}
                    <small>{result.message}</small>
                    <button className="btn btn-icon" onClick={() => setTestResults(prev => { const n = { ...prev }; delete n[conn.id]; return n })} aria-label={t('ai.dismissTest')}>
                      <X size={12} />
                    </button>
                  </div>
                )}

                <div className="bento-card-actions">
                  <button className="btn btn-sm btn-ghost" onClick={() => handleTest(conn.id)} disabled={testing === conn.id} aria-label={t('ai.test')}>
                    {testing === conn.id ? <Loader2 size={14} className="spin" /> : <Zap size={14} />}
                    {t('ai.test')}
                  </button>
                  <button className="btn btn-sm btn-ghost" onClick={() => startEdit(conn)} aria-label={t('ai.edit')}>
                    <Pencil size={14} /> {t('ai.edit')}
                  </button>
                  {deleteConfirm === conn.id ? (
                    <span className="delete-confirm">
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(conn.id)}>{t('ai.delete')}</button>
                      <button className="btn btn-sm btn-ghost" onClick={() => setDeleteConfirm(null)} aria-label={t('ai.cancel')}><X size={14} /></button>
                    </span>
                  ) : (
                    <button className="btn btn-sm btn-ghost danger" onClick={() => setDeleteConfirm(conn.id)} aria-label={t('ai.delete')}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="bento-footer-hint">
        <Info size={14} /> <small>{t('ai.hermesBoundary')}</small>
      </div>

      {renderModal()}
      </div>{/* end bento-ai-body */}
    </section>
  )
}
