import { useEffect, useState, useCallback } from 'react'
import { useTheme } from '../ThemeContext'
import { X, Check, Code2, Mail, User } from 'lucide-react'

// Icon type compatible with lucide-react components used across the app.
type IconType = typeof X

export interface FeatureDef {
  id: string
  icon: IconType
  /** grid emphasis: wide box spans two columns */
  wide?: boolean
}

interface FeatureModalProps {
  feature: FeatureDef
  onClose: () => void
}

export default function FeatureModal({ feature, onClose }: FeatureModalProps) {
  const { t } = useTheme()
  const [closing, setClosing] = useState(false)
  const Icon = feature.icon

  const handleClose = useCallback(() => {
    setClosing(true)
    window.setTimeout(onClose, 180)
  }, [onClose])

  // Escape to close + lock body scroll while open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [handleClose])

  const base = `landing.feat.${feature.id}`
  const detail = t(`${base}.detail`)
  const pointsRaw = t(`${base}.points`)
  const points =
    pointsRaw && pointsRaw !== `${base}.points`
      ? pointsRaw.split('\n').map(p => p.trim()).filter(Boolean)
      : []

  return (
    <div
      className={`feature-modal-overlay${closing ? ' closing' : ''}`}
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="feature-modal-title"
    >
      <div className={`feature-modal${closing ? ' closing' : ''}`}>
        <button type="button" className="feature-modal-close" onClick={handleClose} aria-label={t('landing.feat.close')}>
          <X size={18} />
        </button>

        <div className="feature-modal-head">
          <div className="feature-modal-icon"><Icon size={26} /></div>
          <div>
            <h2 id="feature-modal-title">{t(`${base}.title`)}</h2>
            <p className="feature-modal-tagline">{t(`${base}.short`)}</p>
          </div>
        </div>

        <div className="feature-modal-body">
          {feature.id === 'about' ? (
            <AboutContent />
          ) : (
            <>
              {detail && detail !== `${base}.detail` && <p className="feature-modal-detail">{detail}</p>}
              {points.length > 0 && (
                <ul className="feature-modal-points">
                  {points.map((p, i) => (
                    <li key={i}>
                      <span className="feature-point-check" aria-hidden="true"><Check size={14} /></span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function AboutContent() {
  const { t } = useTheme()
  return (
    <div className="about-content">
      <div className="about-founder">
        <div className="about-avatar" aria-hidden="true"><User size={22} /></div>
        <div>
          <strong className="about-name">{t('landing.feat.about.founder.name')}</strong>
          <span className="about-role">{t('landing.feat.about.founder.role')}</span>
        </div>
      </div>

      <div className="about-block">
        <h4>{t('landing.feat.about.background.label')}</h4>
        <p>{t('landing.feat.about.background')}</p>
      </div>
      <div className="about-block">
        <h4>{t('landing.feat.about.vision.label')}</h4>
        <p>{t('landing.feat.about.vision')}</p>
      </div>
      <div className="about-block">
        <h4>{t('landing.feat.about.project.label')}</h4>
        <p>{t('landing.feat.about.project')}</p>
        <p className="about-license">{t('landing.feat.about.license')}</p>
      </div>

      <div className="about-links">
        <a className="about-link" href="https://github.com/com2u/OrganAIzer" target="_blank" rel="noreferrer">
          <Code2 size={16} />
          <span>
            <strong>github.com/com2u/OrganAIzer</strong>
            <small>{t('landing.feat.about.github')}</small>
          </span>
        </a>
        <a className="about-link" href="mailto:info@organAIzer.app">
          <Mail size={16} />
          <span>
            <strong>info@organAIzer.app</strong>
            <small>{t('landing.feat.about.email')}</small>
          </span>
        </a>
      </div>
    </div>
  )
}
