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
            if (file) handleImport(file)
          }}
          disabled={importing}
        />
      </label>
      <button className="btn btn-export" onClick={handleExport} disabled={exporting}>
        <Download size={14} />
        {exporting ? t('termine.exporting') : t('termine.export')}
      </button>
      {error && <span className="error">{error}</span>}
    </div>
  )
}
