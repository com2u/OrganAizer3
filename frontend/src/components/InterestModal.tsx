import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../ThemeContext'
import { X, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { submitAccessRequest } from '../api'

interface InterestModalProps {
  open: boolean
  onClose: () => void
}

type FormState = 'idle' | 'loading' | 'success' | 'error'

export default function InterestModal({ open, onClose }: InterestModalProps) {
  const { t } = useTheme()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)

  const [email, setEmail] = useState('')
  const [info, setInfo] = useState('')
  const [emailError, setEmailError] = useState('')
  const [infoError, setInfoError] = useState('')
  const [formState, setFormState] = useState<FormState>('idle')
  const [serverError, setServerError] = useState('')

  // Reset form when opening
  useEffect(() => {
    if (open) {
      setEmail('')
      setInfo('')
      setEmailError('')
      setInfoError('')
      setFormState('idle')
      setServerError('')
    }
  }, [open])

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    if (open && !el.open) {
      el.showModal()
      setTimeout(() => emailRef.current?.focus(), 50)
    } else if (!open && el.open) {
      el.close()
    }
  }, [open])

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    const handler = () => onClose()
    el.addEventListener('close', handler)
    return () => el.removeEventListener('close', handler)
  }, [onClose])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const MAX_INFO = 500

  const validate = (): boolean => {
    let valid = true
    const emailTrimmed = email.trim()
    // Basic email syntax check
    if (!emailTrimmed) {
      setEmailError(t('interest.error.emailRequired'))
      valid = false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setEmailError(t('interest.error.emailInvalid'))
      valid = false
    } else {
      setEmailError('')
    }

    const infoTrimmed = info.trim()
    if (!infoTrimmed) {
      setInfoError(t('interest.error.infoRequired'))
      valid = false
    } else if (infoTrimmed.length > MAX_INFO) {
      setInfoError(t('interest.error.infoTooLong'))
      valid = false
    } else {
      setInfoError('')
    }
    return valid
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!validate()) return
    setFormState('loading')
    setServerError('')
    try {
      await submitAccessRequest(email.trim(), info.trim())
      setFormState('success')
    } catch (err: unknown) {
      setFormState('error')
      setServerError(err instanceof Error ? err.message : t('interest.error.server'))
    }
  }

  if (!open) return null

  return (
    <dialog
      ref={dialogRef}
      className="interest-modal"
      aria-labelledby="interest-title"
      onClick={(e) => { if (e.target === dialogRef.current) onClose() }}
    >
      <div className="interest-modal-content">
        <button
          type="button"
          className="interest-close"
          onClick={onClose}
          aria-label={t('landing.interest.close')}
        >
          <X size={18} />
        </button>

        <h2 id="interest-title">{t('landing.interest.title')}</h2>

        {formState === 'success' ? (
          <div className="interest-success" role="status" aria-live="polite">
            <CheckCircle size={36} className="interest-success-icon" aria-hidden="true" />
            <p className="interest-success-msg">{t('interest.success.message')}</p>
            <p className="interest-success-hint">{t('interest.success.hint')}</p>
            <button type="button" className="interest-dismiss" onClick={onClose}>
              {t('landing.interest.close')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <p className="interest-desc">{t('interest.form.intro')}</p>

            <div className="interest-field">
              <label htmlFor="interest-email" className="interest-label">
                {t('interest.form.emailLabel')} *
              </label>
              <input
                ref={emailRef}
                id="interest-email"
                type="email"
                autoComplete="email"
                className={`interest-input${emailError ? ' interest-input--error' : ''}`}
                value={email}
                onChange={e => { setEmail(e.target.value); if (emailError) setEmailError('') }}
                placeholder={t('interest.form.emailPlaceholder')}
                maxLength={200}
                disabled={formState === 'loading'}
                aria-describedby={emailError ? 'interest-email-error' : undefined}
                aria-invalid={!!emailError}
              />
              {emailError && (
                <p id="interest-email-error" className="interest-field-error" role="alert">
                  {emailError}
                </p>
              )}
            </div>

            <div className="interest-field">
              <label htmlFor="interest-info" className="interest-label">
                {t('interest.form.infoLabel')} *
              </label>
              <textarea
                id="interest-info"
                className={`interest-textarea${infoError ? ' interest-input--error' : ''}`}
                value={info}
                onChange={e => { setInfo(e.target.value); if (infoError) setInfoError('') }}
                placeholder={t('interest.form.infoPlaceholder')}
                maxLength={MAX_INFO + 10}
                rows={4}
                disabled={formState === 'loading'}
                aria-describedby={infoError ? 'interest-info-error' : 'interest-info-counter'}
                aria-invalid={!!infoError}
              />
              <p
                id="interest-info-counter"
                className={`interest-counter${info.trim().length > MAX_INFO ? ' interest-counter--over' : ''}`}
                aria-live="polite"
              >
                {info.trim().length}/{MAX_INFO}
              </p>
              {infoError && (
                <p id="interest-info-error" className="interest-field-error" role="alert">
                  {infoError}
                </p>
              )}
            </div>

            {formState === 'error' && (
              <div className="interest-server-error" role="alert">
                <AlertCircle size={15} aria-hidden="true" />
                <span>{serverError}</span>
              </div>
            )}

            <p className="interest-disclaimer">{t('interest.form.disclaimer')}</p>

            <div className="interest-actions">
              <button
                type="submit"
                className="interest-submit"
                disabled={formState === 'loading'}
              >
                {formState === 'loading'
                  ? <><Loader2 size={15} className="spin" aria-hidden="true" /> {t('interest.form.sending')}</>
                  : t('interest.form.submit')
                }
              </button>
              <button type="button" className="interest-cancel" onClick={onClose}>
                {t('landing.interest.close')}
              </button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  )
}
