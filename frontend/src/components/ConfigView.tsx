import { useState, useEffect } from 'react'
import { useTheme } from '../ThemeContext'
import { fetchConfig, saveConfig } from '../api'
import { Settings, Volume2, Download, Image, ScanText, BookOpen, Palette, Sun, Moon, Save, Check, Loader2, ScrollText } from 'lucide-react'
import LoggingPanel from './LoggingPanel'

interface AppConfig {
  tts_auto_play: boolean
  tts_auto_download: boolean
  youtube_default_format: 'audio' | 'video'
  youtube_default_quality: 'low' | 'medium' | 'high'
  bilder_auto_show: boolean
  bilder_auto_download: boolean
  bilder_default_style: string
  bilder_default_quality: string
  ocr_auto_extract: boolean
  ocr_default_language: string
  obsidian_vault_path: string
  obsidian_api_url: string
  hermes_api_url: string
}

type TabKey = 'appearance' | 'general' | 'tts' | 'youtube' | 'bilder' | 'ocr' | 'obsidian' | 'logs'

export default function ConfigView() {
  const { t, theme, lang, setTheme, setLang } = useTheme()
  const [activeTab, setActiveTab] = useState<TabKey>('appearance')
  const [config, setConfig] = useState<AppConfig>({
    tts_auto_play: true,
    tts_auto_download: false,
    youtube_default_format: 'audio',
    youtube_default_quality: 'medium',
    bilder_auto_show: true,
    bilder_auto_download: false,
    bilder_default_style: 'realistic',
    bilder_default_quality: 'hd',
    ocr_auto_extract: true,
    ocr_default_language: 'de',
    obsidian_vault_path: '/vault/obsidian',
    obsidian_api_url: 'http://localhost:8090',
    hermes_api_url: 'http://localhost:8080',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { loadConfig() }, [])

  const loadConfig = async () => {
    try {
      const data = await fetchConfig()
      setConfig(prev => ({ ...prev, ...data }))
    } catch { /* defaults */ } finally { setLoading(false) }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const savedConfig = await saveConfig({ ...config })
      setConfig(prev => ({ ...prev, ...savedConfig }))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch { alert(t('config.saveError')) } finally { setSaving(false) }
  }

  const updateConfig = <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const tabs: { key: TabKey; icon: typeof Settings; labelKey: string }[] = [
    { key: 'appearance', icon: Palette, labelKey: 'config.appearance' },
    { key: 'general', icon: Settings, labelKey: 'config.general' },
    { key: 'tts', icon: Volume2, labelKey: 'config.tts' },
    { key: 'youtube', icon: Download, labelKey: 'config.youtube' },
    { key: 'bilder', icon: Image, labelKey: 'config.bilder' },
    { key: 'ocr', icon: ScanText, labelKey: 'config.ocr' },
    { key: 'obsidian', icon: BookOpen, labelKey: 'config.obsidian' },
    { key: 'logs', icon: ScrollText, labelKey: 'config.logs' },
  ]

  if (loading) {
    return (
      <section className="view config-view">
        <header className="view-header">
          <div className="view-title"><h2>{t('config.title')}</h2></div>
        </header>
        <div className="loading-state"><Loader2 size={20} /> {t('config.loading')}</div>
      </section>
    )
  }

  return (
    <section className="view config-view">
      <header className="view-header">
        <div className="view-title">
          <h2>{t('config.title')}</h2>
          <p className="view-sub">{t('config.sub')}</p>
        </div>
        <div className="view-header-controls">
          <button className={`btn-secondary ${saved ? 'saved' : ''}`} onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 size={14} /> {t('config.saving')}</> : saved ? <><Check size={14} /> {t('config.saved')}</> : <><Save size={14} /> {t('config.save')}</>}
          </button>
        </div>
      </header>

      <div className="config-tabs">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.key} className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
              <Icon size={14} /> {t(tab.labelKey)}
            </button>
          )
        })}
      </div>

      <div className="config-content">
        {activeTab === 'appearance' && (
          <div className="config-section">
            <h3>{t('config.appearance')}</h3>
            <div className="appearance-grid">
              <div className="appearance-row">
                <label>{t('config.theme')}</label>
                <div className="segmented">
                  <button className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}>
                    <Moon size={14} /> {t('config.theme.dark')}
                  </button>
                  <button className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}>
                    <Sun size={14} /> {t('config.theme.light')}
                  </button>
                </div>
              </div>
              <div className="appearance-row">
                <label>{t('config.language')}</label>
                <div className="segmented">
                  <button className={lang === 'de' ? 'active' : ''} onClick={() => setLang('de')}>{t('config.lang.de')}</button>
                  <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>{t('config.lang.en')}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'general' && (
          <div className="config-section">
            <h3><Settings size={18} /> {t('config.general.title')}</h3>
            <div className="config-group">
              <div className="form-group">
                <label>{t('config.hermesApi')}</label>
                <input type="url" value={config.hermes_api_url} onChange={e => updateConfig('hermes_api_url', e.target.value)} placeholder="http://localhost:8080" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tts' && (
          <div className="config-section">
            <h3><Volume2 size={18} /> {t('config.tts.title')}</h3>
            <div className="toggle-group">
              <div className="toggle-item">
                <div className="toggle-info"><strong>{t('config.autoPlay')}</strong><p>{t('config.autoPlay.desc')}</p></div>
                <label className="switch"><input type="checkbox" checked={config.tts_auto_play} onChange={e => updateConfig('tts_auto_play', e.target.checked)} /><span className="slider" /></label>
              </div>
              <div className="toggle-item">
                <div className="toggle-info"><strong>{t('config.autoDownload')}</strong><p>{t('config.autoDownload.desc')}</p></div>
                <label className="switch"><input type="checkbox" checked={config.tts_auto_download} onChange={e => updateConfig('tts_auto_download', e.target.checked)} /><span className="slider" /></label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'youtube' && (
          <div className="config-section">
            <h3><Download size={18} /> {t('config.yt.title')}</h3>
            <div className="form-group">
              <label>{t('config.defaultFormat')}</label>
              <select value={config.youtube_default_format} onChange={e => updateConfig('youtube_default_format', e.target.value as 'audio' | 'video')}>
                <option value="audio">{t('format.audio')}</option>
                <option value="video">{t('format.video')}</option>
              </select>
            </div>
            <div className="form-group" style={{ marginTop: 16 }}>
              <label>{t('config.defaultQuality')}</label>
              <select value={config.youtube_default_quality} onChange={e => updateConfig('youtube_default_quality', e.target.value as 'low' | 'medium' | 'high')}>
                <option value="low">{t('config.quality.low')}</option>
                <option value="medium">{t('config.quality.medium')}</option>
                <option value="high">{t('config.quality.high')}</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'bilder' && (
          <div className="config-section">
            <h3><Image size={18} /> {t('config.bilder.title')}</h3>
            <div className="toggle-group">
              <div className="toggle-item">
                <div className="toggle-info"><strong>{t('config.autoShow')}</strong><p>{t('config.autoShow.desc')}</p></div>
                <label className="switch"><input type="checkbox" checked={config.bilder_auto_show} onChange={e => updateConfig('bilder_auto_show', e.target.checked)} /><span className="slider" /></label>
              </div>
              <div className="toggle-item">
                <div className="toggle-info"><strong>{t('config.autoDownloadImg')}</strong><p>{t('config.autoDownloadImg.desc')}</p></div>
                <label className="switch"><input type="checkbox" checked={config.bilder_auto_download} onChange={e => updateConfig('bilder_auto_download', e.target.checked)} /><span className="slider" /></label>
              </div>
            </div>
            <div className="form-row" style={{ marginTop: 16 }}>
              <div className="form-group">
                <label>{t('config.defaultStyle')}</label>
                <select value={config.bilder_default_style} onChange={e => updateConfig('bilder_default_style', e.target.value)}>
                  <option value="realistic">{t('style.realistic')}</option>
                  <option value="digital-art">{t('style.digitalArt')}</option>
                  <option value="anime">{t('style.anime')}</option>
                  <option value="3d-render">{t('style.3dRender')}</option>
                  <option value="oil-painting">{t('style.oilPainting')}</option>
                  <option value="watercolor">{t('style.watercolor')}</option>
                  <option value="pixel-art">{t('style.pixelArt')}</option>
                  <option value="minimalist">{t('style.minimalist')}</option>
                </select>
              </div>
              <div className="form-group">
                <label>{t('config.defaultQuality')}</label>
                <select value={config.bilder_default_quality} onChange={e => updateConfig('bilder_default_quality', e.target.value)}>
                  <option value="standard">{t('quality.standard')}</option>
                  <option value="hd">{t('quality.hd')}</option>
                  <option value="ultra">{t('quality.ultra')}</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ocr' && (
          <div className="config-section">
            <h3><ScanText size={18} /> {t('config.ocr.title')}</h3>
            <div className="toggle-group">
              <div className="toggle-item">
                <div className="toggle-info"><strong>{t('config.autoExtract')}</strong><p>{t('config.autoExtract.desc')}</p></div>
                <label className="switch"><input type="checkbox" checked={config.ocr_auto_extract} onChange={e => updateConfig('ocr_auto_extract', e.target.checked)} /><span className="slider" /></label>
              </div>
            </div>
            <div className="form-group" style={{ marginTop: 16 }}>
              <label>{t('config.defaultLang')}</label>
              <select value={config.ocr_default_language} onChange={e => updateConfig('ocr_default_language', e.target.value)}>
                <option value="de">Deutsch</option>
                <option value="en">English</option>
                <option value="fr">Fran\u00e7ais</option>
                <option value="es">Espa\u00f1ol</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'obsidian' && (
          <div className="config-section">
            <h3><BookOpen size={18} /> {t('config.obsidian.title')}</h3>
            <div className="form-group">
              <label>{t('config.vaultPath')}</label>
              <input type="text" value={config.obsidian_vault_path} onChange={e => updateConfig('obsidian_vault_path', e.target.value)} placeholder="/vault/obsidian" />
            </div>
            <div className="form-group" style={{ marginTop: 16 }}>
              <label>{t('config.apiUrl')}</label>
              <input type="url" value={config.obsidian_api_url} onChange={e => updateConfig('obsidian_api_url', e.target.value)} placeholder="http://localhost:8090" />
            </div>
            <div className="info-box">
              <p>{t('config.obsidian.info')}</p>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="config-section config-section-logs">
            <h3><ScrollText size={18} /> {t('config.logs.title')}</h3>
            <p className="view-sub" style={{ marginBottom: 16 }}>{t('config.logs.desc')}</p>
            <LoggingPanel />
          </div>
        )}
      </div>
    </section>
  )
}
