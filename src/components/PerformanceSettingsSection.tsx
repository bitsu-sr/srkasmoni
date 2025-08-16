import React, { useState } from 'react'
import { RotateCcw, Zap, Info, Database, Trash2, BarChart3 } from 'lucide-react'
import { usePerformanceSettings } from '../contexts/PerformanceSettingsContext'
import { useCacheManagement } from '../hooks/useCachedQueries'
import { PERFORMANCE_OPTIONS } from '../types/performanceSettings'
import PerformanceToggle from './PerformanceToggle'
import './PerformanceSettingsSection.css'

const PerformanceSettingsSection: React.FC = () => {
  const { 
    settings, 
    updateSetting, 
    resetToDefaults, 
    hasAnyFeaturesEnabled 
  } = usePerformanceSettings()
  
  const { clearCache, getCacheStats, cleanupCache } = useCacheManagement()
  const [cacheStats, setCacheStats] = useState<any>(null)

  const handleToggle = (key: keyof typeof settings, value: boolean) => {
    updateSetting(key, value)
  }

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all performance settings to defaults? This will disable all performance optimizations.')) {
      resetToDefaults()
    }
  }

  const handleClearCache = () => {
    if (window.confirm('Are you sure you want to clear all cached data? This will force fresh data loading on next visit.')) {
      clearCache()
      setCacheStats(null)
    }
  }

  const handleCleanupCache = () => {
    cleanupCache()
    setCacheStats(null)
  }

  const handleShowCacheStats = () => {
    const stats = getCacheStats()
    setCacheStats(stats)
  }

  return (
    <div className="performance-settings-section">
      <div className="section-header">
        <div className="header-content">
          <h2 className="section-title">
            <Zap className="section-icon" />
            Performance Settings
          </h2>
          <p className="section-description">
            Configure performance optimizations to balance speed and resource usage. 
            Changes take effect immediately.
          </p>
        </div>
        <div className="header-actions">
          <button
            onClick={handleReset}
            className="reset-button"
            title="Reset to Defaults"
          >
            <RotateCcw size={16} />
            Reset to Defaults
          </button>
        </div>
      </div>

      <div className="performance-status">
        <Info size={16} />
        <span>
          {hasAnyFeaturesEnabled() 
            ? 'Performance optimizations are enabled. Pages should load faster.'
            : 'Performance optimizations are disabled. Using default (current) behavior.'
          }
        </span>
      </div>

      <div className="performance-options">
        {PERFORMANCE_OPTIONS.map((option) => (
          <PerformanceToggle
            key={option.key}
            label={option.label}
            description={option.description}
            phase={option.phase}
            impact={option.impact}
            checked={Boolean(settings[option.key])}
            onChange={(checked) => handleToggle(option.key, checked)}
          />
        ))}
      </div>

      {/* Cache Management Section */}
      {settings.enableCaching && (
        <div className="cache-management-section">
          <h3>Cache Management</h3>
          <div className="cache-controls">
            <button
              onClick={handleShowCacheStats}
              className="cache-btn cache-stats-btn"
              title="Show Cache Statistics"
            >
              <BarChart3 size={16} />
              Show Cache Stats
            </button>
            <button
              onClick={handleCleanupCache}
              className="cache-btn cache-cleanup-btn"
              title="Clean Up Old Cache Entries"
            >
              <Database size={16} />
              Cleanup Cache
            </button>
            <button
              onClick={handleClearCache}
              className="cache-btn cache-clear-btn"
              title="Clear All Cached Data"
            >
              <Trash2 size={16} />
              Clear All Cache
            </button>
          </div>
          
          {cacheStats && (
            <div className="cache-stats">
              <h4>Cache Statistics</h4>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-label">Total Queries:</span>
                  <span className="stat-value">{cacheStats.totalQueries}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Cached Queries:</span>
                  <span className="stat-value">{cacheStats.cachedQueries}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Cache Hit Rate:</span>
                  <span className="stat-value">{cacheStats.cacheHitRate.toFixed(1)}%</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Memory Usage:</span>
                  <span className="stat-value">{cacheStats.memoryUsage} KB</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Last Cleanup:</span>
                  <span className="stat-value">{cacheStats.lastCleanup.toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="performance-info">
        <h3>How Performance Settings Work</h3>
        <div className="info-grid">
          <div className="info-item">
            <h4>Phase 1: Parallel Database Calls</h4>
            <p>Loads multiple database queries simultaneously instead of waiting for each one to complete. Provides 3-5x speed improvement.</p>
          </div>
          <div className="info-item">
            <h4>Phase 2: Single Optimized Queries</h4>
            <p>Uses advanced database JOINs to fetch all related data in one query. Provides 10-30x speed improvement.</p>
          </div>
          <div className="info-item">
            <h4>Phase 3: Smart Caching</h4>
            <p>Caches frequently accessed data for instant loading after the first visit. Provides 10-50x speed improvement for repeat access.</p>
          </div>
        </div>
        <div className="info-note">
          <strong>Note:</strong> Performance improvements are most noticeable on slower networks or with large amounts of data. 
          All settings are saved locally in your browser and will be remembered for future visits.
        </div>
      </div>
    </div>
  )
}

export default PerformanceSettingsSection
