import { useState, useCallback, useEffect, useRef } from 'react'
import { columnVisibilityService } from '../services/columnVisibilityService'

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

const getDefaultVisibility = (columns: ColumnDef[]): Record<string, boolean> => {
  const defaults: Record<string, boolean> = {}
  columns.forEach(column => {
    defaults[column.key] = column.defaultVisible
  })
  return defaults
}

const mergeVisibility = (
  columns: ColumnDef[],
  saved: Record<string, boolean> | null
): Record<string, boolean> => {
  const merged = getDefaultVisibility(columns)
  if (!saved) return merged
  columns.forEach(column => {
    if (typeof saved[column.key] === 'boolean') {
      merged[column.key] = saved[column.key]
    }
  })
  return merged
}

export const useColumnVisibility = (
  pageKey: string,
  columns: ColumnDef[],
  storage: 'local' | 'database' = 'local'
) => {
  const STORAGE_KEY = `${pageKey}-column-visibility`
  const saveQueue = useRef(Promise.resolve())
  const hasLocalChange = useRef(false)

  const [visibility, setVisibility] = useState<Record<string, boolean>>(() => {
    if (storage === 'database') return getDefaultVisibility(columns)
    return getStoredVisibility(STORAGE_KEY, columns)
  })

  useEffect(() => {
    if (storage !== 'database') return

    let active = true
    columnVisibilityService.get(pageKey)
      .then(saved => {
        if (!active || hasLocalChange.current) return
        setVisibility(mergeVisibility(columns, saved))
      })
      .catch(error => {
        console.warn('Failed to load column visibility from the database:', error)
      })

    return () => {
      active = false
    }
  }, [pageKey, storage, columns])

  const toggleColumn = useCallback((key: string) => {
    setVisibility(prev => {
      const current = prev[key] ?? columns.find(column => column.key === key)?.defaultVisible ?? true
      const next = { ...prev, [key]: !current }

      if (storage === 'database') {
        hasLocalChange.current = true
        saveQueue.current = saveQueue.current
          .then(() => columnVisibilityService.save(pageKey, next))
          .catch(error => {
            console.warn('Failed to save column visibility to the database:', error)
          })
      } else {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        } catch (error) {
          console.warn('Failed to save column visibility to localStorage:', error)
        }
      }

      return next
    })
  }, [STORAGE_KEY, columns, pageKey, storage])

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
