import { useState, useEffect } from 'react'
import { X, Check, X as XIcon, ChevronDown, ChevronRight } from 'lucide-react'
import { Member, MemberFormData } from '../types/member'
import './MemberModal.css'

interface MemberModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (member: MemberFormData) => void
  member?: Member | null
  isEditing?: boolean
  isLoading?: boolean
}

const MemberModal = ({ isOpen, onClose, onSave, member, isEditing = false, isLoading = false }: MemberModalProps) => {
  const [formData, setFormData] = useState<MemberFormData>({
    firstName: '',
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
    accountNumber: '',
    dateOfRegistration: new Date().toISOString().split('T')[0],
    totalReceived: 0,
    lastPayment: '',
    nextPayment: '',
    notes: ''
  })

  const [errors, setErrors] = useState<{
    firstName?: string
    lastName?: string
    birthDate?: string
    birthplace?: string
    address?: string
    city?: string
    phone?: string
    email?: string
    nationalId?: string
    nationality?: string
    occupation?: string
    bankName?: string
    accountNumber?: string
    dateOfRegistration?: string
    notes?: string
  }>({})

  const [emailValid, setEmailValid] = useState<boolean | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<{[key: string]: boolean}>({
    personal: false,
    contact: false,
    banking: false,
    registration: false
  })

  // Available cities and nationalities for selection
  const availableCities = ['Paramaribo', 'Nieuw Nickerie', 'Lelydorp', 'Moengo', 'Albina', 'Other']
  const availableNationalities = ['Surinamese', 'Dutch', 'American', 'Canadian', 'Other']

  useEffect(() => {
    if (member && isEditing) {
      setFormData({
        firstName: member.firstName,
        lastName: member.lastName,
        birthDate: member.birthDate,
        birthplace: member.birthplace,
        address: member.address,
        city: member.city,
        phone: member.phone,
        email: member.email,
        nationalId: member.nationalId,
        nationality: member.nationality,
        occupation: member.occupation,
        bankName: member.bankName,
        accountNumber: member.accountNumber,
        dateOfRegistration: member.dateOfRegistration,
        totalReceived: member.totalReceived,
        lastPayment: member.lastPayment,
        nextPayment: member.nextPayment,
        notes: member.notes || ''
      })
      setEmailValid(isValidEmail(member.email))
    } else {
      // Reset form for new member
      setFormData({
        firstName: '',
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
        accountNumber: '',
        dateOfRegistration: new Date().toISOString().split('T')[0],
        totalReceived: 0,
        lastPayment: '',
        nextPayment: '',
        notes: ''
      })
      setEmailValid(null)
    }
    setErrors({})
  }, [member, isEditing])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    
    if (name === 'email') {
      setEmailValid(isValidEmail(value))
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }))
    }
  }

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validateForm = (): boolean => {
    const newErrors: {
      firstName?: string
      lastName?: string
      birthDate?: string
      birthplace?: string
      address?: string
      city?: string
      phone?: string
      email?: string
      nationalId?: string
      nationality?: string
      occupation?: string
      bankName?: string
      accountNumber?: string
      dateOfRegistration?: string
      notes?: string
    } = {}

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required'
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required'
    if (!formData.birthDate) newErrors.birthDate = 'Birth date is required'
    if (!formData.birthplace.trim()) newErrors.birthplace = 'Birthplace is required'
    if (!formData.address.trim()) newErrors.address = 'Address is required'
    if (!formData.city.trim()) newErrors.city = 'City is required'
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required'
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    if (!formData.nationalId.trim()) newErrors.nationalId = 'National ID is required'
    if (!formData.nationality.trim()) newErrors.nationality = 'Nationality is required'
    if (!formData.occupation.trim()) newErrors.occupation = 'Occupation is required'
    if (!formData.bankName.trim()) newErrors.bankName = 'Bank name is required'
    if (!formData.accountNumber.trim()) newErrors.accountNumber = 'Account number is required'
    if (!formData.dateOfRegistration) newErrors.dateOfRegistration = 'Date of registration is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      await onSave(formData)
    } catch (error) {
      console.error('Error saving member:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Member' : 'Add New Member'}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="member-form">
          <div className="form-sections">
            {/* Personal Information Section */}
            <div className="form-section">
              <div className="section-header" onClick={() => toggleSection('personal')}>
                <h3 className="section-title">Personal Information</h3>
                {collapsedSections.personal ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
              </div>
              
              {!collapsedSections.personal && (
                <div className="section-content">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="firstName">First Name *</label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className={errors.firstName ? 'error' : ''}
                        placeholder="Enter first name"
                      />
                      {errors.firstName && <span className="error-message">{errors.firstName}</span>}
                    </div>
                    <div className="form-group">
                      <label htmlFor="lastName">Last Name *</label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className={errors.lastName ? 'error' : ''}
                        placeholder="Enter last name"
                      />
                      {errors.lastName && <span className="error-message">{errors.lastName}</span>}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="birthDate">Birth Date *</label>
                      <input
                        type="date"
                        id="birthDate"
                        name="birthDate"
                        value={formData.birthDate}
                        onChange={handleInputChange}
                        className={errors.birthDate ? 'error' : ''}
                      />
                      {errors.birthDate && <span className="error-message">{errors.birthDate}</span>}
                    </div>
                    <div className="form-group">
                      <label htmlFor="birthplace">Birthplace *</label>
                      <input
                        type="text"
                        id="birthplace"
                        name="birthplace"
                        value={formData.birthplace}
                        onChange={handleInputChange}
                        className={errors.birthplace ? 'error' : ''}
                        placeholder="Enter birthplace"
                      />
                      {errors.birthplace && <span className="error-message">{errors.birthplace}</span>}
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="address">Address *</label>
                    <textarea
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className={errors.address ? 'error' : ''}
                      placeholder="Enter full address"
                      rows={3}
                    />
                    {errors.address && <span className="error-message">{errors.address}</span>}
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="city">City *</label>
                      <select
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className={errors.city ? 'error' : ''}
                      >
                        <option value="">Select city</option>
                        {availableCities.map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                      {errors.city && <span className="error-message">{errors.city}</span>}
                    </div>
                    <div className="form-group">
                      <label htmlFor="nationality">Nationality *</label>
                      <select
                        id="nationality"
                        name="nationality"
                        value={formData.nationality}
                        onChange={handleInputChange}
                        className={errors.nationality ? 'error' : ''}
                      >
                        <option value="">Select nationality</option>
                        {availableNationalities.map(nat => (
                          <option key={nat} value={nat}>{nat}</option>
                        ))}
                      </select>
                      {errors.nationality && <span className="error-message">{errors.nationality}</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Contact & Identification Section */}
            <div className="form-section">
              <div className="section-header" onClick={() => toggleSection('contact')}>
                <h3 className="section-title">Contact & Identification</h3>
                {collapsedSections.contact ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
              </div>
              
              {!collapsedSections.contact && (
                <div className="section-content">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="phone">Phone Number *</label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className={errors.phone ? 'error' : ''}
                        placeholder="+597 XXX-XXXX"
                      />
                      {errors.phone && <span className="error-message">{errors.phone}</span>}
                    </div>
                    <div className="form-group">
                      <label htmlFor="email">Email *</label>
                      <div className="email-input-container">
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className={`${errors.email ? 'error' : ''} ${emailValid === true ? 'valid' : ''} ${emailValid === false ? 'invalid' : ''}`}
                          placeholder="Enter email address"
                        />
                        {emailValid === true && (
                          <Check className="email-icon valid" size={20} />
                        )}
                        {emailValid === false && (
                          <XIcon className="email-icon invalid" size={20} />
                        )}
                      </div>
                      {errors.email && <span className="error-message">{errors.email}</span>}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="nationalId">National ID *</label>
                      <input
                        type="text"
                        id="nationalId"
                        name="nationalId"
                        value={formData.nationalId}
                        onChange={handleInputChange}
                        className={errors.nationalId ? 'error' : ''}
                        placeholder="Enter national ID number"
                      />
                      {errors.nationalId && <span className="error-message">{errors.nationalId}</span>}
                    </div>
                    <div className="form-group">
                      <label htmlFor="occupation">Occupation *</label>
                      <input
                        type="text"
                        id="occupation"
                        name="occupation"
                        value={formData.occupation}
                        onChange={handleInputChange}
                        className={errors.occupation ? 'error' : ''}
                        placeholder="Enter occupation"
                      />
                      {errors.occupation && <span className="error-message">{errors.occupation}</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Banking Information Section */}
            <div className="form-section">
              <div className="section-header" onClick={() => toggleSection('banking')}>
                <h3 className="section-title">Banking Information</h3>
                {collapsedSections.banking ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
              </div>
              
              {!collapsedSections.banking && (
                <div className="section-content">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="bankName">Bank Name *</label>
                      <input
                        type="text"
                        id="bankName"
                        name="bankName"
                        value={formData.bankName}
                        onChange={handleInputChange}
                        className={errors.bankName ? 'error' : ''}
                        placeholder="Enter bank name"
                      />
                      {errors.bankName && <span className="error-message">{errors.bankName}</span>}
                    </div>
                    <div className="form-group">
                      <label htmlFor="accountNumber">Account Number *</label>
                      <input
                        type="text"
                        id="accountNumber"
                        name="accountNumber"
                        value={formData.accountNumber}
                        onChange={handleInputChange}
                        className={errors.accountNumber ? 'error' : ''}
                        placeholder="Enter account number"
                      />
                      {errors.accountNumber && <span className="error-message">{errors.accountNumber}</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Registration Section */}
            <div className="form-section">
              <div className="section-header" onClick={() => toggleSection('registration')}>
                <h3 className="section-title">Registration</h3>
                {collapsedSections.registration ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
              </div>
              
              {!collapsedSections.registration && (
                <div className="section-content">
                  <div className="form-group">
                    <label htmlFor="dateOfRegistration">Date of Registration *</label>
                    <input
                      type="date"
                      id="dateOfRegistration"
                      name="dateOfRegistration"
                      value={formData.dateOfRegistration}
                      onChange={handleInputChange}
                      className={errors.dateOfRegistration ? 'error' : ''}
                    />
                    {errors.dateOfRegistration && <span className="error-message">{errors.dateOfRegistration}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="notes">Notes</label>
                    <textarea
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Additional notes about the member"
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? 'Saving...' : (isEditing ? 'Update Member' : 'Add Member')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default MemberModal
