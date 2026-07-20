import { useState } from 'react'
import { useTheme } from '../ThemeContext'
import { Calendar, CheckSquare, Cable, Mic, ArrowRight, Layers, GitBranch, Play, Sun, Moon, Globe } from 'lucide-react'
import ProductPreview from './ProductPreview'
import InterestModal from './InterestModal'

interface LandingPageProps {
  onGoToLogin: () => void
}

export default function LandingPage({ onGoToLogin }: LandingPageProps) {
  const { t, theme, setTheme, lang, setLang } = useTheme()
  const [interestOpen, setInterestOpen] = useState(false)

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

      {/* ===== Bento Story ===== */}
      <section className="landing-bento">
        <div className="landing-bento-grid">
          <div className="bento-cell large">
            <div className="bento-icon"><Calendar size={22} /></div>
            <h3>{t('landing.bento.calendar.title')}</h3>
            <p>{t('landing.bento.calendar.desc')}</p>
          </div>
          <div className="bento-cell">
            <div className="bento-icon"><CheckSquare size={22} /></div>
            <h3>{t('landing.bento.tasks.title')}</h3>
            <p>{t('landing.bento.tasks.desc')}</p>
          </div>
          <div className="bento-cell">
            <div className="bento-icon"><Cable size={22} /></div>
            <h3>{t('landing.bento.ai.title')}</h3>
            <p>{t('landing.bento.ai.desc')}</p>
          </div>
          <div className="bento-cell wide">
            <div className="bento-icon"><Mic size={22} /></div>
            <h3>{t('landing.bento.speech.title')}</h3>
            <p>{t('landing.bento.speech.desc')}</p>
          </div>
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
    </div>
  )
}
