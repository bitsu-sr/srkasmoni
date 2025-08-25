/**
 * Utility functions for date handling
 * 
 * These functions ensure proper timezone handling by using the browser's default
 * local timezone behavior, which automatically converts dates to the user's local time.
 */

/**
 * Formats a date string (YYYY-MM) to a readable month-year format
 * Avoids timezone issues that can cause month shifting
 */
export const formatMonthYear = (dateString: string): string => {
  if (!dateString || !dateString.includes('-')) return 'N/A'
  
  const [year, month] = dateString.split('-').map(Number)
  
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return 'Invalid Date'
  }
  
  // Use a simple array instead of Date objects to avoid timezone issues
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]
  
  const result = `${monthNames[month - 1]} ${year}`
  
  return result
}

/**
 * Formats a full date string to a readable date format
 * Handles timezone conversion properly to display dates in local time
 */
export const formatDate = (dateString: string, options?: Intl.DateTimeFormatOptions): string => {
  if (!dateString) return 'N/A'
  
  try {
    // Handle date strings that might be interpreted as UTC
    // Split the date string to avoid timezone conversion issues
    let date: Date
    
    if (dateString.includes('T') || dateString.includes(' ')) {
      // Full datetime string - create date normally
      date = new Date(dateString)
    } else {
      // Date-only string (YYYY-MM-DD) - treat as local date
      const [year, month, day] = dateString.split('-').map(Number)
      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        return 'Invalid Date'
      }
      // Create date in local timezone by using local date constructor
      date = new Date(year, month - 1, day) // month is 0-indexed
    }
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date'
    }
    
    // Default formatting options
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
      // Note: By default, toLocaleDateString uses the user's local timezone
      // No need to specify timeZone option
    }
    
    // Merge with custom options if provided
    const finalOptions = { ...defaultOptions, ...options }
    
    // Format the date using local timezone (default behavior)
    return date.toLocaleDateString('en-US', finalOptions)
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Invalid Date'
  }
}

/**
 * Formats a date string to include time information
 * Useful for timestamps like createdAt, updatedAt
 */
export const formatDateTime = (dateString: string, options?: Intl.DateTimeFormatOptions): string => {
  if (!dateString) return 'N/A'
  
  try {
    const date = new Date(dateString)
    
    if (isNaN(date.getTime())) {
      return 'Invalid Date'
    }
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
      // Note: By default, toLocaleString uses the user's local timezone
      // No need to specify timeZone option
    }
    
    const finalOptions = { ...defaultOptions, ...options }
    
    return date.toLocaleString('en-US', finalOptions)
  } catch (error) {
    console.error('Error formatting date time:', error)
    return 'Invalid Date'
  }
}

/**
 * Formats a date range from start and end dates
 */
export const formatDateRange = (startDate: string, endDate: string): string => {
  if (!startDate || !endDate) return 'N/A'
  
  const startFormatted = formatMonthYear(startDate)
  const endFormatted = formatMonthYear(endDate)
  
  if (startFormatted === 'N/A' || endFormatted === 'N/A') {
    return 'N/A'
  }
  
  return `${startFormatted} - ${endFormatted}`
}

/**
 * Calculates the duration in months between two dates
 */
export const calculateDuration = (startDate: string, endDate: string): number => {
  if (!startDate || !endDate) return 0
  
  const [startYear, startMonth] = startDate.split('-').map(Number)
  const [endYear, endMonth] = endDate.split('-').map(Number)
  
  if (isNaN(startYear) || isNaN(startMonth) || isNaN(endYear) || isNaN(endMonth)) {
    return 0
  }
  
  return (endYear - startYear) * 12 + (endMonth - startMonth) + 1
}

/**
 * Formats a payment date string to ensure it displays the correct local date
 * This function specifically handles the case where database dates might be
 * interpreted as UTC and need to be treated as local dates
 * 
 * Problem: When using new Date('2024-08-22'), JavaScript assumes UTC if no timezone
 * is specified. If the user is in a timezone ahead of UTC (e.g., UTC+1), this can
 * cause the date to shift backward by one day.
 * 
 * Solution: Parse the date components manually and create a Date object using
 * the local constructor new Date(year, month, day), which ensures the date
 * is created in the local timezone without any UTC conversion.
 */
export const formatPaymentDate = (dateString: string): string => {
  if (!dateString) return 'N/A'
  
  try {
    // For payment dates, we want to ensure the date is treated as local
    // Split the date string to avoid any timezone conversion
    const [year, month, day] = dateString.split('-').map(Number)
    
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return 'Invalid Date'
    }
    
    // Create date using local constructor to avoid timezone issues
    // This ensures the date is created in local timezone, not UTC
    const date = new Date(year, month - 1, day) // month is 0-indexed
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date'
    }
    
    // Format the date
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch (error) {
    console.error('Error formatting payment date:', error)
    return 'Invalid Date'
  }
}
