/**
 * Frontend structured logging system for OrganAIzer.
 *
 * Captures:
 * - API request/response events
 * - JavaScript errors (window.onerror, unhandledrejection)
 * - Custom application events
 *
 * Maintains an in-memory ring buffer observable from the Settings logging panel.
 * Sensitive data (tokens, passwords) is automatically redacted.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type LogSource = 'api' | 'app' | 'iframe' | 'error'

export interface LogEntry {
  id: number
  timestamp: string
  level: LogLevel
  source: LogSource
  message: string
  details?: Record<string, unknown>
}

const MAX_ENTRIES = 300
let _nextId = 1
let _entries: LogEntry[] = []
let _listeners: Array<() => void> = []

// Redaction patterns
const REDACT_KEYS = /password|token|secret|authorization|cookie|api_key/i

function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (REDACT_KEYS.test(key)) {
      result[key] = '***redacted***'
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = redactObject(value as Record<string, unknown>)
    } else {
      result[key] = value
    }
  }
  return result
}

function addEntry(level: LogLevel, source: LogSource, message: string, details?: Record<string, unknown>) {
  const entry: LogEntry = {
    id: _nextId++,
    timestamp: new Date().toISOString(),
    level,
    source,
    message,
    details: details ? redactObject(details) : undefined,
  }
  _entries.push(entry)
  if (_entries.length > MAX_ENTRIES) {
    _entries = _entries.slice(-MAX_ENTRIES)
  }
  // Notify subscribers
  _listeners.forEach(fn => fn())
  // Console output (safe, no sensitive data)
  const consoleFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.debug
  consoleFn(`[OrganAIzer:${source}] ${message}`, details ? redactObject(details) : '')
}

/** Subscribe to log updates. Returns unsubscribe function. */
export function subscribe(listener: () => void): () => void {
  _listeners.push(listener)
  return () => {
    _listeners = _listeners.filter(l => l !== listener)
  }
}

/** Get all current log entries. */
export function getEntries(): LogEntry[] {
  return [..._entries]
}

/** Clear all log entries. */
export function clearEntries(): void {
  _entries = []
  _nextId = 1
  _listeners.forEach(fn => fn())
}

/** Log an API request/response. */
export function logApi(method: string, path: string, status: number, durationMs: number, extra?: Record<string, unknown>) {
  const level: LogLevel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'
  addEntry(level, 'api', `${method} ${path} -> ${status} (${durationMs.toFixed(0)}ms)`, {
    method, path, status, duration_ms: durationMs, ...extra,
  })
}

/** Log an application event. */
export function logApp(level: LogLevel, message: string, details?: Record<string, unknown>) {
  addEntry(level, 'app', message, details)
}

/** Log an iframe event. */
export function logIframe(level: LogLevel, message: string, details?: Record<string, unknown>) {
  addEntry(level, 'iframe', message, details)
}

/** Log an error. */
export function logError(message: string, details?: Record<string, unknown>) {
  addEntry('error', 'error', message, details)
}

/**
 * Install global error handlers.
 * Call once at app startup.
 */
export function installGlobalErrorHandlers(): void {
  window.addEventListener('error', (event) => {
    logError(`Uncaught: ${event.message}`, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason instanceof Error ? event.reason.message : String(event.reason)
    logError(`Unhandled rejection: ${reason}`)
  })

  logApp('info', 'Frontend logging initialized')
}
