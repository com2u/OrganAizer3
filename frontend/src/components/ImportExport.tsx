import { useState } from 'react'
import { importExcel, exportExcel, validateExcelImport, ImportIssue } from '../api'
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
  const [issues, setIssues] = useState<ImportIssue[]>([])
  const [validating, setValidating] = useState(false)

  const handleImport = async (file: File, confirmInvalid = false) => {
    setImporting(true)
    setError(null)
    try {
      await importExcel(file, confirmInvalid)
      onImportSuccess()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setImporting(false)
    }
  }

  const prepareImport = async (file: File) => {
    setValidating(true)
    setError(null)
    try {
      const validation = await validateExcelImport(file)
      setIssues(validation.issues || [])
      setPendingFile(file)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setValidating(false)
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
        {importing || validating ? t('termine.importing') : t('termine.import')}
        <input
          type="file"
          accept=".xlsx"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void prepareImport(file)
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
            {issues.length > 0 && (
              <div className="import-validation-issues">
                <h3>{issues.length} Referenz- oder Konsistenzprobleme gefunden</h3>
                <p>Ungültige Zuordnungen werden beim bestätigten Import ausgelassen. Prüfen Sie die Datei möglichst vor dem Fortfahren.</p>
                <ul>
                  {issues.map((issue, index) => (
                    <li key={index}><strong>{issue.sheet}{issue.row ? `, Zeile ${issue.row}` : ''}:</strong> {issue.message}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="form-actions">
              <button className="btn btn-danger" onClick={() => {
                const file = pendingFile
                setPendingFile(null)
                void handleImport(file, issues.length > 0)
              }}>{issues.length ? 'Trotz Problemen importieren' : 'Alle Daten löschen und importieren'}</button>
              <button className="btn btn-ghost" onClick={() => setPendingFile(null)}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
