import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './pwa' // Register PWA service worker

// Apply persisted theme ASAP to avoid FOUC
const persistedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
if (persistedTheme) {
  document.documentElement.setAttribute('data-theme', persistedTheme)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
