import { useState } from 'react'
import { useTheme } from '../ThemeContext'
import { Volume2, Mic, Download, Play, Loader2 } from 'lucide-react'

export default function SpracheView() {
  const { t } = useTheme()
  const [activeTab, setActiveTab] = useState<'tts' | 'stt' | 'download'>('tts')
  const [ttsText, setTtsText] = useState('')
  const [ttsVoice, setTtsVoice] = useState('de_DE-AnnaNeural')
  const [ttsSpeed, setTtsSpeed] = useState('1.0')
  const [ttsDownloading, setTtsDownloading] = useState(false)
  const [ttsResult, setTtsResult] = useState<string | null>(null)

  const [sttFile, setSttFile] = useState<File | null>(null)
  const [sttResult, setSttResult] = useState<string | null>(null)
  const [sttProcessing, setSttProcessing] = useState(false)

  const [ytUrl, setYtUrl] = useState('')
  const [ytFormat, setYtFormat] = useState<'audio' | 'video'>('audio')
  const [ytDownloading, setYtDownloading] = useState(false)
  const [ytResult, setYtResult] = useState<string | null>(null)

  const handleTTS = async () => {
    if (!ttsText.trim()) { alert(t('sprache.enterText')); return }
    setTtsDownloading(true)
    setTtsResult(null)
    try {
      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: ttsText, voice: ttsVoice, speed: ttsSpeed }),
      })
      if (!response.ok) throw new Error('TTS failed')
      const data = await response.json()
      setTtsResult(data.audio_url)
      const autoPlay = localStorage.getItem('tts_auto_play') !== 'false'
      if (autoPlay && data.audio_url) {
        const audio = new Audio(data.audio_url)
        audio.play()
      }
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : String(error))
    } finally {
      setTtsDownloading(false)
    }
  }

  const handleSTT = async () => {
    if (!sttFile) { alert(t('sprache.selectAudio')); return }
    setSttProcessing(true)
    setSttResult(null)
    const formData = new FormData()
    formData.append('audio', sttFile)
    formData.append('language', 'de')
    try {
      const response = await fetch('/api/stt/transcribe', { method: 'POST', body: formData })
      if (!response.ok) throw new Error('STT failed')
      const data = await response.json()
      setSttResult(data.text)
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : String(error))
    } finally {
      setSttProcessing(false)
    }
  }

  const handleYTDownload = async () => {
    if (!ytUrl.trim()) { alert(t('sprache.enterUrl')); return }
    setYtDownloading(true)
    setYtResult(null)
    try {
      const response = await fetch('/api/youtube/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: ytUrl, format: ytFormat }),
      })
      if (!response.ok) throw new Error('Download failed')
      const data = await response.json()
      setYtResult(data.download_url)
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : String(error))
    } finally {
      setYtDownloading(false)
    }
  }

  return (
    <section className="view sprache-view">
      <header className="view-header">
        <div className="view-title">
          <h2>{t('sprache.title')}</h2>
          <p className="view-sub">{t('sprache.sub')}</p>
        </div>
      </header>

      <div className="sprache-tabs">
        <button className={`tab-btn ${activeTab === 'tts' ? 'active' : ''}`} onClick={() => setActiveTab('tts')}><Volume2 size={14} /> {t('sprache.tts')}</button>
        <button className={`tab-btn ${activeTab === 'stt' ? 'active' : ''}`} onClick={() => setActiveTab('stt')}><Mic size={14} /> {t('sprache.stt')}</button>
        <button className={`tab-btn ${activeTab === 'download' ? 'active' : ''}`} onClick={() => setActiveTab('download')}><Download size={14} /> {t('sprache.youtube')}</button>
      </div>

      {activeTab === 'tts' && (
        <div className="tts-wrapper">
          <h3>{t('sprache.tts.title')}</h3>
          <p className="view-sub">{t('sprache.tts.sub')}</p>
          <div className="form-group">
            <label>{t('sprache.text')}</label>
            <textarea value={ttsText} onChange={e => setTtsText(e.target.value)} placeholder={t('sprache.tts.placeholder')} rows={5} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{t('sprache.voice')}</label>
              <select value={ttsVoice} onChange={e => setTtsVoice(e.target.value)}>
                <option value="de_DE-AnnaNeural">Anna (DE)</option>
                <option value="de_DE-KillianNeural">Killian (DE)</option>
                <option value="en_US-JennyNeural">Jenny (EN)</option>
                <option value="en_GB-SoniaNeural">Sonia (EN)</option>
              </select>
            </div>
            <div className="form-group">
              <label>{t('sprache.speed')}</label>
              <select value={ttsSpeed} onChange={e => setTtsSpeed(e.target.value)}>
                <option value="0.5">0.5x ({t('speed.slow')})</option>
                <option value="0.75">0.75x</option>
                <option value="1.0">1.0x ({t('speed.normal')})</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x ({t('speed.fast')})</option>
              </select>
            </div>
          </div>
          <button className="primary-btn" onClick={handleTTS} disabled={ttsDownloading || !ttsText.trim()}>
            {ttsDownloading ? <><Loader2 size={14} /> {t('sprache.generating')}</> : <><Play size={14} /> {t('sprache.generate')}</>}
          </button>
          {ttsResult && (
            <div className="tts-result">
              <p>{t('sprache.audioSuccess')}</p>
              <audio controls src={ttsResult} autoPlay />
              <a href={ttsResult} download className="download-link"><Download size={14} /> {t('sprache.downloadAudio')}</a>
            </div>
          )}
        </div>
      )}

      {activeTab === 'stt' && (
        <div className="tts-wrapper">
          <h3>{t('sprache.stt.title')}</h3>
          <p className="view-sub">{t('sprache.stt.sub')}</p>
          <div className="form-group">
            <label>{t('sprache.audioFile')}</label>
            <input type="file" accept="audio/*" onChange={e => setSttFile(e.target?.files?.[0] || null)} />
          </div>
          <button className="primary-btn" onClick={handleSTT} disabled={sttProcessing || !sttFile}>
            {sttProcessing ? <><Loader2 size={14} /> {t('sprache.transcribing')}</> : <><Mic size={14} /> {t('sprache.transcribe')}</>}
          </button>
          {sttResult && (
            <div className="stt-result">
              <p>{t('sprache.transcriptionSuccess')}</p>
              <div className="transcription-text">{sttResult}</div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'download' && (
        <div className="tts-wrapper">
          <h3>{t('sprache.yt.title')}</h3>
          <p className="view-sub">{t('sprache.yt.sub')}</p>
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
          <button className="primary-btn" onClick={handleYTDownload} disabled={ytDownloading || !ytUrl.trim()}>
            {ytDownloading ? <><Loader2 size={14} /> {t('sprache.downloading')}</> : <><Download size={14} /> {t('sprache.download')}</>}
          </button>
          {ytResult && (
            <div className="yt-result">
              <p>{t('sprache.downloadReady')}</p>
              <a href={ytResult} download className="download-link"><Download size={14} /> {t('sprache.downloadFile')}</a>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
