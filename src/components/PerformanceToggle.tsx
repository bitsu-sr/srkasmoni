import React from 'react'
import './PerformanceToggle.css'

interface PerformanceToggleProps {
  label: string
  description: string
  phase: string
  impact: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

const PerformanceToggle: React.FC<PerformanceToggleProps> = ({
  label,
  description,
  phase,
  impact,
  checked,
  onChange,
  disabled = false
}) => {
  const handleToggle = () => {
    if (!disabled) {
      onChange(!checked)
    }
  }

  return (
    <div className={`performance-toggle ${disabled ? 'disabled' : ''}`}>
      <div className="toggle-header">
        <div className="toggle-info">
          <h3 className="toggle-label">{label}</h3>
          <div className="toggle-meta">
            <span className="phase-badge">{phase}</span>
            <span className="impact-badge">{impact}</span>
          </div>
        </div>
        <div className="toggle-control">
          <button
            type="button"
            className={`toggle-switch ${checked ? 'active' : ''}`}
            onClick={handleToggle}
            disabled={disabled}
            aria-label={`Toggle ${label}`}
          >
            <div className="toggle-slider" />
          </button>
        </div>
      </div>
      <p className="toggle-description">{description}</p>
    </div>
  )
}

export default PerformanceToggle
