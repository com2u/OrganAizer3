import { useCallback, useEffect, useRef, useState } from 'react'
import { useTheme } from '../ThemeContext'
import { Phone, PhoneOff, Mic, MicOff, AlertTriangle, Loader2 } from 'lucide-react'
import {
  Room, RoomEvent, Track, createAudioAnalyser,
  type RemoteTrack, type RemoteAudioTrack, type LocalAudioTrack,
  type AudioAnalyserOptions,
} from 'livekit-client'
import { fetchWebToken } from '../api'

type Status = 'idle' | 'connecting' | 'live' | 'error'

interface Analyser {
  calculateVolume: () => number
  cleanup: () => Promise<void>
}

/**
 * Browser voice dialog with the OrganAIzer assistant (LiveKit realtime session).
 * Mirrors the former VoiceClient web client, restyled to the OrganAIzer design,
 * and keeps the live input/output level meters the user asked for.
 */
export default function DialogView() {
  const { t } = useTheme()
  const [status, setStatus] = useState<Status>('idle')
  const [statusText, setStatusText] = useState('')
  const [error, setError] = useState('')
  const [voiceMode, setVoiceMode] = useState(true)
  const [userLevel, setUserLevel] = useState(0)
  const [agentLevel, setAgentLevel] = useState(0)
  const [log, setLog] = useState<string[]>([])

  const roomRef = useRef<Room | null>(null)
  const userAnalyserRef = useRef<Analyser | null>(null)
  const agentAnalyserRef = useRef<Analyser | null>(null)
  const rafRef = useRef<number | null>(null)
  const agentAudioRef = useRef<HTMLAudioElement | null>(null)

  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString()
    setLog((prev) => [...prev.slice(-80), `[${time}] ${msg}`])
  }, [])

  const stopMeters = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    userAnalyserRef.current?.cleanup?.()
    agentAnalyserRef.current?.cleanup?.()
    userAnalyserRef.current = null
    agentAnalyserRef.current = null
    setUserLevel(0)
    setAgentLevel(0)
  }, [])

  const startMeters = useCallback(() => {
    const update = () => {
      if (userAnalyserRef.current) {
        setUserLevel(Math.min(100, userAnalyserRef.current.calculateVolume() * 140))
      }
      if (agentAnalyserRef.current) {
        setAgentLevel(Math.min(100, agentAnalyserRef.current.calculateVolume() * 140))
      }
      rafRef.current = requestAnimationFrame(update)
    }
    update()
  }, [])

  const teardown = useCallback(() => {
    stopMeters()
    if (roomRef.current) {
      roomRef.current.removeAllListeners()
      roomRef.current = null
    }
    setStatus('idle')
    setStatusText(t('dialog.notConnected'))
    setVoiceMode(true)
  }, [stopMeters, t])

  const disconnect = useCallback(async () => {
    addLog(t('dialog.ending'))
    if (roomRef.current) await roomRef.current.disconnect()
    teardown()
  }, [addLog, t, teardown])

  const connect = useCallback(async () => {
    setError('')
    setStatus('connecting')
    setStatusText(t('dialog.connecting'))
    addLog(t('dialog.requestingToken'))
    try {
      const { token, url, room: roomName } = await fetchWebToken()
      addLog(t('dialog.joining').replace('{room}', roomName))

      const analyserOpts: AudioAnalyserOptions = { cloneTrack: true }
      const room = new Room()
      roomRef.current = room

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Audio) {
          if (agentAudioRef.current) track.attach(agentAudioRef.current)
          agentAnalyserRef.current = createAudioAnalyser(track as RemoteAudioTrack, analyserOpts) as unknown as Analyser
          addLog(t('dialog.assistantConnected'))
        }
      })
      room.on(RoomEvent.Disconnected, () => {
        addLog(t('dialog.sessionEnded'))
        teardown()
      })

      await room.connect(url, token)
      setStatus('live')
      setStatusText(t('dialog.connected'))
      addLog(t('dialog.enablingMic'))

      await room.localParticipant.setMicrophoneEnabled(true)
      const micPub = room.localParticipant.getTrackPublication(Track.Source.Microphone)
      if (micPub?.track) {
        userAnalyserRef.current = createAudioAnalyser(micPub.track as LocalAudioTrack, analyserOpts) as unknown as Analyser
      }
      setVoiceMode(true)
      startMeters()
      addLog(t('dialog.active'))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      setStatus('error')
      setStatusText(t('dialog.failed'))
      addLog(`Error: ${msg}`)
      await disconnect().catch(() => {})
    }
  }, [addLog, disconnect, startMeters, t, teardown])

  const toggleMode = useCallback(async () => {
    const room = roomRef.current
    if (!room) return
    const next = !voiceMode
    setVoiceMode(next)
    await room.localParticipant.setMicrophoneEnabled(next)
    addLog(next ? t('dialog.micLive') : t('dialog.micMuted'))
  }, [voiceMode, addLog, t])

  useEffect(() => () => { if (roomRef.current) roomRef.current.disconnect() }, [])

  const connected = status === 'live'

  return (
    <div className="dialog-wrapper">
      <h3>{t('dialog.title')}</h3>
      <p className="view-sub">{t('dialog.sub')}</p>

      {error && <div className="telefonie-alert error"><AlertTriangle size={16} /> {error}</div>}

      <div className="dialog-card">
        <div className="dialog-status">
          <span className={`dialog-dot dialog-dot--${status}`} />
          <span>{statusText || t('dialog.notConnected')}</span>
          {connected && (
            <button className={`dialog-mode ${voiceMode ? '' : 'muted'}`} onClick={toggleMode}>
              {voiceMode ? <Mic size={14} /> : <MicOff size={14} />}
              {voiceMode ? t('dialog.voice') : t('dialog.muted')}
            </button>
          )}
        </div>

        <div className="dialog-levels">
          <div className="dialog-level">
            <label>{t('dialog.you')}</label>
            <div className="dialog-meter">
              <div className="dialog-meter-fill dialog-meter-fill--user" style={{ width: `${userLevel}%` }} />
            </div>
          </div>
          <div className="dialog-level">
            <label>{t('dialog.assistant')}</label>
            <div className="dialog-meter">
              <div className="dialog-meter-fill dialog-meter-fill--agent" style={{ width: `${agentLevel}%` }} />
            </div>
          </div>
        </div>

        <button
          className={`primary-btn dialog-call ${connected ? 'dialog-call--end' : ''}`}
          onClick={() => (connected ? disconnect() : connect())}
          disabled={status === 'connecting'}
        >
          {status === 'connecting'
            ? <><Loader2 size={16} className="spin" /> {t('dialog.connecting')}</>
            : connected
              ? <><PhoneOff size={16} /> {t('dialog.end')}</>
              : <><Phone size={16} /> {t('dialog.start')}</>}
        </button>

        <pre className="dialog-log">{log.join('\n')}</pre>
      </div>

      <audio ref={agentAudioRef} autoPlay />
    </div>
  )
}
