import { TerminDetail } from '../types'
import { useTheme } from '../ThemeContext'
import { X } from 'lucide-react'

interface AppointmentDetailProps {
  detail: TerminDetail
  week: number
  onClose: () => void
}

export default function AppointmentDetail({ detail, week, onClose }: AppointmentDetailProps) {
  const { t } = useTheme()

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{t('termine.details')}</h2>
        <button className="close-btn" onClick={onClose}><X size={18} /></button>
        <div className="detail-grid">
          <div className="detail-row">
            <span className="detail-label">{t('termine.number')}</span>
            <span className="detail-value">{detail.bespr_nr}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('termine.name')}</span>
            <span className="detail-value">{detail.bezeichnung}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('termine.week')}</span>
            <span className="detail-value">{week}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('termine.duration')}</span>
            <span className="detail-value">{detail.dauer_min} min</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('termine.interval')}</span>
            <span className="detail-value">{detail.intervall} ({detail.intervall_bedeutung})</span>
          </div>
          <div className="detail-row full-width">
            <span className="detail-label">{t('termine.participants')}</span>
            <div className="detail-value participant-list">
              {detail.teilnehmer.map((tn, i) => (
                <div key={i} className="participant-item">
                  <span className="participant-code">{tn.usergruppe}</span>
                  <span className="participant-name">{tn.bezeichnung}{tn.name ? ` (${tn.name})` : ''}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
