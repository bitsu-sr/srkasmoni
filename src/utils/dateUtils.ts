/**
 * Utility functions for date handling
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
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  
  const result = `${monthNames[month - 1]} ${year}`
  
  return result
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
