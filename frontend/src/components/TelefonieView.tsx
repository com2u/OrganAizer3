import { useEffect, useState, useRef } from 'react'
import { useTheme } from '../ThemeContext'
import {
  Phone, PhoneOff, Settings, MessageSquare, List,
  Send, AlertTriangle, CheckCircle, Info, Loader2
} from 'lucide-react'
import {
  fetchSipConfig, saveSipConfig, fetchCalls, fetchCallDetail,
  startCall, endCall, sendVoiceMessage
} from '../api'
import type { SipConfig, SipMode, Call, CallDetail, DialogEntry } from '../types'

type Tab = 'config' | 'voice' | 'history'

export default function TelefonieView() {
  const { t } = useTheme()
  const [tab, setTab] = useState<Tab>('config')

  return (
    <section className="view telefonie-view">
      <header className="view-header">
        <div>
          <span className="eyebrow">{t('telefonie.eyebrow')}</span>
          <h1>{t('telefonie.title')}</h1>
          <p className="subtitle">{t('telefonie.sub')}</p>
        </div>
      </header>

      <div className="tab-bar">
        <button
          className={`tab-btn ${tab === 'config' ? 'active' : ''}`}
          onClick={() => setTab('config')}
        >
          <Settings size={16} />
          {t('telefonie.tab.config')}
        </button>
        <button
          className={`tab-btn ${tab === 'voice' ? 'active' : ''}`}
          onClick={() => setTab('voice')}
        >
          <MessageSquare size={16} />
          {t('telefonie.tab.voice')}
        </button>
        <button
          className={`tab-btn ${tab === 'history' ? 'active' : ''}`}
          onClick={() => setTab('history')}
        >
          <List size={16} />
          {t('telefonie.tab.history')}
        </button>
      </div>

      {tab === 'config' && <GatewayConfig t={t} />}
      {tab === 'voice' && <VoiceAssistant t={t} />}
      {tab === 'history' && <CallHistory t={t} />}
    </section>
  )
}

// ===== Gateway Configuration Tab =====

function GatewayConfig({ t }: { t: (k: string) => string }) {
  const [config, setConfig] = useState<SipConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    fetchSipConfig()
      .then(setConfig)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const payload: Record<string, unknown> = { ...config }
      if (password) payload.sip_password = password
      delete payload.has_password
      delete payload.updated_at
      const updated = await saveSipConfig(payload as never)
      setConfig(updated)
      setPassword('')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="empty-state"><Loader2 size={24} className="spin" /> {t('loading')}</div>

  if (!config) return <div className="empty-state">{error || t('telefonie.configError')}</div>

  return (
    <div className="telefonie-config">
      {error && <div className="telefonie-alert error"><AlertTriangle size={16} /> {error}</div>}
      {saved && <div className="telefonie-alert success"><CheckCircle size={16} /> {t('config.saved')}</div>}

      {config.mode === 'demo' && (
        <div className="telefonie-alert info">
          <Info size={16} /> {t('telefonie.demoNotice')}
        </div>
      )}

      <div className="form-group">
        <label>{t('telefonie.mode')}</label>
        <select
          className="form-field"
          value={config.mode}
          onChange={(e) => setConfig({ ...config, mode: e.target.value as SipMode })}
        >
          <option value="disabled">{t('telefonie.mode.disabled')}</option>
          <option value="demo">{t('telefonie.mode.demo')}</option>
          <option value="webhook">{t('telefonie.mode.webhook')}</option>
          <option value="sipjs">{t('telefonie.mode.sipjs')}</option>
        </select>
      </div>

      {(config.mode === 'sipjs' || config.mode === 'webhook') && (
        <>
          <div className="form-group">
            <label>{t('telefonie.sipServer')}</label>
            <input
              className="form-field"
              value={config.sip_server}
              onChange={(e) => setConfig({ ...config, sip_server: e.target.value })}
              placeholder="sip.example.com"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{t('telefonie.sipPort')}</label>
              <input
                className="form-field"
                type="number"
                value={config.sip_port}
                onChange={(e) => setConfig({ ...config, sip_port: parseInt(e.target.value) || 5060 })}
              />
            </div>
            <div className="form-group">
              <label>{t('telefonie.sipTransport')}</label>
              <select
                className="form-field"
                value={config.sip_transport}
                onChange={(e) => setConfig({ ...config, sip_transport: e.target.value })}
              >
                <option value="wss">WSS</option>
                <option value="ws">WS</option>
                <option value="udp">UDP</option>
                <option value="tcp">TCP</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>{t('telefonie.sipUsername')}</label>
            <input
              className="form-field"
              value={config.sip_username}
              onChange={(e) => setConfig({ ...config, sip_username: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>
              {t('telefonie.sipPassword')}
              {config.has_password && <small className="tag"> {t('telefonie.passwordSet')}</small>}
            </label>
            <input
              className="form-field"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={config.has_password ? '••••••••' : ''}
            />
          </div>
          <div className="form-group">
            <label>{t('telefonie.stunServer')}</label>
            <input
              className="form-field"
              value={config.stun_server}
              onChange={(e) => setConfig({ ...config, stun_server: e.target.value })}
              placeholder="stun:stun.l.google.com:19302"
            />
          </div>
        </>
      )}

      {config.mode === 'webhook' && (
        <div className="form-group">
          <label>{t('telefonie.webhookUrl')}</label>
          <input
            className="form-field"
            value={config.webhook_url}
            onChange={(e) => setConfig({ ...config, webhook_url: e.target.value })}
            placeholder="https://your-pbx.example.com/api/call"
          />
        </div>
      )}

      <button className="btn-primary" onClick={handleSave} disabled={saving}>
        {saving ? t('config.saving') : t('config.save')}
      </button>
    </div>
  )
}

// ===== Voice Assistant Tab =====

function VoiceAssistant({ t }: { t: (k: string) => string }) {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<{ role: string; content: string; time: string }[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!message.trim() || sending) return
    const text = message.trim()
    setMessage('')
    const now = new Date().toLocaleTimeString()
    setMessages((prev) => [...prev, { role: 'user', content: text, time: now }])
    setSending(true)
    setError('')
    try {
      const resp = await sendVoiceMessage(text)
      const reply = resp.reply || resp.error || ''
      const replyTime = new Date().toLocaleTimeString()
      setMessages((prev) => [...prev, { role: 'assistant', content: reply, time: replyTime }])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      setMessages((prev) => [...prev, { role: 'system', content: msg, time: new Date().toLocaleTimeString() }])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="telefonie-voice">
      {error && <div className="telefonie-alert error"><AlertTriangle size={16} /> {error}</div>}

      <div className="voice-chat" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="empty-state">
            <Phone size={32} />
            <p>{t('telefonie.voiceEmpty')}</p>
            <small>{t('telefonie.voiceHint')}</small>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`voice-msg voice-msg--${msg.role}`}>
            <div className="voice-msg-header">
              <span className="voice-msg-role">
                {msg.role === 'user' ? t('telefonie.role.user') :
                  msg.role === 'assistant' ? t('telefonie.role.assistant') :
                    t('telefonie.role.system')}
              </span>
              <span className="voice-msg-time">{msg.time}</span>
            </div>
            <div className="voice-msg-content">{msg.content}</div>
          </div>
        ))}
        {sending && (
          <div className="voice-msg voice-msg--system">
            <Loader2 size={16} className="spin" /> {t('telefonie.thinking')}
          </div>
        )}
      </div>

      <div className="voice-input">
        <input
          className="form-field"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={t('telefonie.voicePlaceholder')}
          disabled={sending}
        />
        <button className="btn-primary" onClick={handleSend} disabled={sending || !message.trim()}>
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}

// ===== Call History Tab =====

function CallHistory({ t }: { t: (k: string) => string }) {
  const [calls, setCalls] = useState<Call[]>([])
  const [selected, setSelected] = useState<CallDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [calling, setCalling] = useState(false)
  const [callNumber, setCallNumber] = useState('')

  useEffect(() => {
    loadCalls()
  }, [])

  const loadCalls = async () => {
    setLoading(true)
    try {
      const data = await fetchCalls()
      setCalls(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = async (call: Call) => {
    try {
      const detail = await fetchCallDetail(call.id)
      setSelected(detail)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const handleStartCall = async () => {
    if (!callNumber.trim()) return
    setCalling(true)
    setError('')
    try {
      await startCall(callNumber.trim())
      setCallNumber('')
      await loadCalls()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setCalling(false)
    }
  }

  const handleEndCall = async (callId: number) => {
    try {
      await endCall(callId)
      await loadCalls()
      if (selected?.id === callId) {
        const detail = await fetchCallDetail(callId)
        setSelected(detail)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="telefonie-history">
      {error && <div className="telefonie-alert error"><AlertTriangle size={16} /> {error}</div>}

      <div className="call-actions">
        <input
          className="form-field"
          value={callNumber}
          onChange={(e) => setCallNumber(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleStartCall()}
          placeholder={t('telefonie.callPlaceholder')}
        />
        <button className="btn-primary" onClick={handleStartCall} disabled={calling || !callNumber.trim()}>
          <Phone size={16} /> {calling ? t('telefonie.calling') : t('telefonie.startCall')}
        </button>
      </div>

      <div className="call-layout">
        <div className="call-list">
          <h3>{t('telefonie.callList')}</h3>
          {loading && <div className="empty-state"><Loader2 size={20} className="spin" /></div>}
          {!loading && calls.length === 0 && (
            <div className="empty-state">
              <Phone size={24} />
              <p>{t('telefonie.noCalls')}</p>
            </div>
          )}
          {calls.map((call) => (
            <div
              key={call.id}
              className={`call-item ${selected?.id === call.id ? 'active' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => handleSelect(call)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(call) } }}
            >
              <div className="call-item-main">
                <span className={`call-direction ${call.direction}`}>
                  {call.direction === 'inbound' ? '←' : '→'}
                </span>
                <span className="call-number">{call.remote_number || t('telefonie.unknown')}</span>
                <span className={`tag call-status--${call.status}`}>{call.status}</span>
              </div>
              <div className="call-item-meta">
                <span>{new Date(call.started_at).toLocaleString()}</span>
                {call.duration_seconds != null && (
                  <span>{call.duration_seconds}s</span>
                )}
              </div>
              {call.status !== 'ended' && call.status !== 'demo' && (
                <button
                  className="btn-ghost call-end-btn"
                  onClick={(e) => { e.stopPropagation(); handleEndCall(call.id) }}
                  title={t('telefonie.endCall')}
                >
                  <PhoneOff size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="call-detail">
          {!selected ? (
            <div className="empty-state">
              <MessageSquare size={24} />
              <p>{t('telefonie.selectCall')}</p>
            </div>
          ) : (
            <>
              <h3>{t('telefonie.dialogLog')}</h3>
              <div className="call-detail-meta">
                <span>{t('telefonie.direction')}: {selected.direction}</span>
                <span>{t('telefonie.status')}: {selected.status}</span>
                <span>{t('telefonie.started')}: {new Date(selected.started_at).toLocaleString()}</span>
                {selected.ended_at && (
                  <span>{t('telefonie.ended')}: {new Date(selected.ended_at).toLocaleString()}</span>
                )}
              </div>
              <div className="dialog-entries">
                {selected.dialog.length === 0 && (
                  <div className="empty-state"><p>{t('telefonie.noDialog')}</p></div>
                )}
                {selected.dialog.map((entry: DialogEntry) => (
                  <div key={entry.id} className={`dialog-entry dialog-entry--${entry.role}`}>
                    <div className="dialog-entry-header">
                      <span className={`dialog-role dialog-role--${entry.role}`}>
                        {entry.role === 'user' ? t('telefonie.role.user') :
                          entry.role === 'assistant' ? t('telefonie.role.assistant') :
                            t('telefonie.role.system')}
                      </span>
                      <span className="dialog-time">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                      {entry.status !== 'ok' && <span className={`tag tag--${entry.status}`}>{entry.status}</span>}
                    </div>
                    <div className="dialog-content">{entry.content}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
