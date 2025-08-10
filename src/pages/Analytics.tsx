import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { TrendingUp, DollarSign, Users, Calendar } from 'lucide-react'
import './Analytics.css'

const Analytics = () => {
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
