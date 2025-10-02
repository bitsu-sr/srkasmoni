import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import './MonthFilter.css'

interface MonthFilterProps {
  selectedMonth: string
  onMonthChange: (month: string) => void
  className?: string
}

const MonthFilter = ({ selectedMonth, onMonthChange, className = '' }: MonthFilterProps) => {
  const [currentMonth, setCurrentMonth] = useState(selectedMonth)
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [displayYear, setDisplayYear] = useState(() => {
    const [year] = selectedMonth.split('-').map(Number)
    return year
  })
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCurrentMonth(selectedMonth)
    const [year] = selectedMonth.split('-').map(Number)
    setDisplayYear(year)
  }, [selectedMonth])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsPickerOpen(false)
      }
    }

    if (isPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isPickerOpen])

  const formatMonthDisplay = (monthString: string): string => {
    const [year, month] = monthString.split('-').map(Number)
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    return `${monthNames[month - 1]} ${year}`
  }


  const goToPreviousMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number)
    let newYear = year
    let newMonth = month - 1
    
    if (newMonth < 1) {
      newMonth = 12
      newYear = year - 1
    }
    
    const newMonthString = `${newYear}-${String(newMonth).padStart(2, '0')}`
    setCurrentMonth(newMonthString)
    onMonthChange(newMonthString)
  }

  const goToNextMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number)
    let newYear = year
    let newMonth = month + 1
    
    if (newMonth > 12) {
      newMonth = 1
      newYear = year + 1
    }
    
    const newMonthString = `${newYear}-${String(newMonth).padStart(2, '0')}`
    setCurrentMonth(newMonthString)
    onMonthChange(newMonthString)
  }

  const goToCurrentMonth = () => {
    const now = new Date()
    const currentMonthString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    setCurrentMonth(currentMonthString)
    setDisplayYear(now.getFullYear())
    onMonthChange(currentMonthString)
    setIsPickerOpen(false)
  }

  const handleMonthSelect = (monthString: string) => {
    setCurrentMonth(monthString)
    onMonthChange(monthString)
    setIsPickerOpen(false)
  }

  const goToPreviousYear = () => {
    setDisplayYear(prev => prev - 1)
  }

  const goToNextYear = () => {
    setDisplayYear(prev => prev + 1)
  }

  const getMonthsForYear = (year: number) => {
    const monthAbbrevs = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ]
    
    return monthAbbrevs.map((abbrev, index) => ({
      value: `${year}-${String(index + 1).padStart(2, '0')}`,
      label: abbrev,
      month: index + 1
    }))
  }

  const monthsForDisplayYear = getMonthsForYear(displayYear)

  return (
    <div className={`month-filter ${className}`}>
      <button 
        className="month-filter-btn month-filter-prev"
        onClick={goToPreviousMonth}
        aria-label="Previous month"
      >
        <ChevronLeft size={20} />
      </button>
      
      <div className="month-filter-picker-container" ref={dropdownRef}>
        <button 
          className="month-filter-picker-btn"
          onClick={() => setIsPickerOpen(!isPickerOpen)}
          aria-label="Select month"
        >
          <Calendar size={16} />
          <span className="month-filter-text">{formatMonthDisplay(currentMonth)}</span>
        </button>
        
        {isPickerOpen && (
          <div className="month-filter-dropdown">
            {/* Header with year navigation */}
            <div className="month-filter-header">
              <button 
                className="month-filter-year-btn"
                onClick={goToPreviousYear}
                aria-label="Previous year"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="month-filter-year-display">
                <Calendar size={16} />
                <span className="month-filter-year-text">{formatMonthDisplay(currentMonth)}</span>
              </div>
              <button 
                className="month-filter-year-btn"
                onClick={goToNextYear}
                aria-label="Next year"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            
            {/* Year display */}
            <div className="month-filter-year-bar">
              {displayYear}
            </div>
            
            {/* Month grid */}
            <div className="month-filter-grid">
              {monthsForDisplayYear.map((month) => (
                <button
                  key={month.value}
                  className={`month-filter-month-btn ${currentMonth === month.value ? 'selected' : ''}`}
                  onClick={() => handleMonthSelect(month.value)}
                >
                  {month.label}
                </button>
              ))}
            </div>
            
            {/* Footer buttons */}
            <div className="month-filter-footer">
              <button 
                className="month-filter-clear-btn"
                onClick={() => {
                  const now = new Date()
                  const currentMonthString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
                  handleMonthSelect(currentMonthString)
                }}
              >
                Clear
              </button>
              <button 
                className="month-filter-this-month-btn"
                onClick={goToCurrentMonth}
              >
                This month
              </button>
            </div>
          </div>
        )}
      </div>
      
      <button 
        className="month-filter-btn month-filter-next"
        onClick={goToNextMonth}
        aria-label="Next month"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  )
}

export default MonthFilter
