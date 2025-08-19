import React from 'react'
import './PerformanceToggle.css'

interface ToggleOption {
  value: string | number
  label: string
}

interface PerformanceToggleProps {
  label: string
  description?: string
  type: 'toggle' | 'dropdown'
  value: boolean | string | number
  onChange: (value: boolean | string | number) => void
  options?: ToggleOption[]
  disabled?: boolean
}

export const PerformanceToggle: React.FC<PerformanceToggleProps> = ({
  label,
  description,
  type,
  value,
  onChange,
  options = [],
  disabled = false
}) => {
  if (type === 'dropdown') {
    return (
      <div className="performance-toggle">
        <div className="toggle-header">
          <label className="toggle-label">{label}</label>
          {description && <p className="toggle-description">{description}</p>}
        </div>
        <div className="toggle-control">
          <select
            className="toggle-dropdown"
            value={String(value)}
            onChange={(e) => {
              const selectedValue = e.target.value
              // Convert to number if the option value is numeric
              const numericValue = options.find(opt => String(opt.value) === selectedValue)?.value
              onChange(numericValue !== undefined ? numericValue : selectedValue)
            }}
            disabled={disabled}
          >
            {options.map((option) => (
              <option key={option.value} value={String(option.value)}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    )
  }

  return (
    <div className="performance-toggle">
      <div className="toggle-header">
        <label className="toggle-label">{label}</label>
        {description && <p className="toggle-description">{description}</p>}
      </div>
      <div className="toggle-control">
        <button
          className={`toggle-button ${value ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
          onClick={() => !disabled && onChange(!value)}
          disabled={disabled}
          type="button"
        >
          <div className="toggle-slider" />
        </button>
      </div>
    </div>
  )
}
