import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const RootRedirect = () => {
  const { isAuthenticated, isLoading, user } = useAuth()
  
  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }
  
  // If not authenticated, show the landing page
  if (!isAuthenticated) {
    return <Navigate to="/landing" replace />
  }
  
  // If authenticated, redirect based on role
  if (user?.role === 'admin' || user?.role === 'super_user') {
    return <Navigate to="/dashboard" replace />
  } else {
    return <Navigate to="/my-dashboard" replace />
  }
}

export default RootRedirect
