// PWA Service Worker Registration
// This file handles PWA functionality when the plugin is available

// Check if PWA is supported
const isPWASupported = 'serviceWorker' in navigator && 'PushManager' in window

if (isPWASupported) {
  // Register service worker when available
  window.addEventListener('load', () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration)
          
          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content available
                  if (confirm('New content available. Reload?')) {
                    window.location.reload()
                  }
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error('SW registration error', error)
        })
    }
  })
  
  // Handle offline/online events
  window.addEventListener('online', () => {
    console.log('App is online')
  })
  
  window.addEventListener('offline', () => {
    console.log('App is offline')
  })
} else {
  console.log('PWA not supported in this browser')
}

// Export a function for manual PWA registration if needed
export const registerPWA = () => {
  if (isPWASupported && 'serviceWorker' in navigator) {
    return navigator.serviceWorker.register('/sw.js')
  }
  return Promise.reject(new Error('PWA not supported'))
}
