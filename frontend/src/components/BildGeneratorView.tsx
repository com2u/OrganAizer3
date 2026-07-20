import { useState, useRef } from 'react'
import { useTheme } from '../ThemeContext'
import { Sparkles, Download, ZoomIn, Clock, Loader2, X } from 'lucide-react'
import { getToken } from '../api'

interface GenerationConfig {
  prompt: string
  negativePrompt: string
  style: string
  aspectRatio: string
  count: number
  quality: string
}

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

function apiUrl(path: string): string {
  const cleanPath = path.replace(/^\/api/, '')
  return `${API_BASE}${cleanPath}`
}

function authHeader(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export default function BildGeneratorView() {
  const { t } = useTheme()

  const STYLES = [
    { id: 'realistic', labelKey: 'style.realistic' },
    { id: 'digital-art', labelKey: 'style.digitalArt' },
    { id: 'anime', labelKey: 'style.anime' },
    { id: '3d-render', labelKey: 'style.3dRender' },
    { id: 'oil-painting', labelKey: 'style.oilPainting' },
    { id: 'watercolor', labelKey: 'style.watercolor' },
    { id: 'pixel-art', labelKey: 'style.pixelArt' },
    { id: 'minimalist', labelKey: 'style.minimalist' },
  ]

  const ASPECT_RATIOS = [
    { id: '1:1', label: '1:1', descKey: 'ratio.square', w: 1024, h: 1024 },
    { id: '16:9', label: '16:9', descKey: 'ratio.wide', w: 1344, h: 768 },
    { id: '9:16', label: '9:16', descKey: 'ratio.portrait', w: 768, h: 1344 },
    { id: '4:3', label: '4:3', descKey: 'ratio.classic', w: 1152, h: 896 },
    { id: '3:2', label: '3:2', descKey: 'ratio.photo', w: 1216, h: 832 },
  ]

  const QUALITIES = [
    { id: 'standard', labelKey: 'quality.standard', descKey: 'quality.fast' },
    { id: 'hd', labelKey: 'quality.hd', descKey: 'quality.high' },
    { id: 'ultra', labelKey: 'quality.ultra', descKey: 'quality.best' },
  ]

  const [config, setConfig] = useState<GenerationConfig>({
    prompt: '', negativePrompt: '', style: 'realistic', aspectRatio: '1:1', count: 1, quality: 'hd',
  })
  const [generating, setGenerating] = useState(false)
  const [results, setResults] = useState<string[]>([])
  const [history, setHistory] = useState<Array<{ id: string; prompt: string; imageUrl: string; timestamp: string; style: string }>>([])
  const abortRef = useRef<AbortController | null>(null)

  const handleGenerate = async () => {
    if (!config.prompt.trim()) { alert(t('bilder.enterPrompt')); return }
    abortRef.current = new AbortController()
    setGenerating(true)
    setResults([])
    try {
      const ar = ASPECT_RATIOS.find(r => r.id === config.aspectRatio)
      const response = await fetch(apiUrl('/api/bilder/generate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader(),
        },
        body: JSON.stringify({ prompt: config.prompt, negative_prompt: config.negativePrompt, style: config.style, width: ar?.w || 1024, height: ar?.h || 1024, count: config.count, quality: config.quality }),
        signal: abortRef.current.signal,
      })
      const data = await response.json()
      if (!response.ok) {
        const errorMsg = data.error || 'Generation failed'
        alert(errorMsg)
        return
      }
      setResults(data.image_urls || [])
      const autoShow = localStorage.getItem('bilder_auto_show') !== 'false'
      if (autoShow && data.image_urls?.length) {
        data.image_urls.forEach((url: string) => {
          setHistory(prev => [{ id: Date.now().toString() + Math.random(), prompt: config.prompt, imageUrl: url, timestamp: new Date().toISOString(), style: config.style }, ...prev.slice(0, 49)])
        })
      }
      // Save to task history
      await fetch(apiUrl('/api/tasks/history'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader(),
        },
        body: JSON.stringify({ name: `Bilder: ${config.prompt.slice(0, 50)}`, status: 'Erfolgreich' }),
      }).catch(() => {})
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      alert(err instanceof Error ? err.message : 'Bildgenerierung fehlgeschlagen')
    } finally {
      setGenerating(false)
      abortRef.current = null
    }
  }

  const handleCancel = () => {
    abortRef.current?.abort()
    setGenerating(false)
  }

  return (
    <section className="view bilder-view">
      <header className="view-header">
        <div className="view-title">
          <h2>{t('bilder.title')}</h2>
          <p className="view-sub">{t('bilder.sub')}</p>
        </div>
      </header>

      <div className="bild-generator-layout">
        <div className="generator-panel">
          <div className="form-group">
            <label>{t('bilder.prompt')} *</label>
            <textarea value={config.prompt} onChange={e => setConfig(prev => ({ ...prev, prompt: e.target.value }))} placeholder={t('bilder.promptPlaceholder')} rows={4} />
            <button className="small-btn" onClick={async () => {
              try {
                const res = await fetch(apiUrl('/api/hermes/improve-prompt'), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', ...authHeader() },
                  body: JSON.stringify({ text: config.prompt }),
                })
                const data = await res.json()
                setConfig(prev => ({ ...prev, prompt: data.improved }))
              } catch {
                setConfig(prev => ({ ...prev, prompt: prev.prompt + ', highly detailed, professional quality, masterful composition' }))
              }
            }} disabled={!config.prompt.trim()}>
              <Sparkles size={12} /> {t('bilder.improve')}
            </button>
          </div>

          <div className="form-group">
            <label>{t('bilder.negativePrompt')}</label>
            <input type="text" value={config.negativePrompt} onChange={e => setConfig(prev => ({ ...prev, negativePrompt: e.target.value }))} placeholder={t('bilder.negPlaceholder')} />
          </div>

          <div className="form-group">
            <label>{t('bilder.style')}</label>
            <div className="style-grid">
              {STYLES.map(style => (
                <button key={style.id} className={`style-card ${config.style === style.id ? 'selected' : ''}`} onClick={() => setConfig(prev => ({ ...prev, style: style.id }))}>
                  <span className="style-name">{t(style.labelKey)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>{t('bilder.aspectRatio')}</label>
            <div className="ratio-selector">
              {ASPECT_RATIOS.map(ratio => (
                <button key={ratio.id} className={`ratio-btn ${config.aspectRatio === ratio.id ? 'selected' : ''}`} onClick={() => setConfig(prev => ({ ...prev, aspectRatio: ratio.id }))} title={`${t(ratio.descKey)} (${ratio.w}x${ratio.h})`}>
                  <div className="ratio-preview" style={{ aspectRatio: `${ratio.w}/${ratio.h}` }} />
                  <span>{ratio.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{t('bilder.count')}</label>
              <select value={config.count} onChange={e => setConfig(prev => ({ ...prev, count: parseInt(e.target.value) }))}>
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={4}>4</option>
              </select>
            </div>
            <div className="form-group">
              <label>{t('bilder.quality')}</label>
              <select value={config.quality} onChange={e => setConfig(prev => ({ ...prev, quality: e.target.value }))}>
                {QUALITIES.map(q => <option key={q.id} value={q.id}>{t(q.labelKey)} - {t(q.descKey)}</option>)}
              </select>
            </div>
          </div>

          <div className="button-row">
            <button className="primary-btn generate-btn" onClick={handleGenerate} disabled={generating || !config.prompt.trim()}>
              {generating ? <><Loader2 size={14} className="spin" /> {t('bilder.generating')}</> : <><Sparkles size={14} /> {config.count > 1 ? t('bilder.nImagesPlural').replace('{n}', String(config.count)) : t('bilder.nImages').replace('{n}', '1')} </>}
            </button>
            {generating && (
              <button className="cancel-btn" onClick={handleCancel}>
                <X size={14} /> {t('cancel')}
              </button>
            )}
          </div>
        </div>

        <div className="results-panel">
          {generating && (
            <div className="generating-placeholder">
              <div className="spinner-large" />
              <p>{t('bilder.generatingHint')}</p>
              <p className="small-hint">{t('bilder.generatingWait')}</p>
            </div>
          )}

          {results.length > 0 && !generating && (
            <div className="results-grid">
              {results.map((url, i) => (
                <div key={i} className="result-image-card">
                  <img src={url} alt={`${t('bilder.title')} ${i + 1}`} />
                  <div className="result-actions">
                    <a href={url} download className="action-btn" title={t('sprache.download')}><Download size={14} /></a>
                    <button className="action-btn" onClick={() => window.open(url)} title="Fullscreen"><ZoomIn size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!generating && results.length === 0 && history.length > 0 && (
            <div className="history-section">
              <h4><Clock size={14} /> {t('bilder.history')}</h4>
              <div className="history-grid">
                {history.slice(0, 8).map(item => (
                  <div key={item.id} className="history-card">
                    <img src={item.imageUrl} alt={item.prompt} />
                    <div className="history-info">
                      <p className="history-prompt">{item.prompt}</p>
                      <span className="history-meta">{item.style} · {new Date(item.timestamp).toLocaleDateString('de-DE')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!generating && results.length === 0 && history.length === 0 && (
            <div className="empty-results">
              <Sparkles size={32} />
              <p>{t('bilder.empty')}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
