import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { Payment } from '../types/payment'
import './PaymentPieChart.css'

interface PaymentPieChartProps {
  payments: Payment[]
}

interface ChartData {
  name: string
  value: number
  color: string
  count: number
}

const PaymentPieChart: React.FC<PaymentPieChartProps> = ({ payments }) => {
  // Define colors for the pie chart segments
  const colors = [
    '#107c41', // Excel green (primary theme color)
    '#10b981', // Green
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#06b6d4', // Cyan
    '#84cc16', // Lime
    '#f97316', // Orange
    '#ec4899', // Pink
    '#6366f1', // Indigo
  ]

  // Process payments data to create chart data
  const processChartData = (): ChartData[] => {
    const bankTotals: { [key: string]: { amount: number; count: number } } = {}
    
    payments.forEach(payment => {
      if (payment.paymentMethod === 'cash') {
        // Handle cash payments
        const cashKey = 'Cash'
        if (!bankTotals[cashKey]) {
          bankTotals[cashKey] = { amount: 0, count: 0 }
        }
        bankTotals[cashKey].amount += payment.amount
        bankTotals[cashKey].count += 1
      } else if (payment.paymentMethod === 'bank_transfer' && payment.receiverBank) {
        // Handle bank transfer payments
        const bankName = payment.receiverBank.name
        if (!bankTotals[bankName]) {
          bankTotals[bankName] = { amount: 0, count: 0 }
        }
        bankTotals[bankName].amount += payment.amount
        bankTotals[bankName].count += 1
      }
    })

    // Convert to chart data format
    return Object.entries(bankTotals)
      .map(([name, data], index) => ({
        name,
        value: data.amount,
        color: colors[index % colors.length],
        count: data.count
      }))
      .sort((a, b) => b.value - a.value) // Sort by amount descending
  }

  const chartData = processChartData()

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="payment-pie-chart-tooltip">
          <p className="payment-pie-chart-tooltip-name">{data.name}</p>
          <p className="payment-pie-chart-tooltip-value">
            SRD {data.value.toLocaleString()}
          </p>
          <p className="payment-pie-chart-tooltip-count">
            {data.count} payment{data.count !== 1 ? 's' : ''}
          </p>
        </div>
      )
    }
    return null
  }

  // Custom legend component
  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="payment-pie-chart-legend">
        {payload.map((entry: any) => (
          <div key={entry.value} className="payment-pie-chart-legend-item">
            <div 
              className="payment-pie-chart-legend-color" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="payment-pie-chart-legend-text">
              {entry.value} - SRD {entry.payload.value.toLocaleString()} ({entry.payload.count} payment{entry.payload.count !== 1 ? 's' : ''})
            </span>
          </div>
        ))}
      </div>
    )
  }

  // Don't render if no data
  if (chartData.length === 0) {
    return (
      <div className="payment-pie-chart-container">
        <div className="payment-pie-chart-header">
          <h3>Payment Distribution by Bank</h3>
        </div>
        <div className="payment-pie-chart-empty">
          <p>No payment data available for the selected filters</p>
        </div>
      </div>
    )
  }

  return (
    <div className="payment-pie-chart-container">
      <div className="payment-pie-chart-header">
        <h3>Payment Distribution by Bank</h3>
        <p className="payment-pie-chart-subtitle">
          Total: SRD {chartData.reduce((sum, item) => sum + item.value, 0).toLocaleString()}
        </p>
      </div>
      
      <div className="payment-pie-chart-content">
        <div className="payment-pie-chart-chart">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="payment-pie-chart-legend-container">
          <CustomLegend payload={chartData.map((item) => ({
            value: item.name,
            color: item.color,
            payload: item
          }))} />
        </div>
      </div>
    </div>
  )
}

export default PaymentPieChart
