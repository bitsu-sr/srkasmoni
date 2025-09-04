import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Users, UserCheck, CreditCard, BarChart3, Settings, FileText, DollarSign, Shield, MessageSquare, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import './MobileBottomSheet.css'

interface MobileBottomSheetProps {
  isOpen: boolean
  onClose: () => void
}

const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({ isOpen, onClose }) => {
  const location = useLocation()
  const { isAdmin, isSuperUser } = useAuth()
  const sheetRef = useRef<HTMLDivElement>(null)

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden' // Prevent background scroll
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const navItems = [
    { path: isAdmin() || isSuperUser() ? '/dashboard' : '/my-dashboard', label: 'Dashboard', icon: Home },
    { path: '/groups', label: 'Groups', icon: Users },
    { path: '/members', label: 'Members', icon: UserCheck },
    { path: '/payments', label: 'Payments', icon: CreditCard },
  ]

  const secondaryItems = [
    { path: '/payouts', label: 'Payouts', icon: DollarSign },
    { path: '/payments-due', label: 'Payments Due', icon: CreditCard },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/messaging', label: 'Messages', icon: MessageSquare },
    { path: '/payment-logs', label: 'Payment Logs', icon: FileText },
  ]

  // Add admin-only items
  if (isAdmin()) {
    secondaryItems.push(
      { path: '/user-management', label: 'User Management', icon: Shield },
      { path: '/login-logs', label: 'Login Logs', icon: Shield },
      { path: '/settings', label: 'Settings', icon: Settings }
    )
  }

  const handleItemClick = () => {
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="mobile-bottom-sheet-backdrop" onClick={handleBackdropClick}>
      <div 
        ref={sheetRef}
        className={`mobile-bottom-sheet ${isOpen ? 'open' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="sheet-handle">
          <div className="handle-bar"></div>
        </div>

        {/* Header */}
        <div className="sheet-header">
          <h3>Navigation</h3>
          <button className="mobile-sheet-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Main Navigation */}
        <div className="sheet-section">
          <h4 className="section-title">Main</h4>
          <div className="nav-grid">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={handleItemClick}
                >
                  <div className="nav-item-icon">
                    <Icon size={20} />
                  </div>
                  <span className="nav-item-label">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Secondary Navigation */}
        <div className="sheet-section">
          <h4 className="section-title">More</h4>
          <div className="nav-list">
            {secondaryItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-list-item ${isActive ? 'active' : ''}`}
                  onClick={handleItemClick}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                  {isActive && <div className="active-indicator"></div>}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Bottom spacing for safe area */}
        <div className="sheet-bottom-spacing"></div>
      </div>
    </div>
  )
}

export default MobileBottomSheet
