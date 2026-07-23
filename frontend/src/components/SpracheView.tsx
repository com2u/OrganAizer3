import { useState, useRef, useCallback, useEffect } from 'react'
import { useTheme } from '../ThemeContext'
import { Volume2, Mic, MicOff, Play, Loader2, Download, Copy, Check, ArrowRight, FileText, MessagesSquare } from 'lucide-react'
import { fetchTTSAudio, generateTTS, transcribeAudio, transcribeBlob } from '../api'
import DialogView from './DialogView'

type SpracheTab = 'tts' | 'stt' | 'dictation' | 'dialog'
type DictationStatus = 'idle' | 'requesting' | 'recording' | 'stopping' | 'transcribing' | 'error'

export default function SpracheView() {
  const { t } = useTheme()
  const [activeTab, setActiveTab] = useState<SpracheTab>('tts')

  // TTS state
  const [ttsText, setTtsText] = useState('')
  const [ttsVoice, setTtsVoice] = useState('de-DE-KatjaNeural')
  const [ttsSpeed, setTtsSpeed] = useState('1.0')
  const [ttsDownloading, setTtsDownloading] = useState(false)
  const [ttsResult, setTtsResult] = useState<string | null>(null)
  const [ttsLevel, setTtsLevel] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const ttsAudioContextRef = useRef<AudioContext | null>(null)
  const ttsAnalyserRef = useRef<AnalyserNode | null>(null)
  const ttsAnimationRef = useRef<number | null>(null)

  // STT file state
  const [sttFile, setSttFile] = useState<File | null>(null)
  const [sttResult, setSttResult] = useState<string | null>(null)
  const [sttProcessing, setSttProcessing] = useState(false)

  // Dictation state
  const [dictStatus, setDictStatus] = useState<DictationStatus>('idle')
  const [dictError, setDictError] = useState<string | null>(null)
  const [dictResult, setDictResult] = useState<string | null>(null)
  const [dictLang, setDictLang] = useState('de')
  const [dictCopied, setDictCopied] = useState(false)
  const [sttCopied, setSttCopied] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const [dictLevel, setDictLevel] = useState(0)
  const dictAudioContextRef = useRef<AudioContext | null>(null)
  const dictAnimationRef = useRef<number | null>(null)

  const stopLevelAnimation = useCallback((kind: 'tts' | 'dictation') => {
    const ref = kind === 'tts' ? ttsAnimationRef : dictAnimationRef
    if (ref.current !== null) cancelAnimationFrame(ref.current)
    ref.current = null
    if (kind === 'tts') setTtsLevel(0)
    else setDictLevel(0)
  }, [])

  const animateLevel = useCallback((
    analyser: AnalyserNode,
    kind: 'tts' | 'dictation',
  ) => {
    const values = new Uint8Array(analyser.fftSize)
    const ref = kind === 'tts' ? ttsAnimationRef : dictAnimationRef
    const update = () => {
      analyser.getByteTimeDomainData(values)
      let sum = 0
      for (const value of values) {
        const normalized = (value - 128) / 128
        sum += normalized * normalized
      }
      const level = Math.min(100, Math.sqrt(sum / values.length) * 320)
      if (kind === 'tts') setTtsLevel(level)
      else setDictLevel(level)
      ref.current = requestAnimationFrame(update)
    }
    stopLevelAnimation(kind)
    update()
  }, [stopLevelAnimation])

  const startTtsMeter = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return
    let context = ttsAudioContextRef.current
    let analyser = ttsAnalyserRef.current
    if (!context || !analyser) {
      context = new AudioContext()
      analyser = context.createAnalyser()
      analyser.fftSize = 256
      context.createMediaElementSource(audio).connect(analyser)
      analyser.connect(context.destination)
      ttsAudioContextRef.current = context
      ttsAnalyserRef.current = analyser
    }
    if (context.state === 'suspended') await context.resume()
    animateLevel(analyser, 'tts')
  }, [animateLevel])

  const handleTTS = async () => {
    if (!ttsText.trim()) { alert(t('sprache.enterText')); return }
    setTtsDownloading(true)
    setTtsResult(null)
    try {
      const data = await generateTTS(ttsText, ttsVoice, ttsSpeed)
      if (!data.audio_url) throw new Error('Keine Audiodatei empfangen / No audio file received')
      const audioBlob = await fetchTTSAudio(data.audio_url)
      const audioUrl = URL.createObjectURL(audioBlob)
      setTtsResult(audioUrl)
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
    try {
      const data = await transcribeAudio(sttFile, 'de')
      setSttResult(data.text || null)
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : String(error))
    } finally {
      setSttProcessing(false)
    }
  }

  // Dictation handlers
  const startDictation = useCallback(async () => {
    setDictError(null)
    setDictResult(null)
    setDictStatus('requesting')
    chunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const context = new AudioContext()
      const analyser = context.createAnalyser()
      analyser.fftSize = 256
      context.createMediaStreamSource(stream).connect(analyser)
      dictAudioContextRef.current = context
      animateLevel(analyser, 'dictation')

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onerror = () => {
        setDictStatus('error')
        setDictError(t('dictation.recordError'))
        stopStream()
      }

      recorder.start(250) // collect in 250ms chunks
      setDictStatus('recording')
    } catch (err) {
      setDictStatus('error')
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setDictError(t('dictation.permissionDenied'))
      } else if (err instanceof DOMException && err.name === 'NotFoundError') {
        setDictError(t('dictation.noMicrophone'))
      } else {
        setDictError(t('dictation.startError'))
      }
    }
  }, [animateLevel, t])

  const stopStream = useCallback(() => {
    stopLevelAnimation('dictation')
    dictAudioContextRef.current?.close().catch(() => undefined)
    dictAudioContextRef.current = null
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }, [stopLevelAnimation])

  const stopDictation = useCallback(async () => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === 'inactive') return

    setDictStatus('stopping')

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve()
      recorder.stop()
    })

    stopStream()

    if (chunksRef.current.length === 0) {
      setDictStatus('error')
      setDictError(t('dictation.noAudio'))
      return
    }

    const blob = new Blob(chunksRef.current, { type: chunksRef.current[0].type })
    setDictStatus('transcribing')

    try {
      const data = await transcribeBlob(blob, dictLang)
      setDictResult(data.text || null)
      setDictStatus('idle')
    } catch (error: unknown) {
      setDictStatus('error')
      setDictError(error instanceof Error ? error.message : String(error))
    }
  }, [dictLang, stopStream, t])

  // Cleanup on unmount: stop any active recording/stream
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      stopLevelAnimation('tts')
      stopLevelAnimation('dictation')
      ttsAudioContextRef.current?.close().catch(() => undefined)
      dictAudioContextRef.current?.close().catch(() => undefined)
    }
  }, [stopLevelAnimation])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !ttsResult) return
    audio.load()
    if (localStorage.getItem('tts_auto_play') !== 'false') {
      audio.play().catch(() => undefined)
    }
    return () => {
      stopLevelAnimation('tts')
      ttsAudioContextRef.current?.close().catch(() => undefined)
      ttsAudioContextRef.current = null
      ttsAnalyserRef.current = null
      URL.revokeObjectURL(ttsResult)
    }
  }, [stopLevelAnimation, ttsResult])

  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
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
        <button className={`tab-btn ${activeTab === 'dictation' ? 'active' : ''}`} onClick={() => setActiveTab('dictation')}><MicOff size={14} /> {t('sprache.dictation')}</button>
        <button className={`tab-btn ${activeTab === 'dialog' ? 'active' : ''}`} onClick={() => setActiveTab('dialog')}><MessagesSquare size={14} /> {t('sprache.dialog')}</button>
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
                <optgroup label="Deutsch">
                  <option value="de-DE-KatjaNeural">Katja (Deutsch)</option>
                  <option value="de-DE-KillianNeural">Killian (Deutsch)</option>
                  <option value="de-DE-AmalaNeural">Amala (Deutsch)</option>
                  <option value="de-DE-ConradNeural">Conrad (Deutsch)</option>
                </optgroup>
                <optgroup label="English">
                  <option value="en-US-AvaNeural">Ava (English US)</option>
                  <option value="en-US-AndrewNeural">Andrew (English US)</option>
                  <option value="en-GB-SoniaNeural">Sonia (English UK)</option>
                  <option value="en-GB-RyanNeural">Ryan (English UK)</option>
                </optgroup>
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
              <audio
                ref={audioRef}
                controls
                src={ttsResult}
                onPlay={() => { void startTtsMeter() }}
                onPause={() => stopLevelAnimation('tts')}
                onEnded={() => stopLevelAnimation('tts')}
              />
              <div className="audio-level" role="meter" aria-label="Audiopegel" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ttsLevel)}>
                <span style={{ width: `${Math.max(2, ttsLevel)}%` }} />
              </div>
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
              <div className="result-actions">
                <button className="secondary-btn" onClick={() => copyToClipboard(sttResult, setSttCopied)}>
                  {sttCopied ? <><Check size={14} /> {t('copied')}</> : <><Copy size={14} /> {t('copy')}</>}
                </button>
                <button className="secondary-btn" onClick={() => { setTtsText(sttResult); setActiveTab('tts') }}>
                  <ArrowRight size={14} /> {t('dictation.toTTS')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'dictation' && (
        <div className="tts-wrapper">
          <h3>{t('dictation.title')}</h3>
          <p className="view-sub">{t('dictation.sub')}</p>

          <div className="form-row">
            <div className="form-group">
              <label>{t('dictation.language')}</label>
              <select value={dictLang} onChange={e => setDictLang(e.target.value)}>
                <option value="de">Deutsch</option>
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="es">Español</option>
              </select>
            </div>
          </div>

          <div className="dictation-controls">
            {dictStatus === 'idle' || dictStatus === 'error' ? (
              <button className="primary-btn dictation-start" onClick={startDictation}>
                <Mic size={18} /> {t('dictation.start')}
              </button>
            ) : dictStatus === 'requesting' ? (
              <button className="primary-btn" disabled>
                <Loader2 size={18} className="spin" /> {t('dictation.requesting')}
              </button>
            ) : dictStatus === 'recording' ? (
              <button className="primary-btn recording-btn" onClick={stopDictation}>
                <MicOff size={18} /> {t('dictation.stop')}
              </button>
            ) : dictStatus === 'stopping' || dictStatus === 'transcribing' ? (
              <button className="primary-btn" disabled>
                <Loader2 size={18} className="spin" /> {t('dictation.processing')}
              </button>
            ) : null}

            {dictStatus === 'recording' && (
              <>
                <span className="recording-indicator">
                  <span className="recording-dot" /> {t('dictation.recording')}
                </span>
                <div className="audio-level recording-level" role="meter" aria-label="Mikrofonpegel" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(dictLevel)}>
                  <span style={{ width: `${Math.max(2, dictLevel)}%` }} />
                </div>
              </>
            )}
          </div>

          {dictError && (
            <div className="error-box">
              <p>{dictError}</p>
            </div>
          )}

          {dictResult && (
            <div className="stt-result">
              <p>{t('dictation.resultTitle')}</p>
              <div className="transcription-text">{dictResult}</div>
              <div className="result-actions">
                <button className="secondary-btn" onClick={() => copyToClipboard(dictResult, setDictCopied)}>
                  {dictCopied ? <><Check size={14} /> {t('copied')}</> : <><Copy size={14} /> {t('copy')}</>}
                </button>
                <button className="secondary-btn" onClick={() => { setTtsText(dictResult); setActiveTab('tts') }}>
                  <Volume2 size={14} /> {t('dictation.toTTS')}
                </button>
                <button className="secondary-btn" onClick={() => {
                  // Store in sessionStorage for Tasks to pick up
                  sessionStorage.setItem('dictation_result', dictResult)
                  alert(t('dictation.savedForTask'))
                }}>
                  <FileText size={14} /> {t('dictation.toTask')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {activeTab === 'dialog' && (
        <div className="tts-wrapper">
          <DialogView />
        </div>
      )}
    </section>
  )
}
