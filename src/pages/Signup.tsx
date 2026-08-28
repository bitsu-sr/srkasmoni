import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Check, X as XIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { MEMBER_CITIES, MEMBER_NATIONALITIES, MemberSignupFormData } from '../types/member'
import { memberSignupService } from '../services/memberSignupService'
import { bankService } from '../services/bankService'
import type { Bank } from '../types/bank'
import { useLanguage } from '../contexts/LanguageContext'
import '../components/MemberModal.css'
import './Signup.css'

const emptySignupForm = (): MemberSignupFormData => ({
  firstName: '',
  middleName: '',
  lastName: '',
  birthDate: '',
  birthplace: '',
  address: '',
  city: '',
  phone: '',
  email: '',
  nationalId: '',
  nationality: '',
  occupation: '',
  bankName: '',
  accountNumber: ''
})

const STEP_FIELDS: (keyof MemberSignupFormData)[][] = [
  ['firstName', 'lastName', 'birthDate', 'birthplace', 'address', 'city', 'nationality'],
  ['phone', 'email', 'nationalId', 'occupation'],
  ['bankName', 'accountNumber']
]

const Signup = () => {
  const { t } = useLanguage()
  const formTopRef = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState<MemberSignupFormData>(emptySignupForm)
  const [banks, setBanks] = useState<Bank[]>([])
  const [errors, setErrors] = useState<Partial<Record<keyof MemberSignupFormData, string>>>({})
  const [emailValid, setEmailValid] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  const steps = [
    t('signup.section.personal'),
    t('signup.section.contact'),
    t('signup.section.banking')
  ]

  useEffect(() => {
    bankService.getAllBanks()
      .then(setBanks)
      .catch(error => {
        console.error('Error loading banks:', error)
        setBanks([])
      })
  }, [])

  useEffect(() => {
    formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [step])

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target

    if (name === 'email') {
      setEmailValid(isValidEmail(value))
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    if (errors[name as keyof MemberSignupFormData]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }))
    }
  }

  const validateStep = (stepIndex: number): boolean => {
    const newErrors: Partial<Record<keyof MemberSignupFormData, string>> = {}
    const fields = STEP_FIELDS[stepIndex]

    const requiredMessage: Partial<Record<keyof MemberSignupFormData, string>> = {
      firstName: t('signup.error.firstName'),
      lastName: t('signup.error.lastName'),
      birthDate: t('signup.error.birthDate'),
      birthplace: t('signup.error.birthplace'),
      address: t('signup.error.address'),
      city: t('signup.error.city'),
      nationality: t('signup.error.nationality'),
      phone: t('signup.error.phone'),
      email: t('signup.error.email'),
      nationalId: t('signup.error.nationalId'),
      occupation: t('signup.error.occupation'),
      bankName: t('signup.error.bankName'),
      accountNumber: t('signup.error.accountNumber')
    }

    fields.forEach(field => {
      const value = formData[field]?.trim()
      if (!value) {
        newErrors[field] = requiredMessage[field]
      }
    })

    if (fields.includes('email') && formData.email.trim() && !isValidEmail(formData.email)) {
      newErrors.email = t('signup.error.emailInvalid')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const goNext = () => {
    if (!validateStep(step)) return
    setSubmitError('')
    setStep(prev => Math.min(prev + 1, steps.length - 1))
  }

  const goBack = () => {
    setSubmitError('')
    setErrors({})
    setStep(prev => Math.max(prev - 1, 0))
  }

  const goToStep = (index: number) => {
    if (index < step) {
      setErrors({})
      setStep(index)
    } else if (index === step + 1 && validateStep(step)) {
      setStep(index)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')

    if (step < steps.length - 1) {
      goNext()
      return
    }

    if (!validateStep(step)) {
      return
    }

    try {
      setIsLoading(true)
      await memberSignupService.createSignup(formData)
      setIsSubmitted(true)
    } catch (error) {
      console.error('Error submitting signup:', error)
      setSubmitError(t('signup.error.submit'))
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="signup-page">
        <div className="signup-container">
          <div className="signup-success">
            <div className="signup-success-icon">
              <Check size={40} />
            </div>
            <h1>{t('signup.success.title')}</h1>
            <p>{t('signup.success.body')}</p>
            <Link to="/landing" className="btn btn-primary">
              {t('signup.success.back')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="signup-page">
      <div className="signup-container" ref={formTopRef}>
        <div className="signup-header">
          <h1>{t('signup.title')}</h1>
          <p>{t('signup.subtitle')}</p>
        </div>

        <nav className="signup-progress" aria-label={t('signup.wizard.progress')}>
          {steps.map((label, index) => {
            const status = index < step ? 'complete' : index === step ? 'current' : 'upcoming'
            return (
              <button
                key={label}
                type="button"
                className={`signup-progress-step ${status}`}
                onClick={() => goToStep(index)}
                disabled={index > step}
                aria-current={index === step ? 'step' : undefined}
              >
                <span className="signup-progress-index">
                  {index < step ? <Check size={16} /> : index + 1}
                </span>
                <span className="signup-progress-label">{label}</span>
              </button>
            )
          })}
        </nav>
        <p className="signup-step-count">
          {t('signup.wizard.step')
            .replace('{current}', String(step + 1))
            .replace('{total}', String(steps.length))}
        </p>

        <form onSubmit={handleSubmit} className="member-form signup-form" noValidate>
          {submitError && <div className="signup-submit-error">{submitError}</div>}

          {step === 0 && (
            <div className="signup-step">
              <h2 className="signup-step-title">{t('signup.section.personal')}</h2>
              <div className="form-group">
                <label htmlFor="firstName">{t('signup.field.firstName')} *</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  autoComplete="given-name"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={errors.firstName ? 'error' : ''}
                />
                {errors.firstName && <span className="error-message">{errors.firstName}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="middleName">{t('signup.field.middleName')}</label>
                <input
                  type="text"
                  id="middleName"
                  name="middleName"
                  autoComplete="additional-name"
                  value={formData.middleName}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="lastName">{t('signup.field.lastName')} *</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  autoComplete="family-name"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={errors.lastName ? 'error' : ''}
                />
                {errors.lastName && <span className="error-message">{errors.lastName}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="birthDate">{t('signup.field.birthDate')} *</label>
                <input
                  type="date"
                  id="birthDate"
                  name="birthDate"
                  autoComplete="bday"
                  value={formData.birthDate}
                  onChange={handleInputChange}
                  className={errors.birthDate ? 'error' : ''}
                />
                {errors.birthDate && <span className="error-message">{errors.birthDate}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="birthplace">{t('signup.field.birthplace')} *</label>
                <input
                  type="text"
                  id="birthplace"
                  name="birthplace"
                  value={formData.birthplace}
                  onChange={handleInputChange}
                  className={errors.birthplace ? 'error' : ''}
                />
                {errors.birthplace && <span className="error-message">{errors.birthplace}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="address">{t('signup.field.address')} *</label>
                <textarea
                  id="address"
                  name="address"
                  autoComplete="street-address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className={errors.address ? 'error' : ''}
                  rows={3}
                />
                {errors.address && <span className="error-message">{errors.address}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="city">{t('signup.field.city')} *</label>
                <select
                  id="city"
                  name="city"
                  autoComplete="address-level2"
                  value={formData.city}
                  onChange={handleInputChange}
                  className={errors.city ? 'error' : ''}
                >
                  <option value="">{t('signup.field.selectCity')}</option>
                  {MEMBER_CITIES.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                {errors.city && <span className="error-message">{errors.city}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="nationality">{t('signup.field.nationality')} *</label>
                <select
                  id="nationality"
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleInputChange}
                  className={errors.nationality ? 'error' : ''}
                >
                  <option value="">{t('signup.field.selectNationality')}</option>
                  {MEMBER_NATIONALITIES.map(nat => (
                    <option key={nat} value={nat}>{nat}</option>
                  ))}
                </select>
                {errors.nationality && <span className="error-message">{errors.nationality}</span>}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="signup-step">
              <h2 className="signup-step-title">{t('signup.section.contact')}</h2>
              <div className="form-group">
                <label htmlFor="phone">{t('signup.field.phone')} *</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  autoComplete="tel"
                  inputMode="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={errors.phone ? 'error' : ''}
                  placeholder="+597 XXX-XXXX"
                />
                {errors.phone && <span className="error-message">{errors.phone}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="email">{t('signup.field.email')} *</label>
                <div className="email-input-container">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    autoComplete="email"
                    inputMode="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`${errors.email ? 'error' : ''} ${emailValid === true ? 'valid' : ''} ${emailValid === false ? 'invalid' : ''}`}
                  />
                  {emailValid === true && <Check className="email-icon valid" size={20} />}
                  {emailValid === false && <XIcon className="email-icon invalid" size={20} />}
                </div>
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="nationalId">{t('signup.field.nationalId')} *</label>
                <input
                  type="text"
                  id="nationalId"
                  name="nationalId"
                  value={formData.nationalId}
                  onChange={handleInputChange}
                  className={errors.nationalId ? 'error' : ''}
                />
                {errors.nationalId && <span className="error-message">{errors.nationalId}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="occupation">{t('signup.field.occupation')} *</label>
                <input
                  type="text"
                  id="occupation"
                  name="occupation"
                  autoComplete="organization-title"
                  value={formData.occupation}
                  onChange={handleInputChange}
                  className={errors.occupation ? 'error' : ''}
                />
                {errors.occupation && <span className="error-message">{errors.occupation}</span>}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="signup-step">
              <h2 className="signup-step-title">{t('signup.section.banking')}</h2>
              <div className="form-group">
                <label htmlFor="bankName">{t('signup.field.bankName')} *</label>
                <select
                  id="bankName"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleInputChange}
                  className={errors.bankName ? 'error' : ''}
                >
                  <option value="">{t('signup.field.selectBank')}</option>
                  {banks.map(bank => (
                    <option key={bank.id} value={bank.name}>{bank.name}</option>
                  ))}
                </select>
                {errors.bankName && <span className="error-message">{errors.bankName}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="accountNumber">{t('signup.field.accountNumber')} *</label>
                <input
                  type="text"
                  id="accountNumber"
                  name="accountNumber"
                  inputMode="numeric"
                  value={formData.accountNumber}
                  onChange={handleInputChange}
                  className={errors.accountNumber ? 'error' : ''}
                />
                {errors.accountNumber && <span className="error-message">{errors.accountNumber}</span>}
              </div>
            </div>
          )}

          <div className="signup-actions">
            {step > 0 && (
              <button type="button" className="btn btn-secondary" onClick={goBack}>
                <ChevronLeft size={20} />
                {t('signup.wizard.back')}
              </button>
            )}
            {step < steps.length - 1 ? (
              <button type="submit" className="btn btn-primary">
                {t('signup.wizard.next')}
                <ChevronRight size={20} />
              </button>
            ) : (
              <button type="submit" className="btn btn-primary" disabled={isLoading}>
                {isLoading ? t('signup.submitting') : t('signup.submit')}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default Signup
