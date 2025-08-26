import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Users, UserCheck, CreditCard, BarChart3, Settings, Menu, X, FileText, DollarSign, Shield, MessageSquare } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import LoginModal from './LoginModal'
import UserProfileDropdown from './UserProfileDropdown'
import './Navbar.css'

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const location = useLocation()
  const menuRef = useRef<HTMLDivElement>(null)
  const { isAuthenticated, isAdmin, isSuperUser } = useAuth()

  const navItems = [
    { path: isAdmin() || isSuperUser() ? '/dashboard' : '/my-dashboard', label: 'Dashboard', icon: Home },
    { path: '/groups', label: 'Groups', icon: Users },
    { path: '/members', label: 'Members', icon: UserCheck },
    { path: '/payments', label: 'Payments', icon: CreditCard },
  ]

  const hamburgerItems = [
    { path: '/messaging', label: 'Messages', icon: MessageSquare },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/payment-logs', label: 'Payment Logs', icon: FileText },
    { path: '/payments-due', label: 'Payments Due', icon: CreditCard },
    { path: '/payouts', label: 'Payouts', icon: DollarSign },
  ]

  // Add admin-only items
  if (isAdmin()) {
    hamburgerItems.push(
      { path: '/settings', label: 'Settings', icon: Settings },
      { path: '/login-logs', label: 'Login Logs', icon: Shield },
      { path: '/user-management', label: 'User Management', icon: Shield }
    )
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  // Close menu when location changes
  useEffect(() => {
    closeMenu()
  }, [location.pathname])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if clicking on the hamburger button or dropdown
      const target = event.target as Node
      const hamburgerMenu = document.querySelector('.hamburger-menu-desktop')
      
      if (hamburgerMenu && hamburgerMenu.contains(target)) {
        return
      }
      
      if (menuRef.current && !menuRef.current.contains(target)) {
        closeMenu()
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <Link to="/" className="navbar-logo">
            <img src="/logokasmonigr.png" alt="Sranan Kasmoni Logo" className="logo-icon" />
            <span className="logo-text">Sranan Kasmoni</span>
          </Link>
        </div>

        {/* Desktop Navigation - Only show when authenticated */}
        {isAuthenticated && (
          <div className="navbar-nav desktop-nav">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                >
                  <Icon className="nav-icon" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
            
            {/* Hamburger Menu for Desktop */}
            <div className="hamburger-menu-desktop">
              <button className="hamburger-btn" onClick={toggleMenu}>
                <Menu size={20} />
              </button>
              {isMenuOpen && (
                <div className="hamburger-dropdown">
                  {hamburgerItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`hamburger-item ${location.pathname === item.path ? 'active' : ''}`}
                        onClick={() => {
                          closeMenu()
                          // Force close after a small delay to ensure navigation happens
                          setTimeout(() => setIsMenuOpen(false), 100)
                        }}
                      >
                        <Icon className="nav-icon" />
                        <span>{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Authentication Section */}
        <div className="auth-section">
          {isAuthenticated ? (
            <UserProfileDropdown />
          ) : (
            <button 
              className="login-btn"
              onClick={() => setIsLoginModalOpen(true)}
            >
              Login
            </button>
          )}
        </div>

        {/* Mobile Menu Button - Only show when authenticated */}
        {isAuthenticated && (
          <button className="mobile-menu-btn" onClick={toggleMenu}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        )}

        {/* Mobile Authentication */}
        <div className="mobile-auth">
          {isAuthenticated ? (
            <UserProfileDropdown />
          ) : (
            <button 
              className="mobile-login-btn"
              onClick={() => setIsLoginModalOpen(true)}
            >
              Login
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation - Only show when authenticated */}
      {isAuthenticated && (
        <div ref={menuRef} className={`mobile-nav ${isMenuOpen ? 'open' : ''}`}>
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`mobile-nav-link ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => {
                  closeMenu()
                  // Force close after a small delay to ensure navigation happens
                  setTimeout(() => setIsMenuOpen(false), 100)
                }}
              >
                <Icon className="nav-icon" />
                <span>{item.label}</span>
              </Link>
            )
          })}
          
          {/* Divider */}
          <div className="mobile-nav-divider"></div>
          
          {/* Hamburger Items */}
          {hamburgerItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`mobile-nav-link hamburger-item ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => {
                  closeMenu()
                  // Force close after a small delay to ensure navigation happens
                  setTimeout(() => setIsMenuOpen(false), 100)
                }}
              >
                <Icon className="nav-icon" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      )}

      {/* Login Modal */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
    </nav>
  )
}

export default Navbar
