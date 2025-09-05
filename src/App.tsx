import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { PerformanceSettingsProvider } from './contexts/PerformanceSettingsContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { ReactQueryProvider } from './contexts/ReactQueryProvider'
import { AuthProvider } from './contexts/AuthContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import RootRedirect from './components/RootRedirect'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import MyDashboard from './pages/MyDashboard'
import Groups from './pages/Groups'
import GroupDetails from './pages/GroupDetails'
import Members from './pages/Members'
import MemberDetail from './pages/MemberDetail'
import Payments from './pages/Payments'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import PaymentsDue from './pages/PaymentsDue'
import PaymentLogs from './pages/PaymentLogs'
import Payouts from './pages/Payouts'
import UserManagement from './pages/UserManagement'
import UserProfile from './pages/UserProfile'
import Messaging from './pages/Messaging'
import LoginLogs from './pages/LoginLogs'

import './App.css'

function App() {
  return (
    <ReactQueryProvider>
      <PerformanceSettingsProvider>
        <LanguageProvider>
          <AuthProvider>
            <Router>
              <div className="app">
                <Navbar />
                <main className="main-content">
                <Routes>
                  <Route path="/" element={<RootRedirect />} />
                  <Route path="/landing" element={<Landing />} />
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/my-dashboard" element={
                    <ProtectedRoute>
                      <MyDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/groups" element={
                    <ProtectedRoute>
                      <Groups />
                    </ProtectedRoute>
                  } />
                  <Route path="/groups/:id" element={
                    <ProtectedRoute>
                      <GroupDetails />
                    </ProtectedRoute>
                  } />
                  <Route path="/members" element={
                    <ProtectedRoute>
                      <Members />
                    </ProtectedRoute>
                  } />
                  <Route path="/members/:id" element={
                    <ProtectedRoute>
                      <MemberDetail />
                    </ProtectedRoute>
                  } />
                  <Route path="/payments" element={
                    <ProtectedRoute>
                      <Payments />
                    </ProtectedRoute>
                  } />
                  <Route path="/payment-logs" element={
                    <ProtectedRoute>
                      <PaymentLogs />
                    </ProtectedRoute>
                  } />
                  <Route path="/analytics" element={
                    <ProtectedRoute>
                      <Analytics />
                    </ProtectedRoute>
                  } />
                  <Route path="/payments-due" element={
                    <ProtectedRoute>
                      <PaymentsDue />
                    </ProtectedRoute>
                  } />
                  <Route path="/payouts" element={
                    <ProtectedRoute>
                      <Payouts />
                    </ProtectedRoute>
                  } />
                  <Route path="/settings" element={
                    <ProtectedRoute requireAdmin={true}>
                      <Settings />
                    </ProtectedRoute>
                  } />
                  <Route path="/user-management" element={
                    <ProtectedRoute requireAdmin={true}>
                      <UserManagement />
                    </ProtectedRoute>
                  } />
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <UserProfile />
                    </ProtectedRoute>
                  } />
                  <Route path="/messaging" element={
                    <ProtectedRoute>
                      <Messaging />
                    </ProtectedRoute>
                  } />
                  <Route path="/login-logs" element={
                    <ProtectedRoute requireAdmin={true}>
                      <LoginLogs />
                    </ProtectedRoute>
                  } />

                </Routes>
                </main>
                <Footer />
                <PWAInstallPrompt />
              </div>
            </Router>
          </AuthProvider>
        </LanguageProvider>
      </PerformanceSettingsProvider>
    </ReactQueryProvider>
  )
}

export default App
