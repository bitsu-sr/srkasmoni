import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { TrendingUp, DollarSign, Users, Calendar, Building2, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { useState, useEffect } from 'react'
import { paymentService } from '../services/paymentService'
import { groupService } from '../services/groupService'
import { formatDate } from '../utils/dateUtils'
import './Analytics.css'

const Analytics = () => {
  const [receiverBankData, setReceiverBankData] = useState<Array<{ bankName: string; totalAmount: number; paymentCount: number }>>([])
  const [senderBankData, setSenderBankData] = useState<Array<{ bankName: string; totalAmount: number; paymentCount: number }>>([])
  const [groupProgressData, setGroupProgressData] = useState<Array<{ groupName: string; progressPercentage: number; slotsPaid: number; slotsTotal: number }>>([])
  const [dailyPaymentData, setDailyPaymentData] = useState<Array<{ date: string; totalAmount: number; paymentCount: number }>>([])
  const [isLoadingBankData, setIsLoadingBankData] = useState(true)
  const [isLoadingGroupData, setIsLoadingGroupData] = useState(true)
  const [isLoadingDailyData, setIsLoadingDailyData] = useState(true)

  // Filter state management - default to current month
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'day' | 'week' | 'month' | 'year'>('month')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  // Date navigation functions
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate)
    
    switch (selectedFilter) {
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
        break
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
        break
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
        break
      case 'year':
        newDate.setFullYear(newDate.getFullYear() + (direction === 'next' ? 1 : -1))
        break
    }
    
    setSelectedDate(newDate)
  }

  // Get date range based on selected filter
  const getDateRange = () => {
    const date = selectedDate
    
    switch (selectedFilter) {
      case 'all':
        return null // No date filtering
      case 'day':
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59)
        return { start: startOfDay, end: endOfDay }
      case 'week':
        const startOfWeek = new Date(date)
        startOfWeek.setDate(date.getDate() - date.getDay()) // Start of week (Sunday)
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        endOfWeek.setHours(23, 59, 59)
        return { start: startOfWeek, end: endOfWeek }
      case 'month':
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)
        return { start: startOfMonth, end: endOfMonth }
      case 'year':
        const startOfYear = new Date(date.getFullYear(), 0, 1)
        const endOfYear = new Date(date.getFullYear(), 11, 31, 23, 59, 59)
        return { start: startOfYear, end: endOfYear }
      default:
        return null
    }
  }

  // Format date display based on selected filter
  const getDateDisplayText = () => {
    const dateRange = getDateRange()
    if (!dateRange) return 'All Time'
    
    const { start, end } = dateRange
    
    switch (selectedFilter) {
      case 'day':
        return formatDate(start.toISOString().split('T')[0])
      case 'week':
        return `${formatDate(start.toISOString().split('T')[0])} - ${formatDate(end.toISOString().split('T')[0])}`
      case 'month':
        return start.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
      case 'year':
        return start.getFullYear().toString()
      default:
        return 'All Time'
    }
  }

  // Fetch bank data with date filtering
  useEffect(() => {
    const fetchBankData = async () => {
      try {
        setIsLoadingBankData(true)
        
        const dateRange = getDateRange()
        let payments: any[] = []
        
        if (dateRange) {
          // Fetch payments with date filtering
          const filters = {
            startDate: dateRange.start.toISOString().split('T')[0],
            endDate: dateRange.end.toISOString().split('T')[0]
          }
          payments = await paymentService.getPayments(filters)
        } else {
          // Fetch all payments
          payments = await paymentService.getPayments()
        }
        
        // Process payments to generate bank statistics
        const receiverBankMap = new Map<string, { totalAmount: number; paymentCount: number }>()
        const senderBankMap = new Map<string, { totalAmount: number; paymentCount: number }>()
        
        payments.forEach(payment => {
          // Only include received and settled payments
          if (payment.status === 'received' || payment.status === 'settled') {
            // Receiver bank data
            if (payment.receiverBank?.name) {
              const bankName = payment.receiverBank.name
              const existing = receiverBankMap.get(bankName) || { totalAmount: 0, paymentCount: 0 }
              receiverBankMap.set(bankName, {
                totalAmount: existing.totalAmount + payment.amount,
                paymentCount: existing.paymentCount + 1
              })
            }
            
            // Sender bank data (only for bank transfers)
            if (payment.senderBank?.name && payment.paymentMethod === 'bank_transfer') {
              const bankName = payment.senderBank.name
              const existing = senderBankMap.get(bankName) || { totalAmount: 0, paymentCount: 0 }
              senderBankMap.set(bankName, {
                totalAmount: existing.totalAmount + payment.amount,
                paymentCount: existing.paymentCount + 1
              })
            }
          }
        })
        
        // Convert maps to arrays
        const receiverData = Array.from(receiverBankMap.entries()).map(([bankName, stats]) => ({
          bankName,
          ...stats
        }))
        
        const senderData = Array.from(senderBankMap.entries()).map(([bankName, stats]) => ({
          bankName,
          ...stats
        }))
        
        setReceiverBankData(receiverData)
        setSenderBankData(senderData)
      } catch (error) {
        console.error('Error fetching bank data:', error)
        setReceiverBankData([])
        setSenderBankData([])
      } finally {
        setIsLoadingBankData(false)
      }
    }

    fetchBankData()
  }, [selectedFilter, selectedDate])

  // Fetch group progress data with date filtering
  useEffect(() => {
    const fetchGroupProgressData = async () => {
      try {
        setIsLoadingGroupData(true)
        
        const dateRange = getDateRange()
        let payments: any[] = []
        
        if (dateRange) {
          // Fetch payments with date filtering
          const filters = {
            startDate: dateRange.start.toISOString().split('T')[0],
            endDate: dateRange.end.toISOString().split('T')[0]
          }
          payments = await paymentService.getPayments(filters)
        } else {
          // Fetch all payments
          payments = await paymentService.getPayments()
        }
        
        // Get all groups
        const dashboardGroups = await groupService.getDashboardGroups()
        
        // Calculate progress for each group based on filtered payments
        const progressData = dashboardGroups.map(group => {
          // Count payments for this group in the filtered period
          const groupPayments = payments.filter(payment => 
            payment.groupId === group.id && 
            (payment.status === 'received' || payment.status === 'settled')
          )
          
          // For date filtering, we'll show the actual payments made in the period
          // vs the total slots that should have been paid in that period
          let slotsPaid = 0
          let slotsTotal = 0
          
          if (dateRange) {
            // Calculate how many slots should have been paid in this period
            const startMonth = dateRange.start.getFullYear() * 12 + dateRange.start.getMonth()
            const endMonth = dateRange.end.getFullYear() * 12 + dateRange.end.getMonth()
            const monthsInRange = endMonth - startMonth + 1
            
            // Estimate slots that should be paid (this is a simplified calculation)
            slotsTotal = Math.min(monthsInRange, group.slotsTotal)
            slotsPaid = groupPayments.length
          } else {
            // Use the original group data for 'all' filter
            slotsPaid = group.slotsPaid
            slotsTotal = group.slotsTotal
          }
          
          return {
            groupName: group.name,
            progressPercentage: slotsTotal > 0 ? Math.round((slotsPaid / slotsTotal) * 100) : 0,
            slotsPaid,
            slotsTotal
          }
        })
        
        // Sort groups by name in ascending order (A to Z)
        const sortedProgressData = progressData.sort((a, b) => a.groupName.localeCompare(b.groupName))
        
        setGroupProgressData(sortedProgressData)
      } catch (error) {
        console.error('Error fetching group progress data:', error)
        setGroupProgressData([])
      } finally {
        setIsLoadingGroupData(false)
      }
    }

    fetchGroupProgressData()
  }, [selectedFilter, selectedDate])

  // Fetch daily payment data with date filtering
  useEffect(() => {
    const fetchDailyPaymentData = async () => {
      try {
        setIsLoadingDailyData(true)
        const dailyData = await paymentService.getDailyPaymentStats()
        
        // Apply date filtering if not 'all'
        const dateRange = getDateRange()
        let filteredDailyData = dailyData
        
        if (dateRange) {
          // Filter daily data based on date range
          filteredDailyData = dailyData.filter(item => {
            const itemDate = new Date(item.date)
            return itemDate >= dateRange.start && itemDate <= dateRange.end
          })
        }
        
        setDailyPaymentData(filteredDailyData)
      } catch (error) {
        console.error('Error fetching daily payment data:', error)
        setDailyPaymentData([])
      } finally {
        setIsLoadingDailyData(false)
      }
    }

    fetchDailyPaymentData()
  }, [selectedFilter, selectedDate])

  // Mock data for charts - will be replaced with real data later
  const monthlyData = [
    { month: 'Jan', paid: 12000, received: 8000, expected: 16000 },
    { month: 'Feb', paid: 14000, received: 12000, expected: 16000 },
    { month: 'Mar', paid: 16000, received: 16000, expected: 16000 },
    { month: 'Apr', paid: 18000, received: 20000, expected: 16000 },
    { month: 'May', paid: 20000, received: 24000, expected: 16000 },
    { month: 'Jun', paid: 22000, received: 28000, expected: 16000 }
  ]

  const groupData = [
    { name: 'Group A', value: 35, color: '#217346' },
    { name: 'Group B', value: 25, color: '#10b981' },
    { name: 'Group C', value: 20, color: '#3b82f6' },
    { name: 'Group D', value: 20, color: '#f59e0b' }
  ]

  const paymentStatusData = [
    { status: 'Received', value: 65, color: '#10b981' },
    { status: 'Pending', value: 20, color: '#f59e0b' },
    { status: 'Overdue', value: 15, color: '#ef4444' }
  ]

  const memberPerformance = [
    { name: 'John Doe', paid: 8000, received: 12000, efficiency: 95 },
    { name: 'Jane Smith', paid: 6000, received: 9000, efficiency: 88 },
    { name: 'Mike Johnson', paid: 3000, received: 0, efficiency: 45 },
    { name: 'Sarah Wilson', paid: 7000, received: 10000, efficiency: 92 }
  ]

  // const COLORS = ['#217346', '#10b981', '#3b82f6', '#f59e0b', '#ef4444']

  return (
    <div className="analytics">
      <div className="page-header">
        <div className="container">
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Financial insights and performance metrics</p>
        </div>
      </div>

      <div className="container">
        {/* Filter Controls */}
        <div className="analytics-filter-controls">
          <div className="analytics-filter-section">
            <div className="analytics-filter-label">
              <Filter size={20} />
              <span>Filter by Period</span>
            </div>
            <div className="analytics-filter-buttons">
              {(['all', 'day', 'week', 'month', 'year'] as const).map((filter) => (
                <button
                  key={filter}
                  className={`analytics-filter-btn ${selectedFilter === filter ? 'active' : ''}`}
                  onClick={() => setSelectedFilter(filter)}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          {selectedFilter !== 'all' && (
            <div className="analytics-date-navigation">
              <button
                className="analytics-nav-btn"
                onClick={() => navigateDate('prev')}
                title={`Previous ${selectedFilter}`}
              >
                <ChevronLeft size={20} />
              </button>
              <div className="analytics-date-display">
                {getDateDisplayText()}
              </div>
              <button
                className="analytics-nav-btn"
                onClick={() => navigateDate('next')}
                title={`Next ${selectedFilter}`}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
        {/* Bank Charts Section */}
        <div className="analytics-bank-charts-section">
          {/* Sender Bank Chart */}
          <div className="analytics-sender-bank-chart">
            <div className="analytics-chart-header">
              <div className="analytics-chart-title-section">
                <Building2 size={24} className="analytics-chart-icon" />
                <h2 className="analytics-chart-title">Transfers by Sender Bank</h2>
              </div>
              <p className="analytics-chart-subtitle">
                Total amount transferred from each sender bank
                {selectedFilter !== 'all' && ` (${getDateDisplayText()})`}
              </p>
            </div>
            
            {isLoadingBankData ? (
              <div className="analytics-chart-loading">
                <div className="analytics-chart-spinner"></div>
                <p>Loading bank data...</p>
              </div>
            ) : senderBankData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={senderBankData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="bankName" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 12 }}
                    interval={0}
                  />
                  <YAxis 
                    tickFormatter={(value) => `SRD ${(value / 1000).toFixed(0)}K`}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value: any) => [`SRD ${value.toLocaleString()}`, 'Total Amount']}
                    labelFormatter={(label) => `Bank: ${label}`}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="totalAmount" 
                    fill="#10b981" 
                    name="Total Amount"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="analytics-chart-empty">
                <Building2 size={48} className="analytics-chart-empty-icon" />
                <h3>No Sender Bank Data</h3>
                <p>No bank transfer payments found to display sender bank statistics.</p>
              </div>
            )}
          </div>

          {/* Receiver Bank Chart */}
          <div className="analytics-receiver-bank-chart">
            <div className="analytics-chart-header">
              <div className="analytics-chart-title-section">
                <Building2 size={24} className="analytics-chart-icon" />
                <h2 className="analytics-chart-title">Transfers by Receiver Bank</h2>
              </div>
              <p className="analytics-chart-subtitle">
                Total amount transferred to each receiver bank (including cash transfers and settled payments)
                {selectedFilter !== 'all' && ` (${getDateDisplayText()})`}
              </p>
            </div>
            
            {isLoadingBankData ? (
              <div className="analytics-chart-loading">
                <div className="analytics-chart-spinner"></div>
                <p>Loading bank data...</p>
              </div>
            ) : receiverBankData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={receiverBankData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="bankName" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 12 }}
                    interval={0}
                  />
                  <YAxis 
                    tickFormatter={(value) => `SRD ${(value / 1000).toFixed(0)}K`}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value: any) => [`SRD ${value.toLocaleString()}`, 'Total Amount']}
                    labelFormatter={(label) => `Bank: ${label}`}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="totalAmount" 
                    fill="#217346" 
                    name="Total Amount"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="analytics-chart-empty">
                <Building2 size={48} className="analytics-chart-empty-icon" />
                <h3>No Receiver Bank Data</h3>
                <p>No bank transfer payments found to display receiver bank statistics.</p>
              </div>
            )}
          </div>
        </div>

        {/* Group Progress Chart */}
        <div className="analytics-group-progress-section">
          <div className="analytics-chart-header">
            <div className="analytics-chart-title-section">
              <Users size={24} className="analytics-chart-icon" />
              <h2 className="analytics-chart-title">Group Progress</h2>
            </div>
            <p className="analytics-chart-subtitle">
              Payment completion percentage for each group
              {selectedFilter !== 'all' && ` (${getDateDisplayText()})`}
            </p>
          </div>
          
          {isLoadingGroupData ? (
            <div className="analytics-chart-loading">
              <div className="analytics-chart-spinner"></div>
              <p>Loading group progress data...</p>
            </div>
          ) : groupProgressData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={groupProgressData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="groupName" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 12 }}
                  interval={0}
                />
                <YAxis 
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value: any) => [
                    `${value}%`, 
                    'Progress'
                  ]}
                  labelFormatter={(label) => `Group: ${label}`}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="progressPercentage" 
                  fill="#217346" 
                  name="Progress %"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="analytics-chart-empty">
              <Users size={48} className="analytics-chart-empty-icon" />
              <h3>No Group Progress Data</h3>
              <p>No groups found to display progress statistics.</p>
            </div>
          )}
        </div>

        {/* Daily Payment Chart */}
        <div className="analytics-daily-payment-section">
          <div className="analytics-chart-header">
            <div className="analytics-chart-title-section">
              <Calendar size={24} className="analytics-chart-icon" />
              <h2 className="analytics-chart-title">Daily Payments</h2>
            </div>
            <p className="analytics-chart-subtitle">
              Total payment amounts per day
              {selectedFilter !== 'all' ? ` (${getDateDisplayText()})` : ' (last 30 days)'}
            </p>
          </div>
          
          {isLoadingDailyData ? (
            <div className="analytics-chart-loading">
              <div className="analytics-chart-spinner"></div>
              <p>Loading daily payment data...</p>
            </div>
          ) : dailyPaymentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={dailyPaymentData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 12 }}
                  interval={0}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return `${date.getDate()}/${date.getMonth() + 1}`
                  }}
                />
                <YAxis 
                  tickFormatter={(value) => `SRD ${(value / 1000).toFixed(0)}K`}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value: any) => [`SRD ${value.toLocaleString()}`, 'Total Amount']}
                  labelFormatter={(label) => {
                    const date = new Date(label)
                    return date.toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })
                  }}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="totalAmount" 
                  stroke="#217346" 
                  fill="#217346" 
                  fillOpacity={0.6}
                  name="Total Amount"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="analytics-chart-empty">
              <Calendar size={48} className="analytics-chart-empty-icon" />
              <h3>No Daily Payment Data</h3>
              <p>No payment data found to display daily statistics.</p>
            </div>
          )}
        </div>

        {/* Key Metrics */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon">
              <TrendingUp size={24} />
            </div>
            <div className="metric-content">
              <h3>Total Growth</h3>
              <div className="metric-value">+24.5%</div>
              <div className="metric-change">vs last month</div>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">
              <DollarSign size={24} />
            </div>
            <div className="metric-content">
              <h3>Total Revenue</h3>
              <div className="metric-value">SRD 102,000</div>
              <div className="metric-change">+18.2% vs last month</div>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">
              <Users size={24} />
            </div>
            <div className="metric-content">
              <h3>Active Members</h3>
              <div className="metric-value">26</div>
              <div className="metric-change">+3 new this month</div>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">
              <Calendar size={24} />
            </div>
            <div className="metric-content">
              <h3>Completion Rate</h3>
              <div className="metric-value">87.5%</div>
              <div className="metric-change">+5.2% vs last month</div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="charts-section">
          {/* Monthly Trends */}
          <div className="chart-card">
            <h3>Monthly Payment Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`SRD ${value.toLocaleString()}`, '']} />
                <Legend />
                <Area type="monotone" dataKey="paid" stackId="1" stroke="#217346" fill="#217346" fillOpacity={0.6} />
                <Area type="monotone" dataKey="received" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                <Area type="monotone" dataKey="expected" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Group Distribution */}
          <div className="charts-row">
            <div className="chart-card">
              <h3>Group Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={groupData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {groupData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3>Payment Status</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={paymentStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {paymentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Member Performance */}
          <div className="chart-card">
            <h3>Member Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={memberPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`SRD ${value.toLocaleString()}`, '']} />
                <Legend />
                <Bar dataKey="paid" fill="#217346" name="Amount Paid" />
                <Bar dataKey="received" fill="#10b981" name="Amount Received" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Efficiency Chart */}
          <div className="chart-card">
            <h3>Member Efficiency</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={memberPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value}%`, 'Efficiency']} />
                <Legend />
                <Line type="monotone" dataKey="efficiency" stroke="#217346" strokeWidth={3} dot={{ fill: '#217346', strokeWidth: 2, r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Insights */}
        <div className="insights-section">
          <h2>Key Insights</h2>
          <div className="insights-grid">
            <div className="insight-card">
              <h4>Payment Trends</h4>
              <p>Monthly payments have increased by 24.5% compared to last month, showing strong member engagement.</p>
            </div>
            <div className="insight-card">
              <h4>Group Performance</h4>
              <p>Group A leads with 35% of total contributions, followed by Group B with 25%.</p>
            </div>
            <div className="insight-card">
              <h4>Member Efficiency</h4>
              <p>Top performers maintain 90%+ efficiency rates, while some members need support to improve.</p>
            </div>
            <div className="insight-card">
              <h4>Risk Assessment</h4>
              <p>15% of payments are overdue, requiring immediate attention and follow-up.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics
