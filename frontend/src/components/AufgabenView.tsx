import { useState, useEffect, useRef, useCallback } from 'react'
import BildGeneratorView from './BildGeneratorView'
import { useTheme } from '../ThemeContext'
import { CheckSquare, Search, Sparkles, ArrowLeft, ArrowRight, Play, CircleDot, Download, FileText, Loader2, Copy, Check, X, Globe, Link, Clipboard } from 'lucide-react'
import { hermesExecute, getToken } from '../api'
import MDEditor from '@uiw/react-md-editor'

// API_BASE matches the value from api.ts (VITE_API_BASE or '/api')
const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

/** Build a full API URL from a relative path like '/youtube/download' */
function apiUrl(path: string): string {
  // API_BASE already ends with '/api', path starts with '/'
  // We need to strip the leading '/api' from path if present, then join
  const cleanPath = path.replace(/^\/api/, '')
  return `${API_BASE}${cleanPath}`
}

/** Auth header helper */
function authHeader(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

interface Template {
  id: string
  nameKey: string
  descKey: string
  categoryKey: string
  icon: typeof CheckSquare
  fields: { key: string; labelKey: string; type: string; required?: boolean; optionKeys?: string[] }[]
  prompt: string
}

type ToolKey = 'overview' | 'workflow' | 'recherche' | 'bilder' | 'youtube' | 'ocr'

const TEMPLATES: Template[] = [
  {
    id: 'new-task', nameKey: 'tpl.newTask', descKey: 'tpl.newTask.desc', categoryKey: 'cat.planning', icon: CheckSquare,
    fields: [
      { key: 'title', labelKey: 'field.title', type: 'text', required: true },
      { key: 'description', labelKey: 'field.description', type: 'textarea' },
      { key: 'due_date', labelKey: 'field.dueDate', type: 'date' },
      { key: 'priority', labelKey: 'field.priority', type: 'select', required: true, optionKeys: ['opt.low', 'opt.medium', 'opt.high'] },
    ],
    prompt: 'Erstelle eine neue Aufgabe: {title}\n\nBeschreibung: {description}\nFällig bis: {due_date}\nPriorität: {priority}',
  },
  {
    id: 'recurring-task', nameKey: 'tpl.recurring', descKey: 'tpl.recurring.desc', categoryKey: 'cat.planning', icon: CircleDot,
    fields: [
      { key: 'title', labelKey: 'field.task', type: 'text', required: true },
      { key: 'frequency', labelKey: 'field.frequency', type: 'select', required: true, optionKeys: ['opt.daily', 'opt.weekly', 'opt.monthly', 'opt.yearly'] },
      { key: 'start_date', labelKey: 'field.startDate', type: 'date', required: true },
      { key: 'description', labelKey: 'field.description', type: 'textarea' },
    ],
    prompt: 'Erstelle eine wiederkehrende Aufgabe: {title}\nHäufigkeit: {frequency}\nStart: {start_date}\nBeschreibung: {description}',
  },
  {
    id: 'review-task', nameKey: 'tpl.review', descKey: 'tpl.review.desc', categoryKey: 'cat.analysis', icon: Search,
    fields: [
      { key: 'date_range', labelKey: 'field.timeRange', type: 'select', required: true, optionKeys: ['opt.today', 'opt.thisWeek', 'opt.thisMonth'] },
      { key: 'status', labelKey: 'aufgaben.status', type: 'select', optionKeys: ['opt.all', 'opt.open', 'opt.inProgress', 'opt.done'] },
    ],
    prompt: 'Erstelle einen Aufgaben-Review für {date_range} mit Status: {status}',
  },
  {
    id: 'workflow-init', nameKey: 'tpl.workflow', descKey: 'tpl.workflow.desc', categoryKey: 'cat.workflow', icon: Play,
    fields: [
      { key: 'workflow_type', labelKey: 'field.workflowType', type: 'select', required: true, optionKeys: ['opt.prReview', 'opt.codeReview', 'opt.deployment', 'opt.testing'] },
      { key: 'target', labelKey: 'field.target', type: 'text', required: true },
      { key: 'notes', labelKey: 'field.notes', type: 'textarea' },
    ],
    prompt: 'Starte Workflow: {workflow_type}\n\nZiel: {target}\nNotizen: {notes}',
  },
]

const TOOL_CARDS: { key: ToolKey; icon: typeof CheckSquare; titleKey: string; descKey: string }[] = [
  { key: 'workflow', icon: CheckSquare, titleKey: 'tool.workflow', descKey: 'tool.workflow.desc' },
  { key: 'recherche', icon: Globe, titleKey: 'tool.recherche', descKey: 'tool.recherche.desc' },
  { key: 'bilder', icon: Sparkles, titleKey: 'tool.bilder', descKey: 'tool.bilder.desc' },
  { key: 'youtube', icon: Download, titleKey: 'tool.youtube', descKey: 'tool.youtube.desc' },
  { key: 'ocr', icon: FileText, titleKey: 'tool.ocr', descKey: 'tool.ocr.desc' },
]

export default function AufgabenView() {
  const { t } = useTheme()
  const [activeTab, setActiveTab] = useState<'overview' | 'executed'>('overview')
  const [selectedTool, setSelectedTool] = useState<ToolKey>('overview')
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [executedTasks, setExecutedTasks] = useState<{ id: string; name: string; date: string; status: string }[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Abort controllers
  const ytAbortRef = useRef<AbortController | null>(null)
  const ocrAbortRef = useRef<AbortController | null>(null)
  const rechercheAbortRef = useRef<AbortController | null>(null)

  // YouTube state
  const [ytUrl, setYtUrl] = useState('')
  const [ytFormat, setYtFormat] = useState<'audio' | 'video'>('audio')
  const [ytDownloading, setYtDownloading] = useState(false)
  const [ytResult, setYtResult] = useState<string | null>(null)
  const [ytFilename, setYtFilename] = useState<string | null>(null)
  const [ytError, setYtError] = useState<string | null>(null)

  // OCR state
  const [ocrFile, setOcrFile] = useState<File | null>(null)
  const [ocrUrl, setOcrUrl] = useState('')
  const [ocrInputMode, setOcrInputMode] = useState<'file' | 'url' | 'clipboard'>('file')
  const [ocrLang, setOcrLang] = useState('de')
  const [ocrProcessing, setOcrProcessing] = useState(false)
  const [ocrResult, setOcrResult] = useState<string | null>(null)
  const [ocrCopied, setOcrCopied] = useState(false)
  const [ocrError, setOcrError] = useState<string | null>(null)

  // Recherche state
  const [rechercheQuery, setRechercheQuery] = useState('')
  const [rechercheDepth, setRechercheDepth] = useState<'kurz' | 'ausführlich'>('ausführlich')
  const [rechercheLoading, setRechercheLoading] = useState(false)
  const [rechercheResult, setRechercheResult] = useState<string | null>(null)

  const selectTool = (tool: ToolKey) => { setSelectedTool(tool); setSelectedTemplate(null); setFormData({}) }

  // Load history when "executed" tab is opened
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch(apiUrl('/api/tasks/history'), {
        headers: { ...authHeader() }
      })
      if (res.ok) {
        const data = await res.json()
        setExecutedTasks(data.map((item: { id: string; name: string; date: string; status: string }) => ({
          id: String(item.id),
          name: item.name,
          date: item.date,
          status: item.status,
        })))
      }
    } catch {
      // Fallback: keep existing in-memory list
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  // Save executed task to backend
  const saveTaskHistory = async (name: string, status: string, result?: string) => {
    try {
      await fetch(apiUrl('/api/tasks/history'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader(),
        },
        body: JSON.stringify({ name, status, result }),
      })
    } catch {
      // Silently fail - fallback to in-memory
    }
  }

  const handleExecute = async () => {
    if (!selectedTemplate) return
    const missing = selectedTemplate.fields.filter(field => field.required && !formData[field.key])
    if (missing.length) { alert(t('aufgaben.fillRequired')); return }
    let prompt = selectedTemplate.prompt
    Object.entries(formData).forEach(([key, value]) => { prompt = prompt.replace(new RegExp(`{${key}}`, 'g'), value) })
    try {
      await hermesExecute(prompt)
      const taskName = t(selectedTemplate.nameKey)
      const taskStatus = t('aufgaben.success')
      await saveTaskHistory(taskName, taskStatus)
      setExecutedTasks(prev => [{ id: Date.now().toString(), name: taskName, date: new Date().toISOString(), status: taskStatus }, ...prev])
      setSelectedTemplate(null)
      setFormData({})
      alert(t('aufgaben.executionSuccess'))
    } catch {
      alert(t('aufgaben.executionError'))
    }
  }

  const handleYTDownload = async () => {
    if (!ytUrl.trim()) { alert(t('sprache.enterUrl')); return }
    ytAbortRef.current = new AbortController()
    setYtDownloading(true)
    setYtResult(null)
    setYtFilename(null)
    setYtError(null)
    try {
      const res = await fetch(apiUrl('/api/youtube/download'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader(),
        },
        body: JSON.stringify({ url: ytUrl, format: ytFormat }),
        signal: ytAbortRef.current.signal,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Download failed')
      setYtResult(data.download_url || null)
      setYtFilename(data.filename || null)
      await saveTaskHistory(`YouTube: ${ytFilename || ytUrl}`, t('aufgaben.success'))
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return
      setYtError(error instanceof Error ? error.message : String(error))
    } finally {
      setYtDownloading(false)
      ytAbortRef.current = null
    }
  }

  const handleYTCancel = () => {
    ytAbortRef.current?.abort()
    setYtDownloading(false)
    setYtError(null)
  }

  const handleOCR = async () => {
    // Determine what input we have
    const hasFile = ocrInputMode === 'file' && ocrFile
    const hasUrl = ocrInputMode === 'url' && ocrUrl.trim()
    const hasClipboard = ocrInputMode === 'clipboard' && ocrFile

    if (!hasFile && !hasUrl && !hasClipboard) {
      setOcrError(t('ocr.selectImage'))
      return
    }

    ocrAbortRef.current = new AbortController()
    setOcrProcessing(true)
    setOcrResult(null)
    setOcrError(null)

    try {
      let res: Response

      if (hasUrl) {
        // URL mode: send JSON with URL to backend
        res = await fetch(apiUrl('/api/ocr/extract-url'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeader(),
          },
          body: JSON.stringify({ url: ocrUrl.trim(), language: ocrLang }),
          signal: ocrAbortRef.current.signal,
        })
      } else {
        // File or clipboard mode: send multipart form
        const formDataObj = new FormData()
        formDataObj.append('image', ocrFile!)
        formDataObj.append('language', ocrLang)
        res = await fetch(apiUrl('/api/ocr/extract'), {
          method: 'POST',
          headers: { ...authHeader() },
          body: formDataObj,
          signal: ocrAbortRef.current.signal,
        })
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'OCR failed')
      setOcrResult(data.text || null)
      const label = hasUrl ? ocrUrl.trim().split('/').pop() || 'URL' : ocrFile?.name || 'clipboard'
      await saveTaskHistory(`OCR: ${label}`, t('aufgaben.success'))
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return
      setOcrError(error instanceof Error ? error.message : String(error))
    } finally {
      setOcrProcessing(false)
      ocrAbortRef.current = null
    }
  }

  const handleOCRCancel = () => {
    ocrAbortRef.current?.abort()
    setOcrProcessing(false)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setOcrCopied(true)
      setTimeout(() => setOcrCopied(false), 2000)
    })
  }

  const downloadText = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadMarkdown = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  // OCR clipboard paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (selectedTool !== 'ocr') return
      const items = e.clipboardData?.items
      if (!items) return
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile()
          if (file) setOcrFile(file)
          break
        }
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [selectedTool])

  const handleRecherche = async () => {
    if (!rechercheQuery.trim()) return
    rechercheAbortRef.current = new AbortController()
    setRechercheLoading(true)
    setRechercheResult(null)
    const depthHint = rechercheDepth === 'kurz'
      ? 'Erstelle eine kurze Zusammenfassung (max. 300 Wörter).'
      : 'Erstelle eine ausführliche, strukturierte Zusammenfassung mit Unterabschnitten.'
    const prompt = `Recherchiere im Internet zum Thema: ${rechercheQuery}. ${depthHint}`
    try {
      const res = await fetch(apiUrl('/api/hermes/execute'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader(),
        },
        body: JSON.stringify({ prompt }),
        signal: rechercheAbortRef.current.signal,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Recherche failed')
      const resultText = data.result || data.response || data.text || JSON.stringify(data)
      setRechercheResult(resultText)
      await saveTaskHistory(`Recherche: ${rechercheQuery}`, t('aufgaben.success'))
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return
      setRechercheResult(`**Fehler:** ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setRechercheLoading(false)
      rechercheAbortRef.current = null
    }
  }

  const handleRechercheCancel = () => {
    rechercheAbortRef.current?.abort()
    setRechercheLoading(false)
  }

  const renderTool = () => {
    if (selectedTool === 'recherche') return (
      <div className="tts-wrapper">
        <h3>{t('recherche.title')}</h3>
        <p className="view-sub">{t('recherche.sub')}</p>
        <div className="form-group">
          <label>{t('recherche.queryLabel')}</label>
          <input
            type="text"
            value={rechercheQuery}
            onChange={e => setRechercheQuery(e.target.value)}
            placeholder={t('recherche.queryPlaceholder')}
            onKeyDown={e => { if (e.key === 'Enter' && !rechercheLoading) handleRecherche() }}
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>{t('recherche.depthLabel')}</label>
            <select value={rechercheDepth} onChange={e => setRechercheDepth(e.target.value as 'kurz' | 'ausführlich')}>
              <option value="kurz">{t('recherche.depth.short')}</option>
              <option value="ausführlich">{t('recherche.depth.detailed')}</option>
            </select>
          </div>
        </div>
        <div className="button-row">
          <button className="primary-btn" onClick={handleRecherche} disabled={rechercheLoading || !rechercheQuery.trim()}>
            {rechercheLoading ? <><Loader2 size={14} className="spin" /> {t('recherche.searching')}</> : <><Globe size={14} /> {t('recherche.search')}</>}
          </button>
          {rechercheLoading && (
            <button className="cancel-btn" onClick={handleRechercheCancel}>
              <X size={14} /> {t('cancel')}
            </button>
          )}
        </div>
        {rechercheResult && (
          <div className="recherche-result">
            <div className="result-header">
              <p className="result-label">{t('recherche.resultTitle')}</p>
              <div className="result-actions">
                <button className="secondary-btn" onClick={() => downloadMarkdown(rechercheResult, `recherche-${rechercheQuery.slice(0, 30).replace(/\s+/g, '-')}.md`)}>
                  <Download size={14} /> {t('recherche.download')}
                </button>
              </div>
            </div>
            <div data-color-mode="auto" className="recherche-markdown">
              <MDEditor.Markdown source={rechercheResult} />
            </div>
          </div>
        )}
      </div>
    )

    if (selectedTool === 'bilder') return <BildGeneratorView />

    if (selectedTool === 'youtube') return (
      <div className="tts-wrapper">
        <h3>{t('yt.title')}</h3>
        <p className="view-sub">{t('yt.sub')}</p>
        <div className="form-group">
          <label>{t('sprache.ytUrl')}</label>
          <input type="url" value={ytUrl} onChange={e => setYtUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>{t('sprache.format')}</label>
            <select value={ytFormat} onChange={e => setYtFormat(e.target.value as 'audio' | 'video')}>
              <option value="audio">{t('format.audio')}</option>
              <option value="video">{t('format.video')}</option>
            </select>
          </div>
        </div>
        <div className="button-row">
          <button className="primary-btn" onClick={handleYTDownload} disabled={ytDownloading || !ytUrl.trim()}>
            {ytDownloading ? <><Loader2 size={14} className="spin" /> {t('sprache.downloading')}</> : <><Download size={14} /> {t('sprache.download')}</>}
          </button>
          {ytDownloading && (
            <button className="cancel-btn" onClick={handleYTCancel}>
              <X size={14} /> {t('cancel')}
            </button>
          )}
        </div>
        {ytError && <div className="error-msg">{ytError}</div>}
        {ytResult && (
          <div className="yt-result">
            <p>{t('sprache.downloadReady')}{ytFilename ? `: ${ytFilename}` : ''}</p>
            <a href={apiUrl(ytResult || '')} download={ytFilename || undefined} className="download-link">
              <Download size={14} /> {t('sprache.downloadFile')}
            </a>
          </div>
        )}
      </div>
    )

    if (selectedTool === 'ocr') return (
      <div className="tts-wrapper">
        <h3>{t('ocr.title')}</h3>
        <p className="view-sub">{t('ocr.sub')}</p>

        {/* Input mode tabs */}
        <div className="sprache-tabs" style={{ marginBottom: '16px' }}>
          <button className={`tab-btn ${ocrInputMode === 'file' ? 'active' : ''}`} onClick={() => { setOcrInputMode('file'); setOcrError(null) }}>
            <FileText size={14} /> {t('ocr.modeFile')}
          </button>
          <button className={`tab-btn ${ocrInputMode === 'url' ? 'active' : ''}`} onClick={() => { setOcrInputMode('url'); setOcrError(null) }}>
            <Link size={14} /> {t('ocr.modeUrl')}
          </button>
          <button className={`tab-btn ${ocrInputMode === 'clipboard' ? 'active' : ''}`} onClick={() => { setOcrInputMode('clipboard'); setOcrError(null) }}>
            <Clipboard size={14} /> {t('ocr.modeClipboard')}
          </button>
        </div>

        {/* File input */}
        {ocrInputMode === 'file' && (
          <div className="form-group">
            <label>{t('ocr.imageFile')}</label>
            <input type="file" accept="image/*" onChange={e => setOcrFile(e.target?.files?.[0] || null)} />
            {ocrFile && <p className="field-hint">{ocrFile.name}</p>}
          </div>
        )}

        {/* URL input */}
        {ocrInputMode === 'url' && (
          <div className="form-group">
            <label>{t('ocr.imageUrl')}</label>
            <input
              type="url"
              value={ocrUrl}
              onChange={e => setOcrUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
            <p className="field-hint">{t('ocr.urlHint')}</p>
          </div>
        )}

        {/* Clipboard hint */}
        {ocrInputMode === 'clipboard' && (
          <div className="form-group">
            <label>{t('ocr.clipboardLabel')}</label>
            {!ocrFile ? (
              <p className="field-hint">{t('ocr.pasteHint')}</p>
            ) : (
              <p className="field-hint">{t('ocr.clipboardReady')}: {ocrFile.name}</p>
            )}
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label>{t('ocr.language')}</label>
            <select value={ocrLang} onChange={e => setOcrLang(e.target.value)}>
              <option value="de">Deutsch</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
              <option value="it">Italiano</option>
            </select>
          </div>
        </div>

        {ocrError && <div className="error-msg">{ocrError}</div>}

        <div className="button-row">
          <button className="primary-btn" onClick={handleOCR} disabled={ocrProcessing || (ocrInputMode === 'file' && !ocrFile) || (ocrInputMode === 'url' && !ocrUrl.trim()) || (ocrInputMode === 'clipboard' && !ocrFile)}>
            {ocrProcessing ? <><Loader2 size={14} className="spin" /> {t('ocr.processing')}</> : <><FileText size={14} /> {t('ocr.extract')}</>}
          </button>
          {ocrProcessing && (
            <button className="cancel-btn" onClick={handleOCRCancel}>
              <X size={14} /> {t('cancel')}
            </button>
          )}
        </div>
        {ocrResult && (
          <div className="stt-result">
            <p>{t('ocr.resultTitle')}</p>
            <div className="transcription-text">{ocrResult}</div>
            <div className="result-actions">
              <button className="secondary-btn" onClick={() => copyToClipboard(ocrResult)}>
                {ocrCopied ? <><Check size={14} /> {t('copied')}</> : <><Copy size={14} /> {t('copy')}</>}
              </button>
              <button className="secondary-btn" onClick={() => downloadText(ocrResult, `ocr-ergebnis-${Date.now()}.txt`)}>
                <Download size={14} /> {t('ocr.download')}
              </button>
              <button className="secondary-btn" onClick={() => {
                setSelectedTool('workflow')
                setSelectedTemplate(TEMPLATES[0])
                setFormData({ description: ocrResult })
              }}>
                <ArrowRight size={14} /> {t('ocr.toTask')}
              </button>
            </div>
          </div>
        )}
      </div>
    )

    return null
  }

  return (
    <section className="view aufgaben-view">
      <header className="view-header aufgaben-hero">
        <div className="view-title">
          <span className="eyebrow">{t('aufgaben.eyebrow')}</span>
          <h2>{t('aufgaben.title')}</h2>
          <p className="view-sub">{t('aufgaben.sub')}</p>
        </div>
        <div className="aufgaben-hero-mark">
          <button className="hero-mark-btn" onClick={() => { setActiveTab('overview'); selectTool('overview') }} title={t('aufgaben.backToOverview')}>
            <CheckSquare size={36} />
          </button>
        </div>
      </header>

      <div className="aufgaben-tabs">
        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => { setActiveTab('overview'); selectTool('overview') }}>{t('aufgaben.overview')}</button>
        <button className={`tab-btn ${activeTab === 'executed' ? 'active' : ''}`} onClick={() => { setActiveTab('executed'); loadHistory() }}>{t('aufgaben.executed')} <span className="tab-count">{executedTasks.length}</span></button>
      </div>

      {activeTab === 'overview' && selectedTool === 'overview' && (
        <>
          <div className="task-intro">
            <div><h3>{t('aufgaben.whatToDo')}</h3><p>{t('aufgaben.allTools')}</p></div>
            <span className="task-intro-tip">{t('aufgaben.tip')}</span>
          </div>
          <div className="task-tool-grid">
            {TOOL_CARDS.map(tool => {
              const Icon = tool.icon
              return (
                <button key={tool.key} className="task-tool-card" onClick={() => selectTool(tool.key)}>
                  <span className="task-tool-icon"><Icon size={20} /></span>
                  <span className="task-tool-copy"><strong>{t(tool.titleKey)}</strong><small>{t(tool.descKey)}</small></span>
                  <span className="task-tool-arrow"><ArrowRight size={16} /></span>
                </button>
              )
            })}
          </div>
          <div className="task-section-heading">
            <div><span className="eyebrow">{t('aufgaben.quickstart')}</span><h3>{t('aufgaben.templates')}</h3></div>
            <span>{t('aufgaben.templatesCount').replace('{n}', String(TEMPLATES.length))}</span>
          </div>
          <div className="template-grid">
            {TEMPLATES.map(template => {
              const Icon = template.icon
              return (
                <button key={template.id} className="template-card" onClick={() => { setSelectedTool('workflow'); setSelectedTemplate(template); setFormData({}) }}>
                  <div className="template-card-top">
                    <span className="template-icon"><Icon size={16} /></span>
                    <span className="template-badge">{t(template.categoryKey)}</span>
                  </div>
                  <h3>{t(template.nameKey)}</h3>
                  <p className="template-description">{t(template.descKey)}</p>
                  <span className="template-action-btn">{t('aufgaben.configure')} <ArrowRight size={12} /></span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {activeTab === 'overview' && selectedTool !== 'overview' && !selectedTemplate && (
        <div className="task-tool-view">
          <button className="back-btn" onClick={() => selectTool('overview')}><ArrowLeft size={14} /> {t('aufgaben.back')}</button>
          {renderTool()}
        </div>
      )}

      {activeTab === 'overview' && selectedTemplate && (
        <div className="template-form task-config-panel">
          <button className="back-btn" onClick={() => { setSelectedTemplate(null); selectTool('overview') }}><ArrowLeft size={14} /> {t('aufgaben.backTemplates')}</button>
          <div className="config-heading">
            <span className="template-icon">{(() => { const Icon = selectedTemplate.icon; return <Icon size={16} /> })()}</span>
            <div>
              <span className="eyebrow">{t('aufgaben.configuration')}</span>
              <h3>{t(selectedTemplate.nameKey)}</h3>
              <p className="view-sub">{t(selectedTemplate.descKey)}</p>
            </div>
          </div>
          <div className="form-fields">
            {selectedTemplate.fields.map(field => (
              <div key={field.key} className="form-field">
                <label>{t(field.labelKey)}{field.required && <span className="required">*</span>}</label>
                {field.type === 'textarea' ? (
                  <textarea value={formData[field.key] || ''} onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))} placeholder={t('field.enter').replace('{label}', t(field.labelKey))} rows={3} />
                ) : field.type === 'select' && field.optionKeys ? (
                  <select value={formData[field.key] || ''} onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}>
                    <option value="">{t('field.select')}</option>
                    {field.optionKeys.map(ok => <option key={ok} value={t(ok)}>{t(ok)}</option>)}
                  </select>
                ) : (
                  <input type={field.type} value={formData[field.key] || ''} onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))} placeholder={t('field.enter').replace('{label}', t(field.labelKey))} />
                )}
              </div>
            ))}
          </div>
          <div className="form-actions">
            <button className="execute-btn" onClick={handleExecute}><Play size={14} /> {t('aufgaben.execute')}</button>
          </div>
        </div>
      )}

      {activeTab === 'executed' && (
        <div className="executed-tasks" style={{ padding: '0 28px' }}>
          {historyLoading ? (
            <div className="empty-state"><Loader2 size={24} className="spin" /><p>{t('loading')}</p></div>
          ) : executedTasks.length === 0 ? (
            <div className="empty-state"><span className="empty-icon"><CircleDot size={32} /></span><p>{t('aufgaben.noExecuted')}</p><span>{t('aufgaben.executedHint')}</span></div>
          ) : (
            <table className="executed-table">
              <thead><tr><th>{t('aufgaben.task')}</th><th>{t('aufgaben.date')}</th><th>{t('aufgaben.status')}</th></tr></thead>
              <tbody>{executedTasks.map(task => <tr key={task.id}><td>{task.name}</td><td>{new Date(task.date).toLocaleString('de-DE')}</td><td><span className="status-pill">{task.status}</span></td></tr>)}</tbody>
            </table>
          )}
        </div>
      )}
    </section>
  )
}
