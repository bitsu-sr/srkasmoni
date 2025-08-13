import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Group, GroupFormData } from '../types/member'
import { calculateDuration } from '../utils/dateUtils'
import './GroupModal.css'

interface GroupModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (groupData: GroupFormData) => void
  group?: Group | null
  mode: 'create' | 'edit'
}

const GroupModal: React.FC<GroupModalProps> = ({ isOpen, onClose, onSave, group, mode }) => {
  const getDefaultStartDate = () => {
    // Allow starting from 1 year ago to give flexibility
    const now = new Date()
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1)
    const year = oneYearAgo.getFullYear()
    const month = String(oneYearAgo.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
  }

  const getDefaultEndDate = () => {
    // Default to 6 months from start date
    const startDate = getDefaultStartDate()
    const start = new Date(startDate + '-01')
    const end = new Date(start.getFullYear(), start.getMonth() + 6, 1)
    const year = end.getFullYear()
    const month = String(end.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
  }

  const [formData, setFormData] = useState<GroupFormData>({
    name: '',
    description: '',
    monthlyAmount: 0,
    maxMembers: 1,
    duration: 6, // Default to 6 months based on default dates
    startDate: getDefaultStartDate(),
    endDate: getDefaultEndDate()
  })

  const [errors, setErrors] = useState<Partial<GroupFormData>>({})

  useEffect(() => {
    if (group && mode === 'edit') {
      const calculatedDuration = calculateDuration(group.startDate, group.endDate)
      setFormData({
        name: group.name,
        description: group.description || '',
        monthlyAmount: group.monthlyAmount,
        maxMembers: group.maxMembers,
        duration: calculatedDuration,
        startDate: group.startDate,
        endDate: group.endDate
      })
    } else {
      setFormData({
        name: '',
        description: '',
        monthlyAmount: 0,
        maxMembers: 1,
        duration: 6, // Default to 6 months based on default dates
        startDate: getDefaultStartDate(),
        endDate: getDefaultEndDate()
      })
    }
    setErrors({})
  }, [group, mode])

  const validateForm = (): boolean => {
    const newErrors: Partial<GroupFormData> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Group name is required'
    }

    if (formData.monthlyAmount <= 0) {
      newErrors.monthlyAmount = 'Monthly amount must be greater than 0'
    }

    if (formData.maxMembers < 1) {
      newErrors.maxMembers = 'Maximum members must be at least 1'
    }

    if (formData.duration < 1) {
      newErrors.duration = 'Duration must be at least 1 month'
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required'
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required'
    }

    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate + '-01')
      const endDate = new Date(formData.endDate + '-01')
      if (startDate >= endDate) {
        newErrors.endDate = 'End date must be after start date'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (validateForm()) {
      // Calculate the actual duration before saving
      const calculatedDuration = formData.startDate && formData.endDate ? 
        calculateDuration(formData.startDate, formData.endDate) : 1

      // Create the data to save with calculated duration
      const dataToSave = {
        ...formData,
        duration: calculatedDuration
      }
      
      onSave(dataToSave)
    }
  }

  // Use the utility function instead of local calculation

  const handleInputChange = (field: keyof GroupFormData, value: string | number) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }
      
      // Auto-calculate duration when start or end dates change
      if (field === 'startDate' || field === 'endDate') {
        newData.duration = calculateDuration(newData.startDate, newData.endDate)
      }
      
      return newData
    })
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{mode === 'create' ? 'Create New Group' : 'Edit Group'}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="name">Group Name *</label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={errors.name ? 'error' : ''}
              placeholder="Enter group name"
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter group description"
              rows={3}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="monthlyAmount">Monthly Amount (SRD) *</label>
              <input
                type="number"
                id="monthlyAmount"
                value={formData.monthlyAmount}
                onChange={(e) => handleInputChange('monthlyAmount', parseFloat(e.target.value) || 0)}
                className={errors.monthlyAmount ? 'error' : ''}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              {errors.monthlyAmount && <span className="error-message">{errors.monthlyAmount}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="maxMembers">Maximum Members *</label>
              <input
                type="number"
                id="maxMembers"
                value={formData.maxMembers}
                onChange={(e) => handleInputChange('maxMembers', parseInt(e.target.value) || 1)}
                className={errors.maxMembers ? 'error' : ''}
                placeholder="1"
                min="1"
              />
              {errors.maxMembers && <span className="error-message">{errors.maxMembers}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startDate">Start Date (MM-YYYY) *</label>
              <input
                type="month"
                id="startDate"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                className={errors.startDate ? 'error' : ''}
              />
              <small className="form-hint">You can select any month, including past months</small>
              {errors.startDate && <span className="error-message">{errors.startDate}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="endDate">End Date (MM-YYYY) *</label>
              <input
                type="month"
                id="endDate"
                value={formData.endDate}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                className={errors.endDate ? 'error' : ''}
                min={formData.startDate}
              />
              <small className="form-hint">Must be after start date</small>
              {errors.endDate && <span className="error-message">{errors.endDate}</span>}
            </div>
          </div>

          <div className="form-group">
            <label>Duration (Calculated)</label>
            <div className="calculated-value">
              {formData.duration} month{formData.duration !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {mode === 'create' ? 'Create Group' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default GroupModal

