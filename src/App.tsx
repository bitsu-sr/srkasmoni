import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { PerformanceSettingsProvider } from './contexts/PerformanceSettingsContext'
import { ReactQueryProvider } from './contexts/ReactQueryProvider'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Dashboard from './pages/Dashboard'
import Groups from './pages/Groups'
import GroupDetails from './pages/GroupDetails'
import Members from './pages/Members'
import MemberDetail from './pages/MemberDetail'
import Payments from './pages/Payments'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import PaymentsDue from './pages/PaymentsDue'
import './App.css'

function App() {
  return (
    <ReactQueryProvider>
      <PerformanceSettingsProvider>
        <Router>
          <div className="app">
            <Navbar />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/groups" element={<Groups />} />
                <Route path="/groups/:id" element={<GroupDetails />} />
                <Route path="/members" element={<Members />} />
                <Route path="/members/:id" element={<MemberDetail />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/payments-due" element={<PaymentsDue />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </PerformanceSettingsProvider>
    </ReactQueryProvider>
  )
}

export default App
