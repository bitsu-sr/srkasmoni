import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Users, UserCheck, CreditCard, BarChart3, Settings, Menu, X, FileText, DollarSign, Shield, MessageSquare } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import LoginModal from './LoginModal'
import UserProfileDropdown from './UserProfileDropdown'
import MobileBottomSheet from './MobileBottomSheet'
import './Navbar.css'

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const location = useLocation()
  const menuRef = useRef<HTMLDivElement>(null)
  const { isAuthenticated, isAdmin, isSuperUser } = useAuth()
  const { t } = useLanguage()

  // Check for pending password reset requests
  useEffect(() => {
    if (isAdmin() || isSuperUser()) {
      const checkPendingRequests = () => {
        try {
          // const requests = JSON.parse(localStorage.getItem('password_reset_requests') || '[]');
          // const pendingCount = requests.filter((req: any) => req.status === 'pending').length;
          // setPendingResetRequests(pendingCount); // This line is removed
        } catch (error) {
          console.log('Error checking pending requests:', error);
        }
      };

      checkPendingRequests();
      // Check every 30 seconds for new requests
      const interval = setInterval(checkPendingRequests, 30000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, isSuperUser]);

  // Check if device is mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  const navItems = [
    { path: isAdmin() || isSuperUser() ? '/dashboard' : '/my-dashboard', label: isAdmin() || isSuperUser() ? t('nav.dashboard') : t('nav.myDashboard'), icon: Home },
    { path: '/groups', label: t('nav.groups'), icon: Users },
    { path: '/members', label: t('nav.members'), icon: UserCheck },
    { path: '/payments', label: t('nav.payments'), icon: CreditCard },
  ]

  const hamburgerItems = [
    { path: '/payouts', label: t('nav.payouts'), icon: DollarSign },
    { path: '/payments-due', label: t('nav.paymentsDue'), icon: CreditCard },
    { path: '/analytics', label: t('nav.analytics'), icon: BarChart3 },
    { path: '/messaging', label: t('nav.messages'), icon: MessageSquare },
    { path: '/payment-logs', label: t('nav.paymentLogs'), icon: FileText },
  ]

  // Add admin-only items
  if (isAdmin()) {
    hamburgerItems.push(
      { path: '/user-management', label: t('nav.userManagement'), icon: Shield },
      { path: '/login-logs', label: t('nav.loginLogs'), icon: Shield },
      { path: '/settings', label: t('nav.settings'), icon: Settings }
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
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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

        {/* Desktop Navigation - Only show when authenticated and on desktop */}
        {isAuthenticated && !isMobile && (
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
            <div className="hamburger-menu-desktop" ref={menuRef}>
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

        {/* Authentication Section - Only show on desktop */}
        {!isMobile && (
          <div className="auth-section">
            {isAuthenticated ? (
              <UserProfileDropdown />
            ) : (
              <button 
                className="login-btn"
                onClick={() => setIsLoginModalOpen(true)}
              >
                {t('auth.login')}
              </button>
            )}
          </div>
        )}

        {/* Mobile Menu Button - Only show when authenticated and on mobile */}
        {isAuthenticated && isMobile && (
          <button className="mobile-menu-btn" onClick={toggleMenu}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        )}

        {/* Mobile Authentication - Only show on mobile */}
        {isMobile && (
          <div className="mobile-auth">
            {isAuthenticated ? (
              <UserProfileDropdown />
            ) : (
              <button 
                className="mobile-login-btn"
                onClick={() => setIsLoginModalOpen(true)}
              >
                {t('auth.login')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Mobile Bottom Sheet Navigation - Only show on mobile */}
      {isAuthenticated && isMobile && (
        <MobileBottomSheet 
          isOpen={isMenuOpen} 
          onClose={closeMenu} 
        />
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
