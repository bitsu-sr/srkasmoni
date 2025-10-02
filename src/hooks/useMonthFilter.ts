import { useState, useEffect } from 'react'

export const useMonthFilter = (pageKey: string = 'dashboard') => {
  const MONTH_FILTER_STORAGE_KEY = `${pageKey}-month-filter`
  const getCurrentMonth = (): string => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  const getStoredMonth = (): string | null => {
    try {
      const stored = localStorage.getItem(MONTH_FILTER_STORAGE_KEY)
      return stored || null
    } catch (error) {
      console.warn('Failed to read month filter from localStorage:', error)
      return null
    }
  }

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return getStoredMonth() || getCurrentMonth()
  })

  const updateMonth = (month: string) => {
    setSelectedMonth(month)
    try {
      localStorage.setItem(MONTH_FILTER_STORAGE_KEY, month)
    } catch (error) {
      console.warn('Failed to save month filter to localStorage:', error)
    }
  }

  const resetToCurrentMonth = () => {
    const currentMonth = getCurrentMonth()
    updateMonth(currentMonth)
  }

  // Update localStorage when selectedMonth changes
  useEffect(() => {
    try {
      localStorage.setItem(MONTH_FILTER_STORAGE_KEY, selectedMonth)
    } catch (error) {
      console.warn('Failed to save month filter to localStorage:', error)
    }
  }, [selectedMonth])

  return {
    selectedMonth,
    updateMonth,
    resetToCurrentMonth,
    isCurrentMonth: selectedMonth === getCurrentMonth()
  }
}
