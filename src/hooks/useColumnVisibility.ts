import { useState, useCallback } from 'react'

export interface ColumnDef {
  key: string
  label: string
  defaultVisible: boolean
}

const getStoredVisibility = (storageKey: string, columns: ColumnDef[]): Record<string, boolean> => {
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.warn('Failed to read column visibility from localStorage:', error)
  }
  // Fall back to defaults
  const defaults: Record<string, boolean> = {}
  columns.forEach(col => {
    defaults[col.key] = col.defaultVisible
  })
  return defaults
}

export const useColumnVisibility = (pageKey: string, columns: ColumnDef[]) => {
  const STORAGE_KEY = `${pageKey}-column-visibility`

  const [visibility, setVisibility] = useState<Record<string, boolean>>(() => {
    return getStoredVisibility(STORAGE_KEY, columns)
  })

  const toggleColumn = useCallback((key: string) => {
    setVisibility(prev => {
      const next = { ...prev, [key]: !prev[key] }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch (error) {
        console.warn('Failed to save column visibility to localStorage:', error)
      }
      return next
    })
  }, [STORAGE_KEY])

  const isVisible = useCallback((key: string): boolean => {
    return visibility[key] ?? columns.find(c => c.key === key)?.defaultVisible ?? true
  }, [visibility, columns])

  const visibleColumns = columns.filter(col => isVisible(col.key))

  return {
    visibility,
    toggleColumn,
    isVisible,
    visibleColumns,
    allColumns: columns,
  }
}
