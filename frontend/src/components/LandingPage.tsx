import { useState } from 'react'
import { useTheme } from '../ThemeContext'
import {
  ArrowRight, Layers, GitBranch, Play, Sun, Moon, Globe,
  CalendarClock, Bot, ListTodo, AudioLines, BookOpen, PhoneCall,
  Blocks, BrainCircuit, ShieldCheck, Building2,
} from 'lucide-react'
import ProductPreview from './ProductPreview'
import InterestModal from './InterestModal'
import FeatureModal, { FeatureDef } from './FeatureModal'

interface LandingPageProps {
  onGoToLogin: () => void
}

const FEATURES: FeatureDef[] = [
  { id: 'planning',    icon: CalendarClock, wide: true },
  { id: 'hermes',      icon: Bot,           wide: true },
  { id: 'tasks',       icon: ListTodo },
  { id: 'speech',      icon: AudioLines },
  { id: 'knowledge',   icon: BookOpen },
  { id: 'ai',          icon: BrainCircuit },
  { id: 'telephony',   icon: PhoneCall,     wide: true },
  { id: 'connections', icon: Blocks,        wide: true },
  { id: 'privacy',     icon: ShieldCheck,   wide: true },
  { id: 'about',       icon: Building2,     wide: true },
]

export default function LandingPage({ onGoToLogin }: LandingPageProps) {
  const { t, theme, setTheme, lang, setLang } = useTheme()
  const [interestOpen, setInterestOpen] = useState(false)
  const [selectedFeature, setSelectedFeature] = useState<FeatureDef | null>(null)

  return (
    <div className="landing">
      {/* ===== Header ===== */}
      <header className="landing-header">
        <div className="landing-header-inner">
          <div className="landing-header-brand">
            <img src="/organaizer.png" alt="OrganAIzer" className="brand-mark" />
            <strong>OrganAIzer</strong>
          </div>
          <div className="landing-header-actions">
            <button
              type="button"
              className="landing-icon-btn"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={theme === 'dark' ? t('config.theme.light') : t('config.theme.dark')}
              title={theme === 'dark' ? t('config.theme.light') : t('config.theme.dark')}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              type="button"
              className="landing-icon-btn"
              onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
              aria-label={lang === 'de' ? 'English' : 'Deutsch'}
              title={lang === 'de' ? 'English' : 'Deutsch'}
            >
              <Globe size={16} />
              <span className="landing-lang-label">{lang === 'de' ? 'EN' : 'DE'}</span>
            </button>
            <button type="button" className="landing-btn secondary" onClick={onGoToLogin}>
              {t('landing.cta.login')}
            </button>
            <button type="button" className="landing-btn primary" onClick={() => setInterestOpen(true)}>
              {t('landing.cta.interest')}
            </button>
          </div>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-hero-text">
            <span className="landing-eyebrow">{t('landing.eyebrow')}</span>
            <h1 className="landing-headline">{t('landing.headline')}</h1>
            <p className="landing-sub">{t('landing.sub')}</p>
            <div className="landing-hero-ctas">
              <button type="button" className="landing-btn primary large" onClick={onGoToLogin}>
                {t('landing.cta.login')}
                <ArrowRight size={16} />
              </button>
              <button type="button" className="landing-btn secondary large" onClick={() => setInterestOpen(true)}>
                {t('landing.cta.interest')}
              </button>
            </div>
          </div>
          <div className="landing-hero-preview">
            <ProductPreview />
          </div>
        </div>
      </section>

      {/* ===== Feature Bento ===== */}
      <section className="landing-bento">
        <div className="landing-bento-head">
          <h2>{t('landing.sections.title')}</h2>
          <p>{t('landing.sections.sub')}</p>
        </div>
        <div className="feature-bento-grid">
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <button
                type="button"
                key={f.id}
                className={`feature-cell${f.wide ? ' wide' : ''}`}
                style={{ animationDelay: `${0.04 * i}s` }}
                onClick={() => setSelectedFeature(f)}
                aria-label={t(`landing.feat.${f.id}.title`)}
              >
                <div className="feature-cell-icon"><Icon size={22} /></div>
                <div className="feature-cell-text">
                  <h3>{t(`landing.feat.${f.id}.title`)}</h3>
                  <p>{t(`landing.feat.${f.id}.short`)}</p>
                </div>
                <span className="feature-cell-more">
                  {t('landing.feat.more')} <ArrowRight size={13} />
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* ===== Workflow ===== */}
      <section className="landing-workflow">
        <h2>{t('landing.workflow.title')}</h2>
        <div className="workflow-steps">
          <div className="workflow-step">
            <div className="workflow-step-icon"><Layers size={20} /></div>
            <h3>{t('landing.workflow.step1.title')}</h3>
            <p>{t('landing.workflow.step1.desc')}</p>
          </div>
          <div className="workflow-connector" aria-hidden="true" />
          <div className="workflow-step">
            <div className="workflow-step-icon"><GitBranch size={20} /></div>
            <h3>{t('landing.workflow.step2.title')}</h3>
            <p>{t('landing.workflow.step2.desc')}</p>
          </div>
          <div className="workflow-connector" aria-hidden="true" />
          <div className="workflow-step">
            <div className="workflow-step-icon"><Play size={20} /></div>
            <h3>{t('landing.workflow.step3.title')}</h3>
            <p>{t('landing.workflow.step3.desc')}</p>
          </div>
        </div>
      </section>

      {/* ===== Principles ===== */}
      <section className="landing-principles">
        <h2>{t('landing.principles.title')}</h2>
        <div className="principles-list">
          <div className="principle">
            <h3>{t('landing.principles.p1.title')}</h3>
            <p>{t('landing.principles.p1.desc')}</p>
          </div>
          <div className="principle">
            <h3>{t('landing.principles.p2.title')}</h3>
            <p>{t('landing.principles.p2.desc')}</p>
          </div>
          <div className="principle">
            <h3>{t('landing.principles.p3.title')}</h3>
            <p>{t('landing.principles.p3.desc')}</p>
          </div>
        </div>
      </section>

      {/* ===== Final CTA ===== */}
      <section className="landing-final-cta">
        <h2>{t('landing.headline').split('\n')[0]}</h2>
        <div className="landing-hero-ctas">
          <button type="button" className="landing-btn primary large" onClick={onGoToLogin}>
            {t('landing.cta.login')}
            <ArrowRight size={16} />
          </button>
          <button type="button" className="landing-btn secondary large" onClick={() => setInterestOpen(true)}>
            {t('landing.cta.interest')}
          </button>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <span className="landing-footer-brand">
            <img src="/organaizer.png" alt="" className="brand-mark small" />
            OrganAIzer
          </span>
          <span className="landing-footer-auth">{t('landing.footer.auth')}</span>
        </div>
      </footer>

      <InterestModal open={interestOpen} onClose={() => setInterestOpen(false)} />
      {selectedFeature && (
        <FeatureModal feature={selectedFeature} onClose={() => setSelectedFeature(null)} />
      )}
    </div>
  )
}
