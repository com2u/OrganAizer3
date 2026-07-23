import { useCallback, useEffect, useState } from 'react'
import { Activity, Cpu, HardDrive, Loader2, RefreshCw, Server } from 'lucide-react'
import { fetchSystemStatus } from '../api'
import type { SystemStatus } from '../types'

const bytes = (value: number) => `${(value / 1024 / 1024 / 1024).toFixed(1)} GB`

export default function SystemView() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setStatus(await fetchSystemStatus())
      setError('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => { void load() }, 15_000)
    return () => window.clearInterval(timer)
  }, [load])

  return (
    <section className="view system-view">
      <header className="view-header">
        <div><span className="eyebrow">MONITORING</span><h1>System</h1><p className="subtitle">Backend-Auslastung und Docker-Dienste</p></div>
        <button className="btn btn-ghost" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />} Aktualisieren
        </button>
      </header>
      {error && <div className="alert alert-error">{error}</div>}
      {status && (
        <div className="system-content">
          <div className="system-metrics">
            <article className="card system-metric"><Cpu /><span>CPU</span><strong>{status.cpu_percent.toFixed(1)} %</strong><div className="system-bar"><i style={{ width: `${status.cpu_percent}%` }} /></div></article>
            <article className="card system-metric"><Activity /><span>RAM</span><strong>{status.memory_percent.toFixed(1)} %</strong><small>{bytes(status.memory_used)} von {bytes(status.memory_total)}</small><div className="system-bar"><i style={{ width: `${status.memory_percent}%` }} /></div></article>
            <article className="card system-metric"><HardDrive /><span>Container</span><strong>{status.containers.filter(item => item.state === 'running').length} / {status.containers.length}</strong><small>gestartet</small></article>
          </div>
          <div className="card">
            <h3><Server size={18} /> Docker-Container</h3>
            {status.docker_error && <div className="alert alert-warning">{status.docker_error}</div>}
            <div className="system-container-list">
              {status.containers.map(container => (
                <article key={container.id}>
                  <span className={`container-state state-${container.state}`} />
                  <div><strong>{container.name}</strong><small>{container.image}</small></div>
                  <div className="container-status"><span>{container.state}</span><small>{container.status}</small></div>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
