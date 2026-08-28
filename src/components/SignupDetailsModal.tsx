import { X, Check, Trash2 } from 'lucide-react'
import { MemberSignup } from '../types/member'
import { formatMemberName } from '../utils/memberName'
import { useLanguage } from '../contexts/LanguageContext'
import './SignupDetailsModal.css'

interface SignupDetailsModalProps {
  signup: MemberSignup | null
  isOpen: boolean
  isLoading?: boolean
  onClose: () => void
  onApprove: (signup: MemberSignup) => void
  onReject: (signup: MemberSignup) => void
}

const formatDate = (value: string) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

const SignupDetailsModal = ({
  signup,
  isOpen,
  isLoading = false,
  onClose,
  onApprove,
  onReject
}: SignupDetailsModalProps) => {
  const { t } = useLanguage()

  if (!isOpen || !signup) return null

  const details = [
    {
      title: t('signup.section.personal'),
      fields: [
        { label: t('signup.field.firstName'), value: signup.firstName },
        { label: t('signup.field.middleName'), value: signup.middleName },
        { label: t('signup.field.lastName'), value: signup.lastName },
        { label: t('signup.field.birthDate'), value: formatDate(signup.birthDate) },
        { label: t('signup.field.birthplace'), value: signup.birthplace },
        { label: t('signup.field.address'), value: signup.address },
        { label: t('signup.field.city'), value: signup.city },
        { label: t('signup.field.nationality'), value: signup.nationality }
      ]
    },
    {
      title: t('signup.section.contact'),
      fields: [
        { label: t('signup.field.phone'), value: signup.phone },
        { label: t('signup.field.email'), value: signup.email },
        { label: t('signup.field.nationalId'), value: signup.nationalId },
        { label: t('signup.field.occupation'), value: signup.occupation }
      ]
    },
    {
      title: t('signup.section.banking'),
      fields: [
        { label: t('signup.field.bankName'), value: signup.bankName },
        { label: t('signup.field.accountNumber'), value: signup.accountNumber },
        { label: t('members.signups.submitted'), value: formatDate(signup.created_at) }
      ]
    }
  ]

  return (
    <div className="signup-details-overlay" onClick={onClose}>
      <div className="signup-details-content" onClick={e => e.stopPropagation()}>
        <div className="signup-details-header">
          <div>
            <h2>{t('members.signups.detailsTitle')}</h2>
            <p className="signup-details-name">{formatMemberName(signup)}</p>
          </div>
          <button className="signup-details-close" onClick={onClose} aria-label="Close">
            <X size={22} />
          </button>
        </div>

        <div className="signup-details-body">
          {details.map(section => (
            <section key={section.title} className="signup-details-section">
              <h3>{section.title}</h3>
              <dl className="signup-details-grid">
                {section.fields.map(field => (
                  <div key={field.label} className="signup-details-item">
                    <dt>{field.label}</dt>
                    <dd>{field.value?.trim() ? field.value : '—'}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>

        <div className="signup-details-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onReject(signup)}
            disabled={isLoading}
          >
            <Trash2 size={16} />
            {t('members.signups.reject')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onApprove(signup)}
            disabled={isLoading}
          >
            <Check size={16} />
            {t('members.signups.approve')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SignupDetailsModal
