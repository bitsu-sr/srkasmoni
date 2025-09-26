import React, { useState, useEffect } from 'react'
import { usePWASettings } from '../contexts/PWASettingsContext'
import './PWAInstallPrompt.css'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

const PWAInstallPrompt: React.FC = () => {
  const { pwaSettings, dismissPrompt, dismissPromptPermanently } = usePWASettings()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isContextInitialized, setIsContextInitialized] = useState(false)

  // Track when context is initialized
  useEffect(() => {
    // Always initialize after a short delay to ensure context is loaded
    const timer = setTimeout(() => {
      setIsContextInitialized(true)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  // Check context state on mount and when settings change
  useEffect(() => {
    // If user has dismissed permanently or settings don't allow it, hide the prompt
    if (pwaSettings.promptDismissedPermanently || !pwaSettings.showInstallPrompt) {
      setShowInstallPrompt(false)
    }
  }, [pwaSettings.promptDismissedPermanently, pwaSettings.showInstallPrompt])

  useEffect(() => {
    const handler = (e: Event) => {
      // If user has dismissed permanently, don't even prevent the default or set deferred prompt
      if (pwaSettings.promptDismissedPermanently || !pwaSettings.showInstallPrompt) {
        return
      }
      
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowInstallPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [pwaSettings.promptDismissedPermanently, pwaSettings.showInstallPrompt])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    } else {
      console.log('User dismissed the install prompt')
    }

    setDeferredPrompt(null)
    setShowInstallPrompt(false)
  }

  const handleDismiss = () => {
    dismissPrompt()
    setShowInstallPrompt(false)
    setDeferredPrompt(null)
  }

  const handleDismissPermanently = () => {
    dismissPromptPermanently()
    setShowInstallPrompt(false)
    setDeferredPrompt(null)
  }

  // Don't show prompt if context isn't initialized or if settings don't allow it
  if (!isContextInitialized || !showInstallPrompt) return null

  return (
    <div className="pwa-install-prompt">
      <div className="pwa-install-content">
        <div className="pwa-install-icon">📱</div>
        <div className="pwa-install-text">
          <h3>Install Kasmoni</h3>
          <p>Add this app to your home screen for quick access and offline use.</p>
        </div>
        <div className="pwa-install-actions">
          <button 
            className="pwa-install-btn pwa-install-primary"
            onClick={handleInstallClick}
          >
            Install
          </button>
          <button 
            className="pwa-install-btn pwa-install-secondary"
            onClick={handleDismiss}
          >
            Not now
          </button>
          <button 
            className="pwa-install-btn pwa-install-tertiary"
            onClick={handleDismissPermanently}
          >
            Don't ask again
          </button>
        </div>
      </div>
    </div>
  )
}

export default PWAInstallPrompt
