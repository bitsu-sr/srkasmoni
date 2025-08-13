import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import type { Bank, BankFormData } from '../types/bank'
import './BankModal.css'

interface BankModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (bankData: BankFormData) => void
  bank?: Bank | null
  mode: 'create' | 'edit'
}

const BankModal = ({ isOpen, onClose, onSave, bank, mode }: BankModalProps) => {
  const [formData, setFormData] = useState<BankFormData>({
    name: '',
    shortName: '',
    address: ''
  })
  const [errors, setErrors] = useState<Partial<BankFormData>>({})

  useEffect(() => {
    if (bank && mode === 'edit') {
      setFormData({
        name: bank.name,
        shortName: bank.shortName,
        address: bank.address
      })
    } else {
      setFormData({
        name: '',
        shortName: '',
        address: ''
      })
    }
    setErrors({})
  }, [bank, mode, isOpen])

  const handleInputChange = (field: keyof BankFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<BankFormData> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Bank name is required'
    }

    if (!formData.shortName.trim()) {
      newErrors.shortName = 'Short name is required'
    } else if (formData.shortName.length > 50) {
      newErrors.shortName = 'Short name must be 50 characters or less'
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Bank address is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (validateForm()) {
      onSave(formData)
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      shortName: '',
      address: ''
    })
    setErrors({})
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{mode === 'create' ? 'Add New Bank' : 'Edit Bank'}</h2>
          <button className="modal-close" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="name">Bank Name *</label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter full bank name"
              className={errors.name ? 'error' : ''}
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="shortName">Short Name *</label>
            <input
              type="text"
              id="shortName"
              value={formData.shortName}
              onChange={(e) => handleInputChange('shortName', e.target.value)}
              placeholder="Enter short name (e.g., DSB, Finabank)"
              className={errors.shortName ? 'error' : ''}
            />
            {errors.shortName && <span className="error-message">{errors.shortName}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="address">Bank Address *</label>
            <textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Enter complete bank address"
              rows={3}
              className={errors.address ? 'error' : ''}
            />
            {errors.address && <span className="error-message">{errors.address}</span>}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={16} />
              {mode === 'create' ? 'Add Bank' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default BankModal
