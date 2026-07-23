import { useState } from 'react'
import { importExcel, exportExcel } from '../api'
import { useTheme } from '../ThemeContext'
import { Upload, Download } from 'lucide-react'

interface ImportExportProps {
  onImportSuccess: () => void
}

export default function ImportExport({ onImportSuccess }: ImportExportProps) {
  const { t } = useTheme()
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const handleImport = async (file: File) => {
    setImporting(true)
    setError(null)
    try {
      await importExcel(file)
      onImportSuccess()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setImporting(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    setError(null)
    try {
      await exportExcel()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="import-export">
      <label className="btn btn-import">
        <Upload size={14} />
        {importing ? t('termine.importing') : t('termine.import')}
        <input
          type="file"
          accept=".xlsx"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) setPendingFile(file)
            e.target.value = ''
          }}
          disabled={importing}
        />
      </label>
      <button className="btn btn-export" onClick={handleExport} disabled={exporting}>
        <Download size={14} />
        {exporting ? t('termine.exporting') : t('termine.export')}
      </button>
      {error && <span className="error">{error}</span>}
      {pendingFile && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="import-confirm-title">
          <div className="modal-content">
            <h2 id="import-confirm-title">Bestehende Daten überschreiben?</h2>
            <p>
              Der Import von <strong>{pendingFile.name}</strong> löscht alle bestehenden Termine,
              Stammdaten und Planungsregeln und ersetzt sie durch den Inhalt der Excel-Datei.
            </p>
            <div className="form-actions">
              <button className="btn btn-danger" onClick={() => {
                const file = pendingFile
                setPendingFile(null)
                void handleImport(file)
              }}>Alle Daten löschen und importieren</button>
              <button className="btn btn-ghost" onClick={() => setPendingFile(null)}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
