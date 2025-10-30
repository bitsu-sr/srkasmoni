import { useState, useEffect } from 'react'
import { DollarSign, Building2, Wallet, TrendingUp, Save, ArrowDownCircle, ArrowUpCircle, TrendingDown } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { cashInventoryService } from '../services/cashInventoryService'
import { paymentService } from '../services/paymentService'
import { supabase } from '../lib/supabase'
import type { CashInventory, FinancialStats } from '../types/cashInventory'
import MonthFilter from '../components/MonthFilter'
import './FinancialManagement.css'

interface PayoutData {
  bankName: string
  totalAmount: number
  payoutCount: number
}

interface CashFlowData {
  incoming: { totalAmount: number; count: number }
  outgoing: { totalAmount: number; count: number }
  net: number
}

interface BankCashFlow {
  bankName: string
  incoming: number
  incomingCount: number
  outgoing: number
  outgoingCount: number
  net: number
}

const FinancialManagement = () => {
  const { user } = useAuth()
  
  const isAdmin = user?.role === 'admin'
  
  const [cashInventory, setCashInventory] = useState<CashInventory[]>([])
  const [editedQuantities, setEditedQuantities] = useState<Record<number, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().substring(0, 7)
  )
  const [financialStats, setFinancialStats] = useState<FinancialStats>({
    totalAssets: 0,
    totalCash: 0,
    topBank1: null,
    topBank2: null,
    allBanks: []
  })
  const [payoutData, setPayoutData] = useState<PayoutData[]>([])
  const [cashFlow, setCashFlow] = useState<CashFlowData>({
    incoming: { totalAmount: 0, count: 0 },
    outgoing: { totalAmount: 0, count: 0 },
    net: 0
  })
  const [bankCashFlows, setBankCashFlows] = useState<BankCashFlow[]>([])

  useEffect(() => {
    if (isAdmin) {
      loadFinancialData()
    }
  }, [isAdmin, selectedMonth])

  const loadFinancialData = async () => {
    try {
      setIsLoading(true)
      
      // Load cash inventory
      let inventory = await cashInventoryService.getCashInventory()
      
      // If inventory is empty, initialize it with default denominations
      if (inventory.length === 0) {
        await cashInventoryService.initializeCashInventory()
        inventory = await cashInventoryService.getCashInventory()
      }
      
      // If still empty, create default entries for display
      if (inventory.length === 0) {
        const defaultDenominations = [5, 10, 20, 50, 100, 200, 500]
        inventory = defaultDenominations.map((denom, index) => ({
          id: index + 1,
          denomination: denom,
          quantity: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }))
      }
      
      setCashInventory(inventory)
      
      // Initialize edited quantities with current values
      const initialQuantities: Record<number, number> = {}
      inventory.forEach(item => {
        initialQuantities[item.denomination] = item.quantity
      })
      setEditedQuantities(initialQuantities)
      
      // Note: Physical cash on hand is calculated separately in calculateTotalCash() 
      // from the editable quantities, not from the stat cards
      
      // Load bank stats (filtered by selected month)
      const allPayments = await paymentService.getPayments({ paymentMonth: selectedMonth })
      
      // Calculate bank totals from receiver bank
      const bankTotals = new Map<string, { totalAmount: number; paymentCount: number }>()
      
      allPayments.forEach(payment => {
        // Skip cash payments - they're tracked separately in cash inventory
        if (payment.paymentMethod === 'cash') {
          return
        }
        
        // Only count bank transfers with receiver bank information
        // Include all statuses (received, pending, settled) - they all went to the bank
        if (payment.paymentMethod === 'bank_transfer' && payment.receiverBank) {
          const bankName = payment.receiverBank.name
          const amount = payment.amount || 0
          
          if (bankTotals.has(bankName)) {
            const current = bankTotals.get(bankName)!
            current.totalAmount += amount
            current.paymentCount++
          } else {
            bankTotals.set(bankName, { totalAmount: amount, paymentCount: 1 })
          }
        }
      })
      
      // Convert to array and sort by total amount
      const allBanks = Array.from(bankTotals.entries())
        .map(([bankName, stats]) => ({
          bankName,
          totalAmount: stats.totalAmount,
          paymentCount: stats.paymentCount
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount)
      
      // ===== FETCH PAYOUT DATA (OUTGOING MONEY) =====
      const { data: payoutsData, error: payoutsError } = await supabase
        .from('payouts')
        .select(`
          *,
          senderBank:banks!payouts_sender_bank_fkey(id, name),
          receiverBank:banks!payouts_receiver_bank_fkey(id, name)
        `)
        .eq('payout_month', selectedMonth)
        .eq('payout', true) // Only completed payouts
      
      if (payoutsError) {
        console.error('Error fetching payouts:', payoutsError)
      }
      
      // Calculate outgoing money by source (sender_bank)
      const payoutTotals = new Map<string, { totalAmount: number; payoutCount: number }>()
      let totalCashPayouts = 0
      let cashPayoutCount = 0
      
      payoutsData?.forEach((payout: any) => {
        const calculatedAmount = parseFloat(payout.calculated_total_amount || 0)
        
        if (payout.payment_method === 'cash') {
          totalCashPayouts += calculatedAmount
          cashPayoutCount++
        } else if (payout.payment_method === 'bank_transfer' && payout.senderBank) {
          const bankName = payout.senderBank.name
          
          if (payoutTotals.has(bankName)) {
            const current = payoutTotals.get(bankName)!
            current.totalAmount += calculatedAmount
            current.payoutCount++
          } else {
            payoutTotals.set(bankName, { totalAmount: calculatedAmount, payoutCount: 1 })
          }
        }
      })
      
      const allPayouts = Array.from(payoutTotals.entries())
        .map(([bankName, stats]) => ({
          bankName,
          totalAmount: stats.totalAmount,
          payoutCount: stats.payoutCount
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount)
      
      setPayoutData(allPayouts)
      
      // ===== CALCULATE CASH FLOW =====
      
      // Calculate incoming cash (from payments with method = 'cash')
      const incomingCashPayments = allPayments.filter(p => p.paymentMethod === 'cash')
      const totalIncomingCash = incomingCashPayments.reduce((sum, p) => sum + p.amount, 0)
      
      // Total Cash for stat card = Total cash received from payments
      const totalCash = totalIncomingCash
      
      setCashFlow({
        incoming: { 
          totalAmount: totalIncomingCash, 
          count: incomingCashPayments.length 
        },
        outgoing: { 
          totalAmount: totalCashPayouts, 
          count: cashPayoutCount 
        },
        net: totalIncomingCash - totalCashPayouts
      })
      
      // ===== CALCULATE PER-BANK CASH FLOW =====
      const bankFlowMap = new Map<string, BankCashFlow>()
      
      // Add incoming (payments received to banks)
      allBanks.forEach(bank => {
        bankFlowMap.set(bank.bankName, {
          bankName: bank.bankName,
          incoming: bank.totalAmount,
          incomingCount: bank.paymentCount,
          outgoing: 0,
          outgoingCount: 0,
          net: bank.totalAmount
        })
      })
      
      // Add outgoing (payouts from banks)
      allPayouts.forEach(payout => {
        if (bankFlowMap.has(payout.bankName)) {
          const flow = bankFlowMap.get(payout.bankName)!
          flow.outgoing = payout.totalAmount
          flow.outgoingCount = payout.payoutCount
          flow.net = flow.incoming - flow.outgoing
        } else {
          // Bank has outgoing but no incoming
          bankFlowMap.set(payout.bankName, {
            bankName: payout.bankName,
            incoming: 0,
            incomingCount: 0,
            outgoing: payout.totalAmount,
            outgoingCount: payout.payoutCount,
            net: -payout.totalAmount
          })
        }
      })
      
      const allBankFlows = Array.from(bankFlowMap.values())
        .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
      
      setBankCashFlows(allBankFlows)
      
      // Get top 2 banks
      const topBank1 = allBanks[0] ? { name: allBanks[0].bankName, amount: allBanks[0].totalAmount } : null
      const topBank2 = allBanks[1] ? { name: allBanks[1].bankName, amount: allBanks[1].totalAmount } : null
      
      // Calculate total bank balance (excluding cash to avoid double counting)
      const totalBankBalance = allBanks.reduce((sum, bank) => sum + bank.totalAmount, 0)
      
      // Total assets = cash inventory + bank balances
      const totalAssets = totalCash + totalBankBalance
      
      setFinancialStats({
        totalAssets,
        totalCash,
        topBank1,
        topBank2,
        allBanks
      })
    } catch (error) {
      console.error('Error loading financial data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuantityChange = (denomination: number, value: string) => {
    const quantity = parseInt(value) || 0
    setEditedQuantities(prev => ({
      ...prev,
      [denomination]: Math.max(0, quantity)
    }))
  }

  const handleSaveChanges = async () => {
    try {
      setIsSaving(true)
      
      // Prepare batch updates
      const updates = Object.entries(editedQuantities).map(([denomination, quantity]) => ({
        denomination: parseInt(denomination),
        quantity
      }))
      
      await cashInventoryService.batchUpdateCashInventory(updates)
      
      // Reload data to reflect changes
      await loadFinancialData()
      
      alert('Cash inventory updated successfully!')
    } catch (error) {
      console.error('Error saving cash inventory:', error)
      alert('Failed to save changes. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month)
  }

  const calculateTotalCash = () => {
    return Object.entries(editedQuantities).reduce(
      (sum, [denomination, quantity]) => sum + parseInt(denomination) * quantity,
      0
    )
  }

  const calculateSubtotal = (denomination: number, quantity: number) => {
    return denomination * quantity
  }

  const formatCurrency = (amount: number) => {
    return `SRD ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const hasUnsavedChanges = () => {
    return cashInventory.some(
      item => editedQuantities[item.denomination] !== item.quantity
    )
  }

  if (!isAdmin) {
    return (
      <div className="financial-mgmt-page">
        <div className="financial-mgmt-unauthorized">
          <h2>Access Denied</h2>
          <p>Only administrators can access the Financial Management page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="financial-mgmt-page">
      <div className="financial-mgmt-page-header">
        <div className="financial-mgmt-container">
          <h1 className="financial-mgmt-page-title">Financial Management</h1>
          <p className="financial-mgmt-page-subtitle">
            Track cash on hand and bank balances
          </p>
        </div>
      </div>

      <div className="financial-mgmt-container">
        {/* Month Filter */}
        <div className="financial-mgmt-month-filter-section">
          <MonthFilter
            selectedMonth={selectedMonth}
            onMonthChange={handleMonthChange}
          />
          <p className="financial-mgmt-filter-note">
            Bank balances are filtered by selected month. Cash inventory is current.
          </p>
        </div>

        {/* Stats Summary Cards */}
        <div className="financial-mgmt-summary">
          <div className="financial-mgmt-summary-card">
            <div className="financial-mgmt-summary-icon financial-mgmt-summary-icon-total-assets">
              <TrendingUp size={24} />
            </div>
            <div className="financial-mgmt-summary-content">
              <h3>Total Assets</h3>
              <div className="financial-mgmt-summary-value">
                {formatCurrency(financialStats.totalAssets)}
              </div>
              <div className="financial-mgmt-summary-count">Cash + Bank Balances</div>
            </div>
          </div>

          <div className="financial-mgmt-summary-card">
            <div className="financial-mgmt-summary-icon financial-mgmt-summary-icon-total-cash">
              <Wallet size={24} />
            </div>
            <div className="financial-mgmt-summary-content">
              <h3>Total Cash</h3>
              <div className="financial-mgmt-summary-value">
                {formatCurrency(financialStats.totalCash)}
              </div>
              <div className="financial-mgmt-summary-count">Cash payments received</div>
            </div>
          </div>

          {financialStats.topBank1 && (
            <div className="financial-mgmt-summary-card">
              <div className="financial-mgmt-summary-icon financial-mgmt-summary-icon-bank1">
                <Building2 size={24} />
              </div>
              <div className="financial-mgmt-summary-content">
                <h3>{financialStats.topBank1.name}</h3>
                <div className="financial-mgmt-summary-value">
                  {formatCurrency(financialStats.topBank1.amount)}
                </div>
                <div className="financial-mgmt-summary-count">Highest balance</div>
              </div>
            </div>
          )}

          {financialStats.topBank2 && (
            <div className="financial-mgmt-summary-card">
              <div className="financial-mgmt-summary-icon financial-mgmt-summary-icon-bank2">
                <Building2 size={24} />
              </div>
              <div className="financial-mgmt-summary-content">
                <h3>{financialStats.topBank2.name}</h3>
                <div className="financial-mgmt-summary-value">
                  {formatCurrency(financialStats.topBank2.amount)}
                </div>
                <div className="financial-mgmt-summary-count">Second highest</div>
              </div>
            </div>
          )}
        </div>

        {/* Cash Inventory Section */}
        <div className="financial-mgmt-section">
          <div className="financial-mgmt-section-header">
            <div>
              <h2>💵 Cash on Hand (Physical Inventory)</h2>
              <p className="financial-mgmt-section-subtitle">
                Manual count of physical banknotes for reconciliation
              </p>
              <div className="financial-mgmt-total-cash">
                Total: <span className="financial-mgmt-total-amount">{formatCurrency(calculateTotalCash())}</span>
              </div>
            </div>
            <button
              className="financial-mgmt-btn financial-mgmt-btn-save"
              onClick={handleSaveChanges}
              disabled={isSaving || !hasUnsavedChanges()}
            >
              <Save size={18} />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {isLoading ? (
            <div className="financial-mgmt-loading-state">
              <div className="financial-mgmt-spinner"></div>
              <p>Loading cash inventory...</p>
            </div>
          ) : (
            <div className="financial-mgmt-cash-table-wrapper">
              <table className="financial-mgmt-cash-table">
                <thead>
                  <tr>
                    <th>BILL</th>
                    <th>COUNT</th>
                    <th>SUBTOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {cashInventory.map((item) => (
                    <tr key={item.denomination}>
                      <td>
                        <div className="financial-mgmt-denomination-label">
                          SRD {item.denomination}
                        </div>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          className="financial-mgmt-quantity-input"
                          value={editedQuantities[item.denomination] || 0}
                          onChange={(e) => handleQuantityChange(item.denomination, e.target.value)}
                        />
                      </td>
                      <td>
                        <span className="financial-mgmt-subtotal">
                          {formatCurrency(calculateSubtotal(item.denomination, editedQuantities[item.denomination] || 0))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Incoming Money (Bank Payments Received) Section */}
        <div className="financial-mgmt-section">
          <div className="financial-mgmt-section-header">
            <h2>💰 Incoming Money (Payments Received)</h2>
            <span className="financial-mgmt-month-badge">
              {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long' 
              })}
            </span>
          </div>

          {isLoading ? (
            <div className="financial-mgmt-loading-state">
              <div className="financial-mgmt-spinner"></div>
              <p>Loading bank balances...</p>
            </div>
          ) : financialStats.allBanks.length === 0 ? (
            <div className="financial-mgmt-empty-state">
              <DollarSign size={48} />
              <p>No bank transactions found for the selected month.</p>
            </div>
          ) : (
            <div className="financial-mgmt-bank-table-wrapper">
              <table className="financial-mgmt-bank-table">
                <thead>
                  <tr>
                    <th>Bank Name</th>
                    <th>Total Amount</th>
                    <th>Payment Count</th>
                  </tr>
                </thead>
                <tbody>
                  {financialStats.allBanks.map((bank, index) => (
                    <tr key={index}>
                      <td className="financial-mgmt-bank-name">
                        <Building2 size={18} />
                        {bank.bankName}
                      </td>
                      <td className="financial-mgmt-bank-amount">
                        {formatCurrency(bank.totalAmount)}
                      </td>
                      <td className="financial-mgmt-bank-count">
                        {bank.paymentCount} payment{bank.paymentCount !== 1 ? 's' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Outgoing Money (Payouts Made) Section */}
        <div className="financial-mgmt-section">
          <div className="financial-mgmt-section-header">
            <div>
              <h2>💸 Outgoing Money (Payouts Made)</h2>
              <p className="financial-mgmt-section-subtitle">
                Payouts distributed to members for {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long' 
                })}
              </p>
            </div>
            <span className="financial-mgmt-month-badge">
              {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long' 
              })}
            </span>
          </div>

          {isLoading ? (
            <div className="financial-mgmt-loading-state">
              <div className="financial-mgmt-spinner"></div>
              <p>Loading payout data...</p>
            </div>
          ) : (
            <>
              {/* Cash Payouts Card */}
              <div className="financial-mgmt-flow-card financial-mgmt-outgoing-card">
                <div className="financial-mgmt-flow-icon">
                  <ArrowUpCircle size={32} />
                </div>
                <div className="financial-mgmt-flow-content">
                  <h3>Cash Payouts</h3>
                  <div className="financial-mgmt-flow-amount">
                    {formatCurrency(cashFlow.outgoing.totalAmount)}
                  </div>
                  <div className="financial-mgmt-flow-count">
                    {cashFlow.outgoing.count} payout{cashFlow.outgoing.count !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              {/* Bank Payouts Table */}
              {payoutData.length > 0 ? (
                <div className="financial-mgmt-bank-table-wrapper">
                  <table className="financial-mgmt-bank-table">
                    <thead>
                      <tr>
                        <th>Source Bank</th>
                        <th>Total Amount</th>
                        <th>Payout Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payoutData.map((payout, index) => (
                        <tr key={index}>
                          <td className="financial-mgmt-bank-name">
                            <TrendingDown size={18} />
                            {payout.bankName}
                          </td>
                          <td className="financial-mgmt-bank-amount financial-mgmt-outgoing-amount">
                            {formatCurrency(payout.totalAmount)}
                          </td>
                          <td className="financial-mgmt-bank-count">
                            {payout.payoutCount} payout{payout.payoutCount !== 1 ? 's' : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="financial-mgmt-empty-state">
                  <TrendingDown size={48} />
                  <p>No payouts made this month.</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Cash Flow Summary Section */}
        <div className="financial-mgmt-section financial-mgmt-flow-section">
          <div className="financial-mgmt-section-header">
            <h2>📊 Cash Flow Summary</h2>
          </div>

          {isLoading ? (
            <div className="financial-mgmt-loading-state">
              <div className="financial-mgmt-spinner"></div>
              <p>Calculating cash flow...</p>
            </div>
          ) : (
            <div className="financial-mgmt-flow-grid">
              {/* Cash Flow Card */}
              <div className="financial-mgmt-cashflow-card">
                <h3>💵 Cash Flow</h3>
                <div className="financial-mgmt-flow-details">
                  <div className="financial-mgmt-flow-row financial-mgmt-incoming-row">
                    <span className="financial-mgmt-flow-label">
                      <ArrowDownCircle size={18} /> Incoming
                    </span>
                    <span className="financial-mgmt-flow-value">
                      {formatCurrency(cashFlow.incoming.totalAmount)}
                    </span>
                    <span className="financial-mgmt-flow-count-small">
                      ({cashFlow.incoming.count} payments)
                    </span>
                  </div>
                  <div className="financial-mgmt-flow-row financial-mgmt-outgoing-row">
                    <span className="financial-mgmt-flow-label">
                      <ArrowUpCircle size={18} /> Outgoing
                    </span>
                    <span className="financial-mgmt-flow-value">
                      {formatCurrency(cashFlow.outgoing.totalAmount)}
                    </span>
                    <span className="financial-mgmt-flow-count-small">
                      ({cashFlow.outgoing.count} payouts)
                    </span>
                  </div>
                  <div className="financial-mgmt-flow-divider"></div>
                  <div className={`financial-mgmt-flow-row financial-mgmt-net-row ${cashFlow.net >= 0 ? 'positive' : 'negative'}`}>
                    <span className="financial-mgmt-flow-label">
                      <TrendingUp size={18} /> Net Cash Flow
                    </span>
                    <span className="financial-mgmt-flow-value-net">
                      {formatCurrency(cashFlow.net)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bank Flows */}
              {bankCashFlows.map((flow, index) => (
                <div key={index} className="financial-mgmt-cashflow-card">
                  <h3>🏦 {flow.bankName}</h3>
                  <div className="financial-mgmt-flow-details">
                    <div className="financial-mgmt-flow-row financial-mgmt-incoming-row">
                      <span className="financial-mgmt-flow-label">
                        <ArrowDownCircle size={18} /> Incoming
                      </span>
                      <span className="financial-mgmt-flow-value">
                        {formatCurrency(flow.incoming)}
                      </span>
                      <span className="financial-mgmt-flow-count-small">
                        ({flow.incomingCount})
                      </span>
                    </div>
                    <div className="financial-mgmt-flow-row financial-mgmt-outgoing-row">
                      <span className="financial-mgmt-flow-label">
                        <ArrowUpCircle size={18} /> Outgoing
                      </span>
                      <span className="financial-mgmt-flow-value">
                        {formatCurrency(flow.outgoing)}
                      </span>
                      <span className="financial-mgmt-flow-count-small">
                        ({flow.outgoingCount})
                      </span>
                    </div>
                    <div className="financial-mgmt-flow-divider"></div>
                    <div className={`financial-mgmt-flow-row financial-mgmt-net-row ${flow.net >= 0 ? 'positive' : 'negative'}`}>
                      <span className="financial-mgmt-flow-label">
                        <TrendingUp size={18} /> Net Flow
                      </span>
                      <span className="financial-mgmt-flow-value-net">
                        {formatCurrency(flow.net)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default FinancialManagement

