import React, { useState, useEffect, useCallback, useRef } from 'react'
import { 
  Search, 
  Download, 
  Printer, 
  Eye, 
  DollarSign,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Save,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import './Payouts.css'
import { useLanguage } from '../contexts/LanguageContext'
import '../components/PaymentTable.css'
import { Payout, PayoutDetails, FilterType, StatusFilter, SortField, SortDirection } from '../types/payout'
import { payoutService } from '../services/payoutService'
import { payoutDetailsService } from '../services/payoutDetailsService'
import { bankService } from '../services/bankService'
import { Bank } from '../types/bank'
import { pdfService } from '../services/pdfService'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const Payouts: React.FC = () => {
  const { t } = useLanguage()
  const tt = (key: string, fallback: string) => {
    const value = t(key) as unknown as string
    return value === key ? fallback : value
  }
  // Auth state
  const { user } = useAuth()
  const isAdminUser = user?.role === 'admin' || user?.role === 'super_user'
  const [currentUserMemberId, setCurrentUserMemberId] = useState<number | null>(null)
  
  // State for data
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [filteredPayouts, setFilteredPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filter state
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [filterValue, setFilterValue] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  
  // Month selection state
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    // Default to current month in YYYY-MM format (avoid timezone issues)
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    return `${year}-${month.toString().padStart(2, '0')}`
  })

  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('groupName')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(() => {
    // Get saved page size from localStorage, default to 10
    const savedPageSize = localStorage.getItem('payouts-page-size')
    return savedPageSize ? parseInt(savedPageSize, 10) : 10
  })
  
  // Modal state
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [lastSlotPaid, setLastSlotPaid] = useState(false)
  const [adminFeePaid, setAdminFeePaid] = useState(false)
  const [settledDeductionEnabled, setSettledDeductionEnabled] = useState(true)
  const [settledDeductionAmount, setSettledDeductionAmount] = useState(0)
  const [showPdfSuccess, setShowPdfSuccess] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  
  // Payout details state
  const [payoutDetails, setPayoutDetails] = useState<PayoutDetails | null>(null)
  const [isSavingPayoutDetails, setIsSavingPayoutDetails] = useState(false)
  const [payoutDetailsExist, setPayoutDetailsExist] = useState(false)
  const [additionalCost, setAdditionalCost] = useState(0)
  const [payoutDate, setPayoutDate] = useState(() => {
    // Default to today's date in YYYY-MM-DD format
    return new Date().toISOString().split('T')[0]
  })
  const [isPayoutPaid, setIsPayoutPaid] = useState(false)
  const [isProcessingPayout, setIsProcessingPayout] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedPayoutMonth, setSelectedPayoutMonth] = useState('')

  // Member payment status modal state
  const [isMemberStatusModalOpen, setIsMemberStatusModalOpen] = useState(false)
  const [selectedGroupName, setSelectedGroupName] = useState('')
  const [memberPaymentStatuses, setMemberPaymentStatuses] = useState<Array<{
    groupMemberId: number
    memberId: number
    memberName: string
    paymentStatus: 'not_paid' | 'pending' | 'received' | 'settled'
    paymentDate?: string
    paymentAmount?: number
  }>>([])
  const [loadingMemberStatuses, setLoadingMemberStatuses] = useState(false)

  // Banks and payment info state
  const [banks, setBanks] = useState<Bank[]>([])
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'cash'>('bank_transfer')
  const [senderBankId, setSenderBankId] = useState<number | null>(null)
  const [receiverBankId, setReceiverBankId] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const paymentErrorRef = useRef<HTMLDivElement>(null)

  // Calculate "To Receive" amount for a payout (final amount after all deductions)
  const calculateToReceiveAmount = (payout: Payout) => {
    // Use stored calculated amount if available, otherwise calculate on the fly
    if (payout.calculatedTotalAmount && payout.calculatedTotalAmount > 0) {
      return payout.calculatedTotalAmount
    }
    
    // Fallback calculation for payouts without stored calculated amount
    const baseAmount = payout.monthlyAmount * payout.duration
    
    // Use current modal state if this is the selected payout, otherwise use payout object values
    const isSelectedPayout = selectedPayout && selectedPayout.id === payout.id
    
    const lastSlotDeduction = isSelectedPayout 
      ? (lastSlotPaid ? 0 : payout.monthlyAmount)
      : (payout.lastSlot ? 0 : payout.monthlyAmount)
    
    const adminFeeDeduction = isSelectedPayout 
      ? (adminFeePaid ? 0 : 200)
      : (payout.administrationFee ? 0 : 200)
    
    const settledDeduction = isSelectedPayout 
      ? (settledDeductionEnabled ? settledDeductionAmount : 0)
      : (payout.settledDeduction || 0) // Use persistent data from payout object
    
    const additionalCostAmount = isSelectedPayout 
      ? additionalCost 
      : (payout.additionalCost || 0) // Use persistent data from payout object
    
    // Calculate sub-total after main deductions
    const subTotal = baseAmount - settledDeduction - lastSlotDeduction - adminFeeDeduction
    
    // Subtract additional cost from sub-total
    return subTotal - additionalCostAmount
  }

  // Calculate summary statistics
  const totalPayouts = filteredPayouts.length
  const totalToReceiveAmount = filteredPayouts.reduce((sum, payout) => sum + calculateToReceiveAmount(payout), 0) // Sum of "To Receive" amounts
  
  // Calculate completed and pending payouts based on payout status (whether marked as paid)
  const completedPayouts = filteredPayouts.filter(p => p.payout === true).length
  
  const pendingPayouts = filteredPayouts.filter(p => p.payout !== true).length
  
  // Calculate Total Paid (sum of "To Receive" amounts where payout = true)
  const totalPaid = filteredPayouts
    .filter(p => p.payout === true)
    .reduce((sum, payout) => sum + calculateToReceiveAmount(payout), 0)
  
  // Calculate Outstanding (total to receive minus total paid)
  const outstanding = totalToReceiveAmount - totalPaid
  
  // Get selected month for display (avoid timezone issues)
  const selectedMonthDisplay = (() => {
    const [year, month] = selectedMonth.split('-')
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    return `${monthNames[parseInt(month) - 1]} ${year}`
  })()
  
  // Get current month for comparison (avoid timezone issues)
  const currentMonth = (() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1 // getMonth() returns 0-11
    return `${year}-${month.toString().padStart(2, '0')}`
  })()
  


  // Calculate pagination
  const totalPages = Math.ceil(filteredPayouts.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const currentPayouts = filteredPayouts.slice(startIndex, endIndex)

  // Fetch current user's member ID
  const fetchCurrentUserMemberId = async () => {
    if (!user || isAdminUser) {
      setCurrentUserMemberId(null)
      return
    }

    try {
      const { data: memberData, error } = await supabase
        .from('members')
        .select('id')
        .eq('email', user.email)
        .single()

      if (error || !memberData) {
        setCurrentUserMemberId(null)
      } else {
        setCurrentUserMemberId(memberData.id)
      }
    } catch (error) {
      setCurrentUserMemberId(null)
    }
  }

  // Fetch payouts data
  const fetchPayouts = async (month?: string) => {
    try {
      setLoading(true)
      const targetMonth = month || selectedMonth
      let payoutsData = await payoutService.getAllPayouts(targetMonth)
      
      // Filter payouts based on user role
      if (!isAdminUser && currentUserMemberId !== null) {
        payoutsData = payoutsData.filter(payout => payout.memberId === currentUserMemberId)
      }
      
      setPayouts(payoutsData)
      // Don't set filteredPayouts here - let applyFilters handle it with proper sorting
    } catch (err) {
      setError('Failed to load payouts')
    } finally {
      setLoading(false)
    }
  }

  // Apply filters
  const applyFilters = useCallback(() => {
    let filtered = payouts

    // Apply text filter
    if (filterType !== 'all' && filterValue.trim()) {
      const searchValue = filterValue.toLowerCase().trim()
      filtered = filtered.filter(payout => {
        switch (filterType) {
          case 'memberName':
            return payout.memberName.toLowerCase().includes(searchValue)
          case 'groupName':
            return payout.groupName.toLowerCase().includes(searchValue)
          case 'bankName':
            return payout.bankName.toLowerCase().includes(searchValue)
          default:
            return true
        }
      })
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(payout => {
        if (payout.status.includes('/')) {
          const [received, total] = payout.status.split('/').map(Number)
          const percentage = total > 0 ? (received / total) * 100 : 0
          
          switch (statusFilter) {
            case 'completed':
              return percentage === 100
            case 'pending':
              return percentage < 100 && percentage > 0
            case 'processing':
              return percentage >= 50 && percentage < 100
            case 'failed':
              return percentage === 0
            default:
              return true
          }
        }
        return payout.status === statusFilter
      })
    }



    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'memberName':
          aValue = a.memberName.toLowerCase()
          bValue = b.memberName.toLowerCase()
          break
        case 'groupName':
          // Extract numeric part from group name for proper numerical sorting
          const aGroupNumber = parseInt(a.groupName.replace(/\D/g, '')) || 0
          const bGroupNumber = parseInt(b.groupName.replace(/\D/g, '')) || 0
          aValue = aGroupNumber
          bValue = bGroupNumber
          break
        case 'totalAmount':
          aValue = a.totalAmount
          bValue = b.totalAmount
          break
        case 'toReceive':
          aValue = calculateToReceiveAmount(a)
          bValue = calculateToReceiveAmount(b)
          break
        case 'status':
          // Handle fraction format for sorting
          if (a.status.includes('/') && b.status.includes('/')) {
            const [aReceived, aTotal] = a.status.split('/').map(Number)
            const [bReceived, bTotal] = b.status.split('/').map(Number)
            const aPercentage = aTotal > 0 ? (aReceived / aTotal) * 100 : 0
            const bPercentage = bTotal > 0 ? (bReceived / bTotal) * 100 : 0
            aValue = aPercentage
            bValue = bPercentage
          } else {
            aValue = a.status
            bValue = b.status
          }
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    setFilteredPayouts(filtered)
    setCurrentPage(1)
  }, [payouts, filterType, filterValue, statusFilter, sortField, sortDirection, selectedPayout, lastSlotPaid, adminFeePaid, settledDeductionEnabled, settledDeductionAmount, additionalCost])

  // Handle filter changes
  useEffect(() => {
    applyFilters()
  }, [applyFilters])

  // Save calculated amount to database
  const saveCalculatedAmountToDatabase = async (calculatedAmount: number, settledDeductionEnabled: boolean) => {
    if (!selectedPayout) return

    try {
      const success = await payoutService.updatePayoutCalculatedAmount(
        selectedPayout.slotId,
        calculatedAmount,
        settledDeductionEnabled
      )

      if (success) {
        // Update the payouts array with the new calculated amount
        setPayouts(prevPayouts => 
          prevPayouts.map(payout => 
            payout.slotId === selectedPayout.slotId 
              ? { 
                  ...payout, 
                  calculatedTotalAmount: calculatedAmount,
                  settledDeductionEnabled: settledDeductionEnabled
                }
              : payout
          )
        )
      }
    } catch (error) {
      console.error('Error saving calculated amount to database:', error)
    }
  }

  // Update payouts array when additional cost changes for selected payout
  useEffect(() => {
    if (selectedPayout) {
      setPayouts(prevPayouts => 
        prevPayouts.map(payout => 
          payout.id === selectedPayout.id 
            ? { ...payout, additionalCost: additionalCost }
            : payout
        )
      )
    }
  }, [additionalCost, selectedPayout])

  // Save calculated amount to database when calculation changes
  useEffect(() => {
    if (selectedPayout && isDetailsModalOpen) {
      const calculatedAmount = calculateTotalAmount()
      saveCalculatedAmountToDatabase(calculatedAmount, settledDeductionEnabled)
    }
  }, [selectedPayout, isDetailsModalOpen, lastSlotPaid, adminFeePaid, settledDeductionEnabled, settledDeductionAmount, additionalCost])

  // Load data on component mount
  useEffect(() => {
    fetchPayouts()
    fetchCurrentUserMemberId()
  }, [])

  // Refetch payouts when member ID changes
  useEffect(() => {
    if (currentUserMemberId !== null || isAdminUser) {
      fetchPayouts()
    }
  }, [currentUserMemberId, isAdminUser])

  // Refetch payouts when selected month changes
  useEffect(() => {
    if (currentUserMemberId !== null || isAdminUser) {
      fetchPayouts(selectedMonth)
    }
  }, [selectedMonth])

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Handle page size change
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
    setCurrentPage(1)
    // Save page size to localStorage
    localStorage.setItem('payouts-page-size', newPageSize.toString())
  }



  // Handle status badge click
  const handleStatusClick = async (payout: Payout) => {
    setSelectedGroupName(payout.groupName)
    setIsMemberStatusModalOpen(true)
    setLoadingMemberStatuses(true)

    try {
      const members = await payoutService.getGroupMembersWithPaymentStatus(
        payout.groupId,
        payout.receiveMonth
      )
      setMemberPaymentStatuses(members)
    } catch (error) {
      console.error('Error fetching member payment statuses:', error)
      setMemberPaymentStatuses([])
    } finally {
      setLoadingMemberStatuses(false)
    }
  }

  // Get status badge
  const getStatusBadge = (status: string, payout: Payout) => {
    // Check if status is in fraction format (e.g., "7/12")
    if (status.includes('/')) {
      const [received, total] = status.split('/').map(Number)
      const percentage = total > 0 ? (received / total) * 100 : 0
      
      // Determine status class based on completion percentage
      let statusClass = 'payout-status-pending'
      if (percentage === 100) {
        statusClass = 'payout-status-completed'
      } else if (percentage >= 50) {
        statusClass = 'payout-status-processing'
      } else if (percentage > 0) {
        statusClass = 'payout-status-pending'
      } else {
        statusClass = 'payout-status-failed'
      }
      
      return (
        <button
          type="button"
          className={`payouts-status-badge ${statusClass} fraction-format payouts-status-clickable`}
          onClick={() => handleStatusClick(payout)}
          title="Click to view member payment status"
        >
          {status}
        </button>
      )
    }
    
    // Fallback for old status format
    const statusClasses = {
      'completed': 'payout-status-completed',
      'pending': 'payout-status-pending',
      'processing': 'payout-status-processing',
      'failed': 'payout-status-failed'
    }
    
    const statusLabels = {
      'completed': 'COMPLETED',
      'pending': 'PENDING',
      'processing': 'PROCESSING',
      'failed': 'FAILED'
    }
    
    return (
      <button
        type="button"
        className={`payouts-status-badge ${statusClasses[status as keyof typeof statusClasses] || 'payout-status-pending'} payouts-status-clickable`}
        onClick={() => handleStatusClick(payout)}
        title="Click to view member payment status"
      >
        {statusLabels[status as keyof typeof statusLabels] || status}
      </button>
    )
  }

  // Calculate total amount based on toggle states
  const calculateTotalAmount = () => {
    if (!selectedPayout) return 0
    
    const baseAmount = selectedPayout.monthlyAmount * selectedPayout.duration
    const lastSlotDeduction = lastSlotPaid ? 0 : selectedPayout.monthlyAmount
    const adminFeeDeduction = adminFeePaid ? 0 : 200
    const settledDeduction = settledDeductionEnabled ? settledDeductionAmount : 0
    
    // Calculate sub-total after main deductions
    const subTotal = baseAmount - settledDeduction - lastSlotDeduction - adminFeeDeduction
    
    // Subtract additional cost from sub-total
    return subTotal - additionalCost
  }

  // Calculate sub-total amount (before additional cost)
  const calculateSubTotalAmount = () => {
    if (!selectedPayout) return 0
    
    const baseAmount = selectedPayout.monthlyAmount * selectedPayout.duration
    const lastSlotDeduction = lastSlotPaid ? 0 : selectedPayout.monthlyAmount
    const adminFeeDeduction = adminFeePaid ? 0 : 200
    const settledDeduction = settledDeductionEnabled ? settledDeductionAmount : 0
    
    return baseAmount - settledDeduction - lastSlotDeduction - adminFeeDeduction
  }

  // Fetch settled payments for the selected member for a specific month
  const fetchSettledPayments = async (memberId: number, payoutMonth: string) => {
    try {
      const { data: payments, error } = await supabase
        .from('payments')
        .select('amount')
        .eq('member_id', memberId)
        .eq('status', 'settled')
        .eq('payment_month', payoutMonth) // Filter by payment month to get month-specific settled deductions

      if (error) {
        console.error('Error fetching settled payments:', error)
        setSettledDeductionAmount(0)
        return
      }

      const totalSettledAmount = payments?.reduce((sum: number, payment: { amount: number }) => sum + payment.amount, 0) || 0
      setSettledDeductionAmount(totalSettledAmount)
      
      // Update the selected payout object with the settled deduction amount
      if (selectedPayout) {
        setSelectedPayout(prev => prev ? { ...prev, settledDeduction: totalSettledAmount } : null)
        
        // Also update the main payouts array so it persists in the table
        setPayouts(prevPayouts => 
          prevPayouts.map(payout => 
            payout.slotId === selectedPayout.slotId 
              ? { ...payout, settledDeduction: totalSettledAmount }
              : payout
          )
        )
      }
    } catch (error) {
      console.error('Error fetching settled payments:', error)
      setSettledDeductionAmount(0)
    }
  }

  // Handle view details
  // Format month to MMMM YYYY format
  const formatMonth = (monthString: string) => {
    try {
      // If the month string is in YYYY-MM format, convert it
      if (monthString.includes('-')) {
        const [year, month] = monthString.split('-')
        const date = new Date(parseInt(year), parseInt(month) - 1)
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      }
      // If it's already in a readable format, return as is
      return monthString
    } catch (error) {
      return monthString
    }
  }

  // Convert formatted month back to YYYY-MM format
  const convertMonthToYYYYMM = (formattedMonth: string) => {
    try {
      // If it's already in YYYY-MM format, return as is
      if (formattedMonth.includes('-') && formattedMonth.length === 7) {
        return formattedMonth
      }
      // Convert from "August 2025" to "2025-08"
      const date = new Date(formattedMonth)
      const year = date.getFullYear()
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      return `${year}-${month}`
    } catch (error) {
      return '2025-08' // Default fallback
    }
  }

  const handleViewDetails = async (payout: Payout) => {
    setSelectedPayout(payout)
    setIsDetailsModalOpen(true)
    
    // Set the month for the selected payout in MMMM YYYY format
    setSelectedPayoutMonth(formatMonth(payout.receiveMonth))
    
    try {
      // Load banks for dropdowns
      const banksData = await bankService.getAllBanks()
      setBanks(banksData)

      // Load existing payout details if they exist (using slot_id)
      const existingDetails = await payoutDetailsService.getPayoutDetails(payout.slotId)
      
      if (existingDetails) {
        setPayoutDetails(existingDetails)
        setLastSlotPaid(existingDetails.lastSlot)
        setAdminFeePaid(existingDetails.administrationFee)
        setSettledDeductionEnabled(payout.settledDeductionEnabled ?? true) // Use stored state or default to enabled
        setAdditionalCost(existingDetails.additionalCost)
        setPayoutDate(existingDetails.payoutDate)
        setIsPayoutPaid(existingDetails.payout)
        setPayoutDetailsExist(true)
        // Set payment info from existing
        setPaymentMethod(existingDetails.paymentMethod || 'bank_transfer')
        setSenderBankId(existingDetails.senderBankId ?? null)
        setReceiverBankId(existingDetails.receiverBankId ?? null)
        setNotes(existingDetails.notes || '')
      } else {
        // Create new payout details object
        const newPayoutDetails: PayoutDetails = {
          slotId: payout.slotId,
          groupId: payout.groupId,
          memberId: payout.memberId,
          monthlyAmount: payout.monthlyAmount,
          duration: payout.duration,
          lastSlot: false,
          administrationFee: false,
          payout: false,
          additionalCost: 0,
          payoutDate: new Date().toISOString().split('T')[0],
          payoutMonth: convertMonthToYYYYMM(selectedPayoutMonth),
          baseAmount: payout.totalAmount,
          settledDeduction: 0,
          paymentMethod: 'bank_transfer',
          senderBankId: null,
          receiverBankId: null,
          notes: ''
        }
        setPayoutDetails(newPayoutDetails)
        setLastSlotPaid(false)
        setAdminFeePaid(false)
        setSettledDeductionEnabled(payout.settledDeductionEnabled ?? true) // Use stored state or default to enabled
        setAdditionalCost(0)
        setPayoutDate(new Date().toISOString().split('T')[0])
        setIsPayoutPaid(false)
        setPayoutDetailsExist(false)
        setPaymentMethod('bank_transfer')
        setSenderBankId(null)
        setReceiverBankId(null)
        setNotes('')
      }
    } catch (error) {
      console.error('Error loading payout details:', error)
      // Set default values on error
      setPayoutDetails({
        slotId: payout.slotId,
        groupId: payout.groupId,
        memberId: payout.memberId,
        monthlyAmount: payout.monthlyAmount,
        duration: payout.duration,
        lastSlot: false,
        administrationFee: false,
        payout: false,
        additionalCost: 0,
        payoutDate: new Date().toISOString().split('T')[0],
        payoutMonth: convertMonthToYYYYMM(selectedPayoutMonth),
        baseAmount: payout.totalAmount,
        settledDeduction: 0,
        paymentMethod: 'bank_transfer',
        senderBankId: null,
        receiverBankId: null,
        notes: ''
      })
      setLastSlotPaid(false)
      setAdminFeePaid(false)
      setSettledDeductionEnabled(true) // Default to enabled
      setAdditionalCost(0)
      setPayoutDate(new Date().toISOString().split('T')[0])
      setIsPayoutPaid(false)
      setPayoutDetailsExist(false)
      setPaymentMethod('bank_transfer')
      setSenderBankId(null)
      setReceiverBankId(null)
      setNotes('')
    }
    
    // Fetch settled payments for the selected member for this specific payout month
    fetchSettledPayments(payout.memberId, payout.receiveMonth)
  }

  // Handle download
  const handleDownload = (_payout: Payout) => {
    // Implement PDF generation logic here
  }

  // Handle save/update payout details
  const handleSavePayoutDetails = async () => {
    if (!payoutDetails || !selectedPayout) return
    
    setIsSavingPayoutDetails(true)
    
    try {
      // Validate payment info
      if (paymentMethod === 'bank_transfer' && (!senderBankId || !receiverBankId)) {
        setPaymentError('Please select both banks for bank transfer.')
        setIsSavingPayoutDetails(false)
        return
      }
      setPaymentError(null)

      // Update payout details with current toggle states and new fields
      const updatedPayoutDetails: PayoutDetails = {
        ...payoutDetails,
        lastSlot: lastSlotPaid,
        administrationFee: adminFeePaid,
        additionalCost: additionalCost,
        payoutDate: payoutDate,
        payoutMonth: convertMonthToYYYYMM(selectedPayoutMonth),
        paymentMethod: paymentMethod,
        senderBankId: paymentMethod === 'bank_transfer' ? senderBankId : null,
        receiverBankId: paymentMethod === 'bank_transfer' ? receiverBankId : null,
        notes: notes || ''
      }
      
      // Save to database
      const savedDetails = await payoutDetailsService.savePayoutDetails(updatedPayoutDetails)
      
      // Update local state
      setPayoutDetails(savedDetails)
      setPayoutDetailsExist(true)
      
      // Update the payouts list to reflect the changes
      setPayouts(prevPayouts => 
        prevPayouts.map(p => 
          p.slotId === selectedPayout.slotId 
            ? { 
                ...p, 
                lastSlot: lastSlotPaid,
                administrationFee: adminFeePaid,
                additionalCost: additionalCost,
                payout: savedDetails.payout // Update payout status to reflect if it was marked as paid
              }
            : p
        )
      )
      
      // Show success message (you can implement a toast notification here)
      console.log('Payout details saved successfully')
      
    } catch (error) {
      console.error('Error saving payout details:', error)
      // Show error message (you can implement a toast notification here)
    } finally {
      setIsSavingPayoutDetails(false)
    }
  }

  // Handle payout - generate PDF
  const handlePayout = async (payout: Payout) => {
    setIsGeneratingPdf(true)
    setPdfError(null)
    setShowPdfSuccess(false)
    
    try {
      // Map selected bank IDs to names for PDF
      const senderBankName = banks.find(b => b.id === senderBankId)?.name || null
      const receiverBankName = banks.find(b => b.id === receiverBankId)?.name || null

      await pdfService.generatePayoutPDF(
        payout,
        lastSlotPaid,
        adminFeePaid,
        settledDeductionAmount,
        additionalCost,
        payoutDate,
        {
          paymentMethod: paymentMethod,
          senderBankName,
          receiverBankName,
          notes: notes || ''
        }
      )
      setShowPdfSuccess(true)
      setTimeout(() => setShowPdfSuccess(false), 3000) // Hide after 3 seconds
    } catch (error) {
      console.error('Error generating PDF:', error)
      setPdfError('Failed to generate PDF. Please try again.')
      setTimeout(() => setPdfError(null), 5000) // Hide after 5 seconds
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  // Handle payout status change
  const handlePayoutStatusChange = async () => {
    if (!payoutDetails || !selectedPayout) return
    
    // Check if payout details have been saved first (has an id)
    if (!payoutDetails.id) {
      setPaymentError('Please save the payout details first before marking as paid.')
      // Scroll to error message after a brief delay to ensure it's rendered
      setTimeout(() => {
        paymentErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
      setTimeout(() => setPaymentError(null), 5000) // Clear error after 5 seconds
      return
    }
    
    setIsProcessingPayout(true)
    
    try {
      const newPayoutStatus = !isPayoutPaid
      
      // Update payout details with new payout status
      const updatedPayoutDetails: PayoutDetails = {
        ...payoutDetails,
        payout: newPayoutStatus
      }
      
      // Save to database
      const savedDetails = await payoutDetailsService.savePayoutDetails(updatedPayoutDetails)
      
      // Update local state
      setPayoutDetails(savedDetails)
      setIsPayoutPaid(newPayoutStatus)
      
      // Update the payouts list to reflect the change
      setPayouts(prevPayouts => 
        prevPayouts.map(p => 
          p.slotId === selectedPayout.slotId 
            ? { ...p, payout: newPayoutStatus }
            : p
        )
      )
      
      console.log(`Payout status ${newPayoutStatus ? 'marked as paid' : 'undone'} successfully`)
      
    } catch (error) {
      console.error('Error updating payout status:', error)
      setPaymentError('Failed to update payout status. Please try again.')
      // Scroll to error message after a brief delay to ensure it's rendered
      setTimeout(() => {
        paymentErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
      setTimeout(() => setPaymentError(null), 5000)
    } finally {
      setIsProcessingPayout(false)
    }
  }

  // Handle print
  const handlePrint = () => {
    window.print()
  }

  // Clear filters
  const clearFilters = () => {
    setFilterType('all')
    setFilterValue('')
    setStatusFilter('all')
    // Reset to current month using the same logic as the state initialization
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    setSelectedMonth(`${year}-${month.toString().padStart(2, '0')}`)
  }

  if (loading) {
    return (
      <div className="payouts-page">
        <div className="payouts-loading">
          <div className="payouts-spinner"></div>
          <p>{t('payouts.loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="payouts-page">
        <div className="payouts-error">
          <AlertCircle className="payouts-error-icon" />
          <h2>{t('payouts.error.title')}</h2>
          <p>{error}</p>
          <button onClick={() => fetchPayouts()} className="payouts-retry-btn">
            {t('payouts.retry')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="payouts-page">
      {/* Header */}
      <div className="payouts-header">
        <div className="payouts-header-content">
          <h1 className="payouts-title">{t('payouts.title')}</h1>
          <p className="payouts-subtitle">
            {selectedMonth === currentMonth 
              ? t('payouts.subtitle.current').replace('{month}', selectedMonthDisplay)
              : t('payouts.subtitle.other').replace('{month}', selectedMonthDisplay)
            }
          </p>
        </div>
        <div className="payouts-header-actions">
          <button onClick={handlePrint} className="payouts-print-btn">
            <Printer className="payouts-btn-icon" />
            {t('payouts.print')}
          </button>
        </div>
      </div>

      {/* Privacy Notice for Normal Users */}
      {!isAdminUser && (
        <div className="payouts-privacy-notice">
          <div className="payouts-privacy-icon">
            <Eye className="payouts-privacy-icon-svg" />
          </div>
          <div className="payouts-privacy-content">
            <h3>{t('payouts.privacy.title')}</h3>
            <p>{t('payouts.privacy.body')}</p>
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="payouts-summary">
        <div className="payouts-summary-card">
          <div className="payouts-summary-icon">
            <DollarSign className="payouts-summary-icon-svg" />
          </div>
          <div className="payouts-summary-content">
            <h3>
              {selectedMonth === currentMonth 
                ? t('payouts.summary.amount.current') 
                : t('payouts.summary.amount.other').replace('{month}', selectedMonthDisplay)
              }
            </h3>
            <div className="payouts-summary-value">SRD {totalToReceiveAmount.toLocaleString()}</div>
          </div>
        </div>
        
        <div className="payouts-summary-card">
          <div className="payouts-summary-icon">
            <CheckCircle className="payouts-summary-icon-svg" />
          </div>
          <div className="payouts-summary-content">
            <h3>Total Paid</h3>
            <div className="payouts-summary-value">SRD {totalPaid.toLocaleString()}</div>
          </div>
        </div>
        
        <div className="payouts-summary-card">
          <div className="payouts-summary-icon">
            <AlertCircle className="payouts-summary-icon-svg" />
          </div>
          <div className="payouts-summary-content">
            <h3>Outstanding</h3>
            <div className="payouts-summary-value">SRD {outstanding.toLocaleString()}</div>
          </div>
        </div>
        
        <div className="payouts-summary-card">
          <div className="payouts-summary-icon">
            <Users className="payouts-summary-icon-svg" />
          </div>
          <div className="payouts-summary-content">
            <h3>
              {selectedMonth === currentMonth 
                ? t('payouts.summary.count.current') 
                : t('payouts.summary.count.other').replace('{month}', selectedMonthDisplay)
              }
            </h3>
            <div className="payouts-summary-value">{totalPayouts}</div>
          </div>
        </div>
        
        <div className="payouts-summary-card">
          <div className="payouts-summary-icon">
            <CheckCircle className="payouts-summary-icon-svg" />
          </div>
          <div className="payouts-summary-content">
            <h3>{t('payouts.summary.completed')}</h3>
            <div className="payouts-summary-value">{completedPayouts}</div>
          </div>
        </div>
        
        <div className="payouts-summary-card">
          <div className="payouts-summary-icon">
            <Clock className="payouts-summary-icon-svg" />
          </div>
          <div className="payouts-summary-content">
            <h3>{t('payouts.summary.pending')}</h3>
            <div className="payouts-summary-value">{pendingPayouts}</div>
          </div>
        </div>
      </div>

      {/* Selected Month Note */}
      <div className="payouts-current-month-note">
        <p>{t('payouts.note.showing').replace('{month}', selectedMonthDisplay).replace('{month}', selectedMonthDisplay)}</p>
      </div>

      {/* Filters Button */}
      <div className="payouts-filters-toggle">
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="payouts-filters-btn"
        >
          <Filter className="payouts-btn-icon" />
          {t('payouts.filters.toggle')}
          {showFilters ? <ChevronUp className="payouts-btn-icon" /> : <ChevronDown className="payouts-btn-icon" />}
        </button>
      </div>

      {/* Filters */}
      <div className={`payouts-filters ${showFilters ? 'payouts-filters-open' : 'payouts-filters-closed'}`}>
        <div className="payouts-filters-row">
          <div className="payouts-filter-group">
            <label className="payouts-filter-label">{t('payouts.filters.type')}</label>
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="payouts-filter-select"
            >
              <option value="all">{t('payouts.filters.type.all')}</option>
              <option value="memberName">{t('payouts.filters.type.member')}</option>
              <option value="groupName">{t('payouts.filters.type.group')}</option>
              <option value="bankName">{t('payouts.filters.type.bank')}</option>
            </select>
          </div>
          
          <div className="payouts-filter-group">
            <label className="payouts-filter-label">{t('payouts.filters.search')}</label>
            <div className="payouts-search-input">
              <Search className="payouts-search-icon" />
              <input
                type="text"
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                placeholder={t('payouts.filters.search.placeholder')}
                className="payouts-search-field"
              />
            </div>
          </div>
          
          <div className="payouts-filter-group">
            <label className="payouts-filter-label">{t('payouts.filters.status')}</label>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="payouts-filter-select"
            >
              <option value="all">{t('payouts.filters.status.all')}</option>
              <option value="completed">{t('payouts.summary.completed')}</option>
              <option value="pending">{t('payouts.summary.pending')}</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          
          <div className="payouts-filter-group">
            <label className="payouts-filter-label">{t('payouts.filters.month')}</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="payouts-date-input"
            />
          </div>
          

        </div>
        
        <div className="payouts-filters-actions">
          <button onClick={clearFilters} className="payouts-clear-filters-btn">
            {t('payouts.filters.clear')}
          </button>
        </div>
      </div>

      {/* Payouts Table */}
      <div className="payouts-table-container">
        <table className="payouts-table">
          <thead className="payouts-table-header">
            <tr>
              <th 
                className="payouts-table-header-cell sortable col-member"
                onClick={() => handleSort('memberName')}
              >
                {t('payouts.table.member')}
                {sortField === 'memberName' && (
                  <span className="payouts-sort-indicator">
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              <th 
                className="payouts-table-header-cell sortable col-group"
                onClick={() => handleSort('groupName')}
              >
                {t('payouts.table.group')}
                {sortField === 'groupName' && (
                  <span className="payouts-sort-indicator">
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              <th 
                className="payouts-table-header-cell sortable col-total"
                onClick={() => handleSort('totalAmount')}
              >
                {t('payouts.table.total')}
                {sortField === 'totalAmount' && (
                  <span className="payouts-sort-indicator">
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              <th 
                className="payouts-table-header-cell sortable col-to-receive"
                onClick={() => handleSort('toReceive')}
              >
                To Receive
                {sortField === 'toReceive' && (
                  <span className="payouts-sort-indicator">
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              <th 
                className="payouts-table-header-cell sortable col-status"
                onClick={() => handleSort('status')}
              >
                {t('payouts.table.status')}
                {sortField === 'status' && (
                  <span className="payouts-sort-indicator">
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              <th className="payouts-table-header-cell col-bank">{t('payouts.table.bank')}</th>
              <th className="payouts-table-header-cell col-saved">Saved</th>
              <th className="payouts-table-header-cell col-actions">{t('payouts.table.actions')}</th>
            </tr>
          </thead>
          <tbody className="payouts-table-body">
            {currentPayouts.length === 0 ? (
              <tr className="payouts-table-empty-row">
                <td colSpan={8} className="payouts-table-empty-cell">
                  <div className="payouts-empty-state">
                    <p>{t('payouts.empty.title').replace('{month}', selectedMonthDisplay)}</p>
                    <p>{t('payouts.empty.desc')}</p>
                    <button onClick={clearFilters} className="payouts-clear-filters-btn">
                      {t('payouts.filters.clear')}
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              currentPayouts.map((payout) => (
                <tr key={payout.slotId} className={`payouts-table-row ${payout.payout ? 'payouts-table-row-paid' : ''}`}>
                  <td className="payouts-table-cell col-member">
                    <div className="payouts-member-info">
                      <span className="payouts-member-name">{payout.memberName}</span>
                      <span className="payouts-member-id">ID: {payout.memberId}</span>
                    </div>
                  </td>
                  <td className="payouts-table-cell col-group">
                    <span className="payouts-group-name">{payout.groupName}</span>
                  </td>
                  <td className="payouts-table-cell col-total">
                    <div className="payouts-amount-info">
                      <span className="payouts-total-amount">SRD {payout.totalAmount.toLocaleString()}</span>
                      <span className="payouts-monthly-amount">
                        SRD {payout.monthlyAmount}/month
                      </span>
                    </div>
                  </td>
                  <td className="payouts-table-cell col-to-receive">
                    <div className="payouts-amount-info">
                      <span className="payouts-to-receive-amount">SRD {calculateToReceiveAmount(payout).toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="payouts-table-cell col-status">
                    {getStatusBadge(payout.status, payout)}
                  </td>
                  <td className="payouts-table-cell col-bank">
                    <div className="payouts-bank-info">
                      <span className="payouts-bank-name">{payout.bankName}</span>
                      <span className="payouts-account-number">
                        ****{payout.accountNumber.slice(-4)}
                      </span>
                    </div>
                  </td>
                  <td className="payouts-table-cell col-saved">
                    <div className="payouts-save-status">
                      {payout.id > 0 ? (
                        <div className="payouts-save-indicator payouts-save-indicator-saved" title="Saved to database">
                          <CheckCircle size={20} />
                        </div>
                      ) : (
                        <div className="payouts-save-indicator payouts-save-indicator-unsaved" title="Not saved to database">
                          <XCircle size={20} />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="payouts-table-cell col-actions payment-table-actions">
                    <div className="payment-table-actions">
                      <button 
                        onClick={() => handleViewDetails(payout)}
                        className="payment-table-action-btn payment-table-action-view"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => handleDownload(payout)}
                        className="payment-table-action-btn payment-table-action-edit"
                        title="Download"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="payouts-pagination">
          <div className="payouts-pagination-info">
            <span>
              {t('payouts.pagination.showing')
                .replace('{from}', String(startIndex + 1))
                .replace('{to}', String(Math.min(endIndex, filteredPayouts.length)))
                .replace('{total}', String(filteredPayouts.length))}
            </span>
          </div>
          
          <div className="payouts-pagination-controls">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="payouts-pagination-btn"
            >
              <ChevronLeft className="payouts-pagination-icon" />
              <span className="payouts-pagination-label">{t('payouts.pagination.previous')}</span>
            </button>
            
            <div className="payouts-page-numbers">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`payouts-page-btn ${currentPage === page ? 'active' : ''}`}
                >
                  {page}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="payouts-pagination-btn"
            >
              <span className="payouts-pagination-label">{t('payouts.pagination.next')}</span>
              <ChevronRight className="payouts-pagination-icon" />
            </button>
          </div>
          
          <div className="payouts-page-size">
            <label className="payouts-page-size-label">{t('payouts.pagination.show')}</label>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="payouts-page-size-select"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      )}

      {/* Payout Details Modal */}
      {isDetailsModalOpen && selectedPayout && (
        <div className="payouts-modal-overlay">
          <div className="payouts-modal">
            <div className={`payouts-modal-header ${isPayoutPaid ? 'payouts-modal-header-paid' : ''}`}>
              <div className="payouts-modal-header-content">
                <div className="payouts-modal-header-left">
                  <h2 className="payouts-modal-title">Payout Details</h2>
                  <p className="payouts-modal-subtitle">
                    {isPayoutPaid 
                      ? `${selectedPayout.memberName} from ${selectedPayout.groupName} is fully paid.`
                      : `Calculate the payout amount for ${selectedPayout.memberName} from ${selectedPayout.groupName}`
                    }
                  </p>
                </div>
                <div className="payouts-modal-header-right">
                  <div className="payouts-modal-month-field">
                    <span className="payouts-modal-month-value">{selectedPayoutMonth}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsDetailsModalOpen(false)}
                className="payouts-modal-close-btn"
              >
                <XCircle className="payouts-modal-close-icon" />
              </button>
            </div>
            
            <div className="payouts-modal-content">
              {/* Group Information Section */}
              <div className="payouts-details-section">
                <h3 className="payouts-details-section-title">Group Information</h3>
                <div className="payouts-details-grid">
                  <div className="payouts-detail-item">
                    <span className="payouts-detail-label">Group Name</span>
                    <span className="payouts-detail-value">{selectedPayout.groupName}</span>
                  </div>
                  <div className="payouts-detail-item">
                    <span className="payouts-detail-label">Monthly Amount</span>
                    <span className="payouts-detail-value">SRD {selectedPayout.monthlyAmount.toLocaleString()}.00</span>
                  </div>
                  <div className="payouts-detail-item">
                    <span className="payouts-detail-label">Duration</span>
                    <span className="payouts-detail-value">{selectedPayout.duration} months</span>
                  </div>
                  <div className="payouts-detail-item">
                    <span className="payouts-detail-label">Administration Fee</span>
                    <span className="payouts-detail-value">SRD 200.00</span>
                  </div>
                </div>
              </div>
              
              {/* Recipient Information Section */}
              <div className="payouts-details-section">
                <h3 className="payouts-details-section-title">Recipient Information</h3>
                <div className="payouts-details-grid">
                  <div className="payouts-detail-item">
                    <span className="payouts-detail-label">Recipient Name</span>
                    <span className="payouts-detail-value">{selectedPayout.memberName}</span>
                  </div>
                  <div className="payouts-detail-item">
                    <span className="payouts-detail-label">National ID</span>
                    <span className="payouts-detail-value">{selectedPayout.nationalId}</span>
                  </div>
                  <div className="payouts-detail-item">
                    <span className="payouts-detail-label">Bank</span>
                    <span className="payouts-detail-value">{selectedPayout.bankName}</span>
                  </div>
                  <div className="payouts-detail-item">
                    <span className="payouts-detail-label">Account Number</span>
                    <span className="payouts-detail-value">{selectedPayout.accountNumber}</span>
                  </div>
                </div>
              </div>
              
              {/* Payment Information Section */}
              <div className="payouts-details-section">
                <h3 className="payouts-details-section-title">{tt('payouts.payment.sectionTitle', 'Payment Information')}</h3>
                <div className="payouts-payment-info">
                  <div className="payouts-status-toggle">
                    <span className="payouts-status-label">{tt('payouts.payment.method', 'Payment Method')}</span>
                    <div className="payouts-toggle-switch">
                      <input 
                        type="checkbox" 
                        id="paymentMethodToggle" 
                        className="payouts-toggle-input"
                        checked={paymentMethod === 'bank_transfer'}
                        onChange={(e) => {
                          const isBank = e.target.checked
                          setPaymentMethod(isBank ? 'bank_transfer' : 'cash')
                          if (!isBank) { setSenderBankId(null); setReceiverBankId(null) }
                        }}
                      />
                      <label htmlFor="paymentMethodToggle" className="payouts-toggle-label"></label>
                    </div>
                    <span className="payouts-status-value">{paymentMethod === 'bank_transfer' ? tt('payouts.payment.bankTransfer', 'Bank Transfer') : tt('payouts.payment.cash', 'Cash')}</span>
                  </div>

                  <div className="payouts-payment-grid">
                    <div className="payouts-detail-item">
                      <label className="payouts-detail-label">{tt('payouts.payment.senderBank', "Sranan Kasmoni's Bank")}</label>
                      <select
                        className="payouts-filter-select"
                        value={senderBankId ?? ''}
                        onChange={(e) => setSenderBankId(e.target.value ? Number(e.target.value) : null)}
                        disabled={paymentMethod !== 'bank_transfer'}
                      >
                        <option value="">{tt('payouts.payment.selectBank', 'Select bank')}</option>
                        {banks.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="payouts-detail-item">
                      <label className="payouts-detail-label">{tt('payouts.payment.receiverBank', `${selectedPayout.memberName.split(' ')[0]}'s Bank`)}</label>
                      <select
                        className="payouts-filter-select"
                        value={receiverBankId ?? ''}
                        onChange={(e) => setReceiverBankId(e.target.value ? Number(e.target.value) : null)}
                        disabled={paymentMethod !== 'bank_transfer'}
                      >
                        <option value="">{tt('payouts.payment.selectBank', 'Select bank')}</option>
                        {banks.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="payouts-detail-item" style={{ gridColumn: '1 / -1' }}>
                      <label className="payouts-detail-label">{tt('payouts.payment.notes', 'Notes')}</label>
                      <input
                        type="text"
                        className="payouts-search-field"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value.slice(0, 100))}
                        placeholder={tt('payouts.payment.notesPlaceholder', 'Optional (max 100 characters)')}
                      />
                    </div>
                  </div>

                  {paymentError && (
                    <div ref={paymentErrorRef} className="payouts-pdf-error" style={{ marginTop: 8 }}>
                      <span>✗ {paymentError}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Deductions Section */}
              <div className="payouts-details-section">
                <h3 className="payouts-details-section-title">Deductions</h3>
                <div className="payouts-payment-status">
                  <div className="payouts-status-toggle">
                    <span className="payouts-status-label">Settled Deduction</span>
                    <div className="payouts-toggle-switch">
                      <input 
                        type="checkbox" 
                        id="settledDeductionToggle" 
                        className="payouts-toggle-input"
                        checked={settledDeductionEnabled}
                        onChange={(e) => setSettledDeductionEnabled(e.target.checked)}
                      />
                      <label htmlFor="settledDeductionToggle" className="payouts-toggle-label"></label>
                    </div>
                  </div>
                  <div className="payouts-status-toggle">
                    <span className="payouts-status-label">Last Slot</span>
                    <div className="payouts-toggle-switch">
                      <input 
                        type="checkbox" 
                        id="lastSlotToggle" 
                        className="payouts-toggle-input"
                        checked={lastSlotPaid}
                        onChange={(e) => setLastSlotPaid(e.target.checked)}
                      />
                      <label htmlFor="lastSlotToggle" className="payouts-toggle-label"></label>
                    </div>
                  </div>
                  <div className="payouts-status-toggle">
                    <span className="payouts-status-label">Administration Fee</span>
                    <div className="payouts-toggle-switch">
                      <input 
                        type="checkbox" 
                        id="adminFeeToggle" 
                        className="payouts-toggle-input"
                        checked={adminFeePaid}
                        onChange={(e) => setAdminFeePaid(e.target.checked)}
                      />
                      <label htmlFor="adminFeeToggle" className="payouts-toggle-label"></label>
                    </div>
                  </div>
                  <div className="payouts-additional-cost">
                    <label htmlFor="additionalCost" className="payouts-additional-cost-label">Additional Cost (SRD)</label>
                    <input
                      type="number"
                      id="additionalCost"
                      className="payouts-additional-cost-input"
                      value={additionalCost}
                      onChange={(e) => setAdditionalCost(parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>
                </div>

              </div>
              
              {/* Calculation Breakdown Section */}
              <div className="payouts-details-section">
                <h3 className="payouts-details-section-title">Calculation Breakdown</h3>
                <div className="payouts-calculation-breakdown">
                  <div className="payouts-calculation-row">
                    <span className="payouts-calculation-label">Base Amount</span>
                    <span className="payouts-calculation-value">SRD {(selectedPayout.monthlyAmount * selectedPayout.duration).toLocaleString()}.00</span>
                  </div>
                  <div className="payouts-calculation-row">
                    <span className="payouts-calculation-label">Settled Deduction</span>
                    <span className={`payouts-calculation-value ${settledDeductionEnabled && settledDeductionAmount > 0 ? 'deduction' : 'no-deduction'}`}>
                      {settledDeductionEnabled && settledDeductionAmount > 0 ? `-SRD ${settledDeductionAmount.toLocaleString()}.00` : 'SRD 0.00'}
                    </span>
                  </div>
                  <div className="payouts-calculation-row">
                    <span className="payouts-calculation-label">Last Slot Deduction</span>
                    <span className={`payouts-calculation-value ${lastSlotPaid ? 'no-deduction' : 'deduction'}`}>
                      {lastSlotPaid ? 'SRD 0.00' : `-SRD ${selectedPayout.monthlyAmount.toLocaleString()}.00`}
                    </span>
                  </div>
                  <div className="payouts-calculation-row">
                    <span className="payouts-calculation-label">Administration Fee Deduction</span>
                    <span className={`payouts-calculation-value ${adminFeePaid ? 'no-deduction' : 'deduction'}`}>
                      {adminFeePaid ? 'SRD 0.00' : '-SRD 200.00'}
                    </span>
                  </div>
                  <div className="payouts-calculation-row subtotal">
                    <span className="payouts-calculation-label">Sub-total Amount</span>
                    <span className="payouts-calculation-value subtotal-amount">
                      SRD {calculateSubTotalAmount().toLocaleString()}.00
                    </span>
                  </div>
                  <div className="payouts-calculation-row">
                    <span className="payouts-calculation-label">Additional Cost</span>
                    <span className={`payouts-calculation-value ${additionalCost > 0 ? 'deduction' : 'no-deduction'}`}>
                      {additionalCost > 0 ? `-SRD ${additionalCost.toLocaleString()}.00` : 'SRD 0.00'}
                    </span>
                  </div>
                  <div className="payouts-calculation-row total">
                    <span className="payouts-calculation-label">Total Amount</span>
                    <span className="payouts-calculation-value total-amount">
                      SRD {calculateTotalAmount().toLocaleString()}.00
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="payouts-modal-footer">
              {showPdfSuccess && (
                <div className="payouts-pdf-success">
                  <span>✓ PDF generated successfully!</span>
                </div>
              )}
              {pdfError && (
                <div className="payouts-pdf-error">
                  <span>✗ {pdfError}</span>
                </div>
              )}
              <div className="payouts-modal-footer-content">
                <div className="payouts-payout-date">
                  <label htmlFor="payoutDate" className="payouts-payout-date-label">Payout Date:</label>
                  <input
                    type="date"
                    id="payoutDate"
                    className="payouts-payout-date-input"
                    value={payoutDate}
                    onChange={(e) => setPayoutDate(e.target.value)}
                  />
                </div>
                <div className="payouts-modal-footer-buttons">
                <button 
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="payouts-modal-cancel-btn"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSavePayoutDetails}
                  className="payouts-modal-save-btn"
                  disabled={isSavingPayoutDetails || (paymentMethod === 'bank_transfer' && (!senderBankId || !receiverBankId))}
                >
                  {isSavingPayoutDetails ? (
                    <>
                      <Loader2 className="payouts-loading-icon" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="payouts-btn-icon" />
                      {payoutDetailsExist ? 'Update' : 'Save'}
                    </>
                  )}
                </button>
                <button 
                  onClick={handlePayoutStatusChange}
                  className={`payouts-modal-payout-status-btn ${isPayoutPaid ? 'payouts-paid' : 'payouts-unpaid'}`}
                  disabled={isProcessingPayout}
                >
                  {isProcessingPayout ? (
                    <>
                      <Loader2 className="payouts-loading-icon" />
                      Processing...
                    </>
                  ) : (
                    isPayoutPaid ? 'Undo Payout' : 'Payout'
                  )}
                </button>
                <button 
                  onClick={() => handlePayout(selectedPayout)}
                  className="payouts-modal-payout-btn"
                  disabled={isGeneratingPdf}
                >
                  {isGeneratingPdf ? (
                    <>
                      <Loader2 className="payouts-loading-icon" />
                      Generating PDF...
                    </>
                  ) : (
                    'Save PDF'
                  )}
                </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Member Payment Status Modal */}
      {isMemberStatusModalOpen && (
        <div className="payouts-modal-overlay" onClick={() => setIsMemberStatusModalOpen(false)}>
          <div className="payouts-member-status-modal" onClick={(e) => e.stopPropagation()}>
            <div className="payouts-member-status-header">
              <div className="payouts-member-status-header-text">
                <h2 className="payouts-member-status-title">Member Payment Status</h2>
                <p className="payouts-member-status-subtitle">
                  {selectedGroupName} - {selectedMonthDisplay}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMemberStatusModalOpen(false)}
                className="payouts-member-status-close-btn"
                aria-label="Close member payment status"
              >
                <XCircle className="payouts-member-status-close-icon" />
              </button>
            </div>

            <div className="payouts-member-status-body">
              {loadingMemberStatuses ? (
                <div className="payouts-loading">
                  <div className="payouts-spinner"></div>
                  <p>Loading member payment statuses...</p>
                </div>
              ) : memberPaymentStatuses.length === 0 ? (
                <div className="payouts-empty-state">
                  <p>No members found for this group.</p>
                </div>
              ) : (
                <div className="payouts-member-status-table-wrapper">
                  <table className="payouts-member-status-table">
                    <thead>
                      <tr>
                        <th>Member Name</th>
                        <th>Payment Status</th>
                        <th>Payment Date</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {memberPaymentStatuses.map((member) => (
                        <tr key={member.groupMemberId}>
                          <td className="payouts-member-status-name">{member.memberName}</td>
                          <td className="payouts-member-status-status">
                            {getMemberPaymentStatusBadge(member.paymentStatus)}
                          </td>
                          <td className="payouts-member-status-date">
                            {member.paymentDate
                              ? new Date(member.paymentDate).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })
                              : '-'}
                          </td>
                          <td className="payouts-member-status-amount">
                            {member.paymentAmount ? `SRD ${member.paymentAmount.toLocaleString()}` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="payouts-member-status-footer">
              <button
                type="button"
                onClick={() => setIsMemberStatusModalOpen(false)}
                className="payouts-member-status-close-action"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const getMemberPaymentStatusBadge = (status: 'not_paid' | 'pending' | 'received' | 'settled') => {
  const badgeMap = {
    settled: { label: 'SETTLED', className: 'payouts-member-status-badge--settled' },
    received: { label: 'RECEIVED', className: 'payouts-member-status-badge--received' },
    pending: { label: 'PENDING', className: 'payouts-member-status-badge--pending' },
    not_paid: { label: 'NOT PAID', className: 'payouts-member-status-badge--not-paid' }
  }

  const badge = badgeMap[status] || badgeMap.not_paid

  return (
    <span className={`payouts-member-status-badge ${badge.className}`}>
      {badge.label}
    </span>
  )
}

export default Payouts
