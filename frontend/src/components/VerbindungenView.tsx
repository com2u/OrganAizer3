import { useEffect, useState, useRef } from 'react'
import {
  FileText,
  Calendar,
  Mail,
  Users,
  CheckSquare,
  CalendarCheck,
  FileEdit,
  Share2,
  Contact,
  ListChecks,
  HardDrive,
  Ticket,
  BookMarked,
  Workflow,
  LibraryBig,
  Presentation,
  Clapperboard,
  PenTool,
  Cpu,
  Building2,
  Fingerprint,
  Plus,
  Trash2,
  X,
  Plug,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Settings,
  Eye,
  Code,
} from 'lucide-react'
import { 
  fetchVerbindungen, 
  createVerbindung, 
  deleteVerbindung, 
  Verbindung,
  fetchN8nConfig,
  updateN8nConfig,
  testN8nConnection,
  fetchN8nWorkflows,
  N8nConfig,
  N8nConfigInput,
  N8nWorkflow,
  fetchIntegrationConfig,
  saveIntegrationConfig,
  IntegrationKey,
  fetchHyperframesStatus,
  fetchExcalidrawStatus,
} from '../api'
import { useTheme } from '../ThemeContext'

// ─── Template definitions ───────────────────────────────────────────────────

interface TemplateDef {
  key: string
  labelKey: string
  descKey: string
  icon: typeof Plug
  /** Visual weight for bento grid: 'normal' | 'wide' */
  weight?: 'normal' | 'wide'
}

const TEMPLATES: TemplateDef[] = [
  { key: 'office',            labelKey: 'vb.tpl.office',            descKey: 'vb.tpl.office.desc',            icon: FileText,    weight: 'wide' },
  { key: 'outlook_kalender',  labelKey: 'vb.tpl.outlook_kalender',  descKey: 'vb.tpl.outlook_kalender.desc',  icon: Calendar },
  { key: 'outlook_mail',      labelKey: 'vb.tpl.outlook_mail',      descKey: 'vb.tpl.outlook_mail.desc',      icon: Mail },
  { key: 'outlook_kontakte',  labelKey: 'vb.tpl.outlook_kontakte',  descKey: 'vb.tpl.outlook_kontakte.desc',  icon: Users },
  { key: 'outlook_aufgaben',  labelKey: 'vb.tpl.outlook_aufgaben',  descKey: 'vb.tpl.outlook_aufgaben.desc',  icon: CheckSquare },
  { key: 'google_kalender',   labelKey: 'vb.tpl.google_kalender',   descKey: 'vb.tpl.google_kalender.desc',   icon: CalendarCheck },
  { key: 'onenote',           labelKey: 'vb.tpl.onenote',           descKey: 'vb.tpl.onenote.desc',           icon: FileEdit },
  { key: 'sharepoint',        labelKey: 'vb.tpl.sharepoint',        descKey: 'vb.tpl.sharepoint.desc',        icon: Share2 },
  { key: 'google_mail',       labelKey: 'vb.tpl.google_mail',       descKey: 'vb.tpl.google_mail.desc',       icon: Mail },
  { key: 'google_kontakte',   labelKey: 'vb.tpl.google_kontakte',   descKey: 'vb.tpl.google_kontakte.desc',   icon: Contact },
  { key: 'google_aufgaben',   labelKey: 'vb.tpl.google_aufgaben',   descKey: 'vb.tpl.google_aufgaben.desc',   icon: ListChecks },
  { key: 'onedrive',          labelKey: 'vb.tpl.onedrive',          descKey: 'vb.tpl.onedrive.desc',          icon: HardDrive },
  { key: 'jira',              labelKey: 'vb.tpl.jira',              descKey: 'vb.tpl.jira.desc',              icon: Ticket },
  { key: 'confluence',        labelKey: 'vb.tpl.confluence',        descKey: 'vb.tpl.confluence.desc',        icon: BookMarked },
  { key: 'sap',               labelKey: 'vb.tpl.sap',               descKey: 'vb.tpl.sap.desc',               icon: Building2 },
  { key: 'interflex',         labelKey: 'vb.tpl.interflex',         descKey: 'vb.tpl.interflex.desc',         icon: Fingerprint,  weight: 'wide' },
  { key: 'n8n',               labelKey: 'vb.tpl.n8n',              descKey: 'vb.tpl.n8n.desc',               icon: Workflow,    weight: 'wide' },
  { key: 'open_notebook',     labelKey: 'vb.tpl.openNotebook',     descKey: 'vb.tpl.openNotebook.desc',      icon: LibraryBig,  weight: 'wide' },
  { key: 'slidev',            labelKey: 'vb.tpl.slidev',           descKey: 'vb.tpl.slidev.desc',            icon: Presentation, weight: 'wide' },
  { key: 'hyperframes',       labelKey: 'vb.tpl.hyperframes',      descKey: 'vb.tpl.hyperframes.desc',       icon: Clapperboard, weight: 'wide' },
  { key: 'excalidraw',        labelKey: 'vb.tpl.excalidraw',       descKey: 'vb.tpl.excalidraw.desc',        icon: PenTool,      weight: 'wide' },
  { key: 'mcp',               labelKey: 'vb.tpl.mcp',              descKey: 'vb.tpl.mcp.desc',               icon: Cpu },
]

// ─── Component ───────────────────────────────────────────────────────────────

type N8nTab = 'editor' | 'settings' | 'workflows'

export default function VerbindungenView() {
  const { t } = useTheme()

  // Connections list
  const [connections, setConnections] = useState<Verbindung[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Add dialog
  const [dialogTemplate, setDialogTemplate] = useState<TemplateDef | null>(null)
  const [dialogName, setDialogName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  // n8n detail panel state
  const [selectedN8nConnection, setSelectedN8nConnection] = useState<Verbindung | null>(null)
  const [n8nConfig, setN8nConfig] = useState<N8nConfig | null>(null)
  const [n8nLoading, setN8nLoading] = useState(false)
  const [n8nError, setN8nError] = useState<string | null>(null)
  const [n8nTab, setN8nTab] = useState<N8nTab>('editor')

  // n8n Settings form
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [aktiv, setAktiv] = useState(true)
  const [n8nSaving, setN8nSaving] = useState(false)
  const [n8nSaveError, setN8nSaveError] = useState<string | null>(null)
  const [n8nSaveOk, setN8nSaveOk] = useState(false)

  // n8n Test
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ status: string; message: string } | null>(null)

  // n8n Workflows
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([])
  const [wfLoading, setWfLoading] = useState(false)
  const [wfError, setWfError] = useState<string | null>(null)

  // n8n iframe load state
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [integrationKey, setIntegrationKey] = useState<IntegrationKey | null>(null)
  const [integrationForm, setIntegrationForm] = useState<Record<string, string | boolean>>({})
  const [integrationSaving, setIntegrationSaving] = useState(false)
  const [integrationTest, setIntegrationTest] = useState<string>('')
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    fetchVerbindungen()
      .then(setConnections)
      .catch(e => setError(e.message ?? t('vb.error.load')))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openIntegrationConfig = async (key: IntegrationKey) => {
    setIntegrationKey(key)
    setIntegrationTest('')
    setSaveError(null)
    try {
      const cfg = await fetchIntegrationConfig(key)
      setIntegrationForm({
        enabled: cfg.enabled ?? true,
        public_url: String(cfg.public_url || (key === 'slidev' ? 'https://open-notebook.ai-server.org/slidev/' : key === 'hyperframes' ? 'https://hyperframes.ai-server.org' : key === 'excalidraw' ? 'https://excalidraw.ai-server.org' : 'https://open-notebook.ai-server.org')),
        api_url: String(cfg.api_url || 'http://open-notebook:5055'),
        renderer_url: String(cfg.renderer_url || 'http://hyperframes:3002'),
        app_url: String(cfg.app_url || 'http://excalidraw:80'),
        project_name: String(cfg.project_name || (key === 'hyperframes' ? 'default' : 'OrganAIzer Präsentation')),
      })
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e))
    }
  }

  const saveLocalIntegration = async () => {
    if (!integrationKey) return
    setIntegrationSaving(true)
    setSaveError(null)
    try {
      await saveIntegrationConfig(integrationKey, integrationForm)
      if (integrationKey === 'hyperframes') {
        const health = await fetchHyperframesStatus()
        setIntegrationTest(health.available ? `Renderer ${health.version} ist erreichbar.` : 'Konfiguration gespeichert, Renderer ist noch nicht erreichbar.')
      } else if (integrationKey === 'excalidraw') {
        const health = await fetchExcalidrawStatus()
        setIntegrationTest(health.available ? 'Excalidraw ist erreichbar und einsatzbereit.' : 'Konfiguration gespeichert, Excalidraw ist noch nicht erreichbar.')
      } else {
        setIntegrationKey(null)
      }
      load()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e))
    } finally {
      setIntegrationSaving(false)
    }
  }

  // n8n: Load config when an n8n connection is selected
  const loadN8nConfig = () => {
    setN8nLoading(true)
    setN8nError(null)
    fetchN8nConfig()
      .then(cfg => {
        setN8nConfig(cfg)
        setBaseUrl(cfg.base_url)
        setWebhookUrl(cfg.webhook_url || '')
        setAktiv(!!cfg.aktiv)
      })
      .catch((e: unknown) => setN8nError(e instanceof Error ? e.message : 'Failed to load n8n config'))
      .finally(() => setN8nLoading(false))
  }

  useEffect(() => {
    if (selectedN8nConnection) {
      loadN8nConfig()
      setIframeLoaded(false)
    }
  }, [selectedN8nConnection])

  // n8n: Save settings
  const handleN8nSave = async () => {
    setN8nSaving(true)
    setN8nSaveError(null)
    setN8nSaveOk(false)
    try {
      const input: N8nConfigInput = {
        base_url: baseUrl,
        webhook_url: webhookUrl || undefined,
        aktiv,
      }
      if (apiKey.trim()) {
        input.api_key = apiKey.trim()
      }
      const cfg = await updateN8nConfig(input)
      setN8nConfig(cfg)
      setApiKey('')
      setN8nSaveOk(true)
      setTimeout(() => setN8nSaveOk(false), 3000)
    } catch (e: unknown) {
      setN8nSaveError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setN8nSaving(false)
    }
  }

  // n8n: Test connection
  const handleN8nTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await testN8nConnection()
      setTestResult(result)
    } catch (e: unknown) {
      setTestResult({ status: 'error', message: e instanceof Error ? e.message : 'Test failed' })
    } finally {
      setTesting(false)
    }
  }

  // n8n: Load workflows
  const loadN8nWorkflows = () => {
    setWfLoading(true)
    setWfError(null)
    fetchN8nWorkflows()
      .then(data => setWorkflows(data.workflows))
      .catch((e: unknown) => setWfError(e instanceof Error ? e.message : 'Failed to load workflows'))
      .finally(() => setWfLoading(false))
  }

  useEffect(() => {
    if (n8nTab === 'workflows' && selectedN8nConnection) loadN8nWorkflows()
  }, [n8nTab, selectedN8nConnection])

  // Open add dialog for a template
  const openAdd = (tpl: TemplateDef) => {
    setDialogTemplate(tpl)
    setDialogName(t(tpl.labelKey))
    setSaveError(null)
  }

  const closeDialog = () => {
    setDialogTemplate(null)
    setDialogName('')
    setSaveError(null)
  }

  const handleSave = async () => {
    if (!dialogTemplate) return
    const name = dialogName.trim()
    if (!name) { setSaveError(t('vb.error.nameRequired')); return }
    setSaving(true)
    setSaveError(null)
    try {
      await createVerbindung({ template_key: dialogTemplate.key, name })
      closeDialog()
      load()
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : t('vb.error.save'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    setDeleting(true)
    try {
      await deleteVerbindung(id)
      setDeleteConfirm(null)
      load()
    } catch {
      // silently reload
      load()
    } finally {
      setDeleting(false)
    }
  }

  // Format date display
  const fmtDate = (iso?: string | null) => {
    if (!iso) return '–'
    try { return new Date(iso).toLocaleDateString() } catch { return iso }
  }

  return (
    <section className="view verbindungen-view">
      {/* Page header – matches .view-header pattern used by Ressourcen, Wissen, etc. */}
      <header className="view-header">
        <div className="view-title">
          <h2>{t('vb.title')}</h2>
          <p className="view-sub">{t('vb.sub')}</p>
        </div>
        <div className="view-header-controls">
          <button type="button" className="btn btn-primary" onClick={() => openAdd(TEMPLATES[0])}>
            <Plus size={16} /> {t('vb.add')}
          </button>
        </div>
      </header>

      {/* Scrollable body with split layout when n8n is selected */}
      <div className={`verbindungen-body${selectedN8nConnection ? ' verbindungen-split' : ''}`}>
        
        {/* Left column: Templates and connections list */}
        <div className="verbindungen-main">{/* Template grid */}
      <section className="vb-section" aria-label={t('vb.templates.label')}>
        <h2 className="vb-section-title">{t('vb.templates.title')}</h2>
        <div className="vb-template-grid">
          {TEMPLATES.map(tpl => {
            const Icon = tpl.icon
            return (
              <div
                key={tpl.key}
                className={`vb-template-card${tpl.weight === 'wide' ? ' vb-template-card--wide' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => openAdd(tpl)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAdd(tpl) } }}
                aria-label={`${t('vb.add')} ${t(tpl.labelKey)}`}
              >
                <div className="vb-template-icon" aria-hidden="true">
                  <Icon size={24} />
                </div>
                <div className="vb-template-body">
                  <span className="vb-template-name">{t(tpl.labelKey)}</span>
                  <span className="vb-template-desc">{t(tpl.descKey)}</span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Added connections */}
      <section className="vb-section" aria-label={t('vb.connections.label')}>
        <h2 className="vb-section-title">{t('vb.connections.title')}</h2>

        {loading && (
          <p className="vb-state-msg">{t('loading')}</p>
        )}
        {error && (
          <div className="vb-error" role="alert">
            <span>{error}</span>
            <button type="button" className="icon-btn" onClick={load}>{t('vb.retry')}</button>
          </div>
        )}
        {!loading && !error && connections.length === 0 && (
          <div className="vb-empty">
            <Plug size={32} className="vb-empty-icon" aria-hidden="true" />
            <p className="vb-empty-title">{t('vb.empty.title')}</p>
            <p className="vb-empty-hint">{t('vb.empty.hint')}</p>
          </div>
        )}
        {!loading && connections.length > 0 && (
          <div className="vb-connections-grid">
            {connections.map(conn => {
              const tpl = TEMPLATES.find(t => t.key === conn.template_key)
              const Icon = tpl?.icon ?? Plug
              const isN8n = conn.template_key === 'n8n'
              const isLocalIntegration = conn.template_key === 'open_notebook' || conn.template_key === 'slidev' || conn.template_key === 'hyperframes' || conn.template_key === 'excalidraw'
              const isSelected = selectedN8nConnection?.id === conn.id
              return (
                <div 
                  key={conn.id} 
                  className={`vb-conn-card${isSelected ? ' vb-conn-card--selected' : ''}`}
                >
                  <div className="vb-conn-icon" aria-hidden="true">
                    <Icon size={20} />
                  </div>
                  <div className="vb-conn-body">
                    <span className="vb-conn-name">{conn.name}</span>
                    <span className="vb-conn-template">{tpl ? t(tpl.labelKey) : conn.template_key}</span>
                    <span className="vb-conn-date">{fmtDate(conn.erstellt_am)}</span>
                  </div>
                  <span className="vb-conn-status vb-status--prepared">{
                    isN8n ? t('n8n.status.active') : t('vb.status.prepared')
                  }</span>
                  {isN8n && (
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => setSelectedN8nConnection(conn)}
                      title={t('n8n.tab.editor')}
                    >
                      <Workflow size={14} /> {t('n8n.tab.editor')}
                    </button>
                  )}
                  {isLocalIntegration && (
                    <button type="button" className="btn btn-sm btn-primary" onClick={() => openIntegrationConfig(conn.template_key as IntegrationKey)}>
                      <Settings size={14} /> Konfigurieren
                    </button>
                  )}
                  {deleteConfirm === conn.id ? (
                    <div className="vb-delete-confirm">
                      <span>{t('vb.deleteConfirm')}</span>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(conn.id)}
                        disabled={deleting}
                        aria-label={t('vb.deleteConfirm')}
                      >
                        {deleting ? '…' : t('vb.delete')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => setDeleteConfirm(null)}
                        aria-label={t('vb.cancel')}
                      >
                        {t('vb.cancel')}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="icon-btn danger"
                      onClick={() => setDeleteConfirm(conn.id)}
                      aria-label={`${t('vb.delete')} ${conn.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
        </div>

        {/* Right column: n8n detail panel (when selected) */}
        {selectedN8nConnection && (
          <div className="verbindungen-detail">
            <div className="vb-detail-header">
              <div className="vb-detail-title">
                <Workflow size={20} />
                <h3>n8n</h3>
              </div>
              <div className="vb-detail-controls">
                <a
                  href={n8nConfig?.base_url || 'http://localhost:5678'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm"
                  title={t('n8n.openExternal')}
                >
                  <ExternalLink size={14} /> {t('n8n.openExternal')}
                </a>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setSelectedN8nConnection(null)}
                  aria-label={t('vb.cancel')}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {n8nLoading && (
              <div className="n8n-loading">
                <Loader2 size={24} className="spin" />
                <span>{t('loading')}</span>
              </div>
            )}

            {n8nError && (
              <div className="n8n-error-banner">
                <AlertCircle size={20} />
                <span>{n8nError}</span>
                <button className="btn btn-sm" onClick={loadN8nConfig}>{t('vb.retry')}</button>
              </div>
            )}

            {!n8nLoading && !n8nError && n8nConfig && (
              <>
                {/* Status badges */}
                <div className="n8n-status-row">
                  {n8nConfig.aktiv ? (
                    <span className="n8n-badge n8n-badge--ok">
                      <CheckCircle2 size={14} /> {t('n8n.status.active')}
                    </span>
                  ) : (
                    <span className="n8n-badge n8n-badge--inactive">
                      <AlertCircle size={14} /> {t('n8n.status.inactive')}
                    </span>
                  )}
                  {n8nConfig.api_key_configured && (
                    <span className="n8n-badge n8n-badge--ok">
                      <CheckCircle2 size={14} /> API Key
                    </span>
                  )}
                  <span className="n8n-badge n8n-badge--info">{n8nConfig.base_url}</span>
                </div>

                {/* Tabs */}
                <div className="n8n-tabs">
                  <button
                    className={`n8n-tab${n8nTab === 'editor' ? ' active' : ''}`}
                    onClick={() => setN8nTab('editor')}
                  >
                    <Eye size={15} /> {t('n8n.tab.editor')}
                  </button>
                  <button
                    className={`n8n-tab${n8nTab === 'workflows' ? ' active' : ''}`}
                    onClick={() => setN8nTab('workflows')}
                  >
                    <Code size={15} /> {t('n8n.tab.workflows')}
                  </button>
                  <button
                    className={`n8n-tab${n8nTab === 'settings' ? ' active' : ''}`}
                    onClick={() => setN8nTab('settings')}
                  >
                    <Settings size={15} /> {t('n8n.tab.settings')}
                  </button>
                </div>

                {/* Tab content */}
                <div className="n8n-tab-content">
                  {n8nTab === 'editor' && (
                    <div className="n8n-iframe-wrapper">
                      {!iframeLoaded && (
                        <div className="n8n-iframe-loading">
                          <Loader2 size={24} className="spin" />
                          <span>n8n wird geladen...</span>
                        </div>
                      )}
                      <iframe
                        ref={iframeRef}
                        src={n8nConfig.base_url}
                        title="n8n Editor"
                        className="n8n-iframe"
                        onLoad={() => setIframeLoaded(true)}
                        allow="clipboard-read; clipboard-write; fullscreen"
                      />
                    </div>
                  )}

                  {n8nTab === 'workflows' && (
                    <div className="n8n-workflows">
                      <div className="n8n-workflows-header">
                        <h3>{t('n8n.workflows.title')}</h3>
                        <button className="btn btn-sm" onClick={loadN8nWorkflows} disabled={wfLoading}>
                          {wfLoading ? <Loader2 size={14} className="spin" /> : null}
                          {t('n8n.workflows.refresh')}
                        </button>
                      </div>
                      {wfError && (
                        <div className="n8n-error-banner">
                          <AlertCircle size={18} />
                          <span>{wfError}</span>
                        </div>
                      )}
                      {!wfLoading && !wfError && workflows.length === 0 && (
                        <div className="n8n-empty">
                          <Workflow size={32} className="vb-empty-icon" />
                          <p>{t('n8n.workflows.empty')}</p>
                        </div>
                      )}
                      {workflows.length > 0 && (
                        <div className="n8n-wf-list">
                          {workflows.map(wf => (
                            <div key={wf.id} className="n8n-wf-card">
                              <div className="n8n-wf-icon">
                                <Workflow size={18} />
                              </div>
                              <div className="n8n-wf-body">
                                <span className="n8n-wf-name">{wf.name}</span>
                                <span className="n8n-wf-id">ID: {wf.id}</span>
                              </div>
                              <span className={`n8n-wf-status ${wf.active ? 'active' : 'inactive'}`}>
                                {wf.active ? t('n8n.wf.active') : t('n8n.wf.inactive')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {n8nTab === 'settings' && (
                    <div className="n8n-settings">
                      <div className="n8n-settings-section">
                        <h3>{t('n8n.settings.title')}</h3>

                        <div className="form-group">
                          <label className="form-label" htmlFor="n8n-base-url">
                            {t('n8n.settings.baseUrl')}
                          </label>
                          <input
                            id="n8n-base-url"
                            type="text"
                            className="form-input"
                            value={baseUrl}
                            onChange={e => setBaseUrl(e.target.value)}
                            placeholder="http://localhost:5678"
                          />
                          <p className="form-hint">{t('n8n.settings.baseUrlHint')}</p>
                        </div>

                        <div className="form-group">
                          <label className="form-label" htmlFor="n8n-api-key">
                            {t('n8n.settings.apiKey')}
                          </label>
                          <input
                            id="n8n-api-key"
                            type="password"
                            className="form-input"
                            value={apiKey}
                            onChange={e => setApiKey(e.target.value)}
                            placeholder={n8nConfig.api_key_configured ? '•••••••• (gespeichert)' : t('n8n.settings.apiKeyPlaceholder')}
                          />
                          <p className="form-hint">{t('n8n.settings.apiKeyHint')}</p>
                        </div>

                        <div className="form-group">
                          <label className="form-label" htmlFor="n8n-webhook-url">
                            {t('n8n.settings.webhookUrl')}
                          </label>
                          <input
                            id="n8n-webhook-url"
                            type="text"
                            className="form-input"
                            value={webhookUrl}
                            onChange={e => setWebhookUrl(e.target.value)}
                            placeholder="http://localhost:5678/webhook/..."
                          />
                        </div>

                        <div className="form-group">
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={aktiv}
                              onChange={e => setAktiv(e.target.checked)}
                            />
                            {t('n8n.settings.aktiv')}
                          </label>
                        </div>

                        <div className="n8n-settings-actions">
                          <button
                            className="btn btn-primary"
                            onClick={handleN8nSave}
                            disabled={n8nSaving}
                          >
                            {n8nSaving ? <Loader2 size={15} className="spin" /> : null}
                            {t('n8n.settings.save')}
                          </button>
                          <button
                            className="btn"
                            onClick={handleN8nTest}
                            disabled={testing}
                          >
                            {testing ? <Loader2 size={15} className="spin" /> : null}
                            {t('n8n.settings.test')}
                          </button>
                          {n8nSaveOk && (
                            <span className="n8n-save-ok">
                              <CheckCircle2 size={16} /> {t('n8n.settings.saved')}
                            </span>
                          )}
                          {n8nSaveError && (
                            <span className="n8n-save-error">
                              <AlertCircle size={16} /> {n8nSaveError}
                            </span>
                          )}
                        </div>

                        {testResult && (
                          <div className={`n8n-test-result n8n-test-result--${testResult.status}`}>
                            {testResult.status === 'ok' ? (
                              <CheckCircle2 size={18} />
                            ) : (
                              <AlertCircle size={18} />
                            )}
                            <span>{testResult.message}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

      {/* Add dialog */}
      {dialogTemplate && (
        <div
          className="bento-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={t('vb.dialog.title')}
          onKeyDown={e => { if (e.key === 'Escape') closeDialog() }}
        >
          <div className="bento-modal">
            <div className="bento-modal-header">
              <h3>{t('vb.dialog.title')}</h3>
              <button
                type="button"
                className="icon-btn"
                onClick={closeDialog}
                aria-label={t('vb.cancel')}
              >
                <X size={16} />
              </button>
            </div>
            <div className="bento-modal-body">
              <label className="form-label" htmlFor="vb-dialog-template">
                {t('vb.dialog.templateLabel')}
              </label>
              <select
                id="vb-dialog-template"
                className="form-input"
                value={dialogTemplate.key}
                onChange={e => {
                  const selected = TEMPLATES.find(template => template.key === e.target.value)
                  if (selected) {
                    setDialogTemplate(selected)
                    setDialogName(t(selected.labelKey))
                  }
                }}
              >
                {TEMPLATES.map(template => (
                  <option key={template.key} value={template.key}>{t(template.labelKey)}</option>
                ))}
              </select>
              <p className="vb-dialog-template-hint">
                {t('vb.dialog.templateLabel')}: <strong>{t(dialogTemplate.labelKey)}</strong>
              </p>
              <label className="form-label" htmlFor="vb-dialog-name">
                {t('vb.dialog.nameLabel')}
              </label>
              <input
                id="vb-dialog-name"
                type="text"
                className="form-input"
                value={dialogName}
                onChange={e => setDialogName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
                maxLength={200}
                autoFocus
                placeholder={t('vb.dialog.namePlaceholder')}
              />
              <p className="vb-dialog-status-hint">{t('vb.dialog.statusHint')}</p>
              {saveError && (
                <p className="form-error" role="alert">{saveError}</p>
              )}
            </div>
            <div className="bento-modal-footer">
              <button
                type="button"
                className="btn"
                onClick={closeDialog}
              >
                {t('vb.cancel')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? t('vb.dialog.saving') : t('vb.dialog.save')}
              </button>
            </div>
          </div>
        </div>
      )}
      {integrationKey && (
        <div className="resource-modal-layer" onMouseDown={e => { if (e.target === e.currentTarget) setIntegrationKey(null) }}>
          <div className="resource-form card resource-edit-modal integration-config-modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div><h3>{integrationKey === 'slidev' ? 'Slidev' : integrationKey === 'hyperframes' ? 'HyperFrames' : integrationKey === 'excalidraw' ? 'Excalidraw' : 'Open Notebook'} konfigurieren</h3><p>Lokale, persistente Integrationskonfiguration</p></div>
              <button className="icon-btn" onClick={() => setIntegrationKey(null)}><X size={18} /></button>
            </div>
            <div className="modal-body form-grid">
              <label className="form-field">Öffentliche URL
                <input value={String(integrationForm.public_url || '')} onChange={e => setIntegrationForm(v => ({ ...v, public_url: e.target.value }))} />
              </label>
              {integrationKey === 'open_notebook' && <>
                <label className="form-field">Interne API-URL
                  <input value={String(integrationForm.api_url || '')} onChange={e => setIntegrationForm(v => ({ ...v, api_url: e.target.value }))} />
                </label>
                <label className="form-field">Zugangsschlüssel
                  <input type="password" placeholder="Unverändert lassen" onChange={e => setIntegrationForm(v => ({ ...v, password: e.target.value }))} />
                </label>
                <label className="form-field">Verschlüsselungsschlüssel
                  <input type="password" placeholder="Unverändert lassen" onChange={e => setIntegrationForm(v => ({ ...v, encryption_key: e.target.value }))} />
                </label>
                <label className="form-field">Datenbank-Passwort
                  <input type="password" placeholder="Unverändert lassen" onChange={e => setIntegrationForm(v => ({ ...v, db_password: e.target.value }))} />
                </label>
              </>}
              {integrationKey === 'slidev' && <label className="form-field">Projektname
                <input value={String(integrationForm.project_name || '')} onChange={e => setIntegrationForm(v => ({ ...v, project_name: e.target.value }))} />
              </label>}
              {integrationKey === 'hyperframes' && <>
                <label className="form-field">Interne Renderer-URL
                  <input value={String(integrationForm.renderer_url || '')} onChange={e => setIntegrationForm(v => ({ ...v, renderer_url: e.target.value }))} />
                </label>
                <label className="form-field">Aktives Projekt
                  <input value={String(integrationForm.project_name || '')} onChange={e => setIntegrationForm(v => ({ ...v, project_name: e.target.value }))} />
                </label>
                <p className="integration-volume-hint">Volumes: /data/hyperframes/projects · /data/hyperframes/assets · /data/hyperframes/output</p>
              </>}
              {integrationKey === 'excalidraw' && <>
                <label className="form-field">Interne App-URL
                  <input value={String(integrationForm.app_url || '')} onChange={e => setIntegrationForm(v => ({ ...v, app_url: e.target.value }))} />
                </label>
                <p className="integration-volume-hint">Zeichnungen werden lokal im Browser gespeichert und können als .excalidraw-, PNG- oder SVG-Datei exportiert werden.</p>
              </>}
              <label className="form-field checkbox-field"><input type="checkbox" checked={Boolean(integrationForm.enabled)} onChange={e => setIntegrationForm(v => ({ ...v, enabled: e.target.checked }))} /> Integration aktiv</label>
              {saveError && <div className="vb-error">{saveError}</div>}
              {integrationTest && <div className="n8n-save-ok"><CheckCircle2 size={16} /> {integrationTest}</div>}
            </div>
            <div className="modal-actions"><button className="btn" onClick={() => setIntegrationKey(null)}>{integrationTest ? 'Schließen' : 'Abbrechen'}</button><button className="btn btn-primary" disabled={integrationSaving} onClick={saveLocalIntegration}>{integrationSaving ? 'Speichert und prüft…' : integrationKey === 'hyperframes' || integrationKey === 'excalidraw' ? 'Speichern & testen' : 'Speichern'}</button></div>
          </div>
        </div>
      )}
      </div>{/* end verbindungen-body */}
    </section>
  )
}
