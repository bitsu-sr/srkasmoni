import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Clock, CheckCircle, XCircle, Eye, MessageSquare } from 'lucide-react';
import './PasswordResetRequests.css';

interface PasswordResetRequest {
  id: number;
  email: string;
  username: string;
  status: 'pending' | 'processed' | 'completed';
  request_date: string;
  processed_date?: string;
  processed_by?: string;
  notes?: string;
  ip_address?: string;
  created_at: string;
}

const PasswordResetRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PasswordResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<PasswordResetRequest | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadPasswordResetRequests();
    }
  }, [user]);

  const loadPasswordResetRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to load from database first
      const { data, error: fetchError } = await supabase
        .from('password_reset_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.log('Database fetch failed, trying localStorage:', fetchError);
        // Fallback to localStorage if database fails
        const localStorageRequests = JSON.parse(localStorage.getItem('password_reset_requests') || '[]');
        setRequests(localStorageRequests);
        return;
      }

      setRequests(data || []);
    } catch (err) {
      console.error('Error loading password reset requests:', err);
      // Fallback to localStorage
      try {
        const localStorageRequests = JSON.parse(localStorage.getItem('password_reset_requests') || '[]');
        setRequests(localStorageRequests);
      } catch (localStorageError) {
        console.error('localStorage fallback also failed:', localStorageError);
        setError('Failed to load password reset requests');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (requestId: number, newStatus: 'processed' | 'completed', notes?: string) => {
    try {
      setProcessing(true);

      const updateData: any = {
        status: newStatus,
        processed_date: new Date().toISOString(),
        processed_by: user?.id
      };

      if (notes) {
        updateData.notes = notes;
      }

      const { error: updateError } = await supabase
        .from('password_reset_requests')
        .update(updateData)
        .eq('id', requestId);

      if (updateError) {
        throw updateError;
      }

      // Reload the requests
      await loadPasswordResetRequests();
      setShowDetails(false);
      setSelectedRequest(null);
    } catch (err) {
      console.error('Error updating request status:', err);
      alert('Failed to update request status');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="status-icon pending" />;
      case 'processed':
        return <CheckCircle className="status-icon processed" />;
      case 'completed':
        return <CheckCircle className="status-icon completed" />;
      default:
        return <Clock className="status-icon pending" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'var(--warning-color)';
      case 'processed':
        return 'var(--info-color)';
      case 'completed':
        return 'var(--success-color)';
      default:
        return 'var(--text-secondary)';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (user?.role !== 'admin') {
    return (
      <div className="password-reset-requests">
        <div className="container">
          <div className="access-denied">
            <h2>Access Denied</h2>
            <p>You need administrator privileges to view this page.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="password-reset-requests">
        <div className="container">
          <div className="loading">
            <h2>Loading Password Reset Requests...</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="password-reset-requests">
      <div className="page-header">
        <div className="container">
          <h1 className="page-title">
            <MessageSquare className="page-icon" />
            Password Reset Requests
          </h1>
          <p className="page-subtitle">Manage user password reset requests</p>
        </div>
      </div>

      <div className="container">
        {error && (
          <div className="error-message">
            {error}
            <button onClick={loadPasswordResetRequests} className="retry-btn">
              Try Again
            </button>
          </div>
        )}

        {requests.length === 0 ? (
          <div className="empty-state">
            <MessageSquare className="empty-icon" />
            <h3>No Password Reset Requests</h3>
            <p>There are currently no pending password reset requests.</p>
            
            {/* Debug test button */}
            <button 
              onClick={() => {
                try {
                  // Check global variable first
                  const globalRequests = (window as any).__passwordResetRequests || [];
                  console.log('PasswordResetRequests page - Global variable:', globalRequests);
                  console.log('PasswordResetRequests page - Global pending count:', globalRequests.filter((req: any) => req.status === 'pending').length);
                  
                  // Check localStorage as backup
                  const localStorageRequests = JSON.parse(localStorage.getItem('password_reset_requests') || '[]');
                  console.log('PasswordResetRequests page - localStorage requests:', localStorageRequests);
                  console.log('PasswordResetRequests page - localStorage pending count:', localStorageRequests.filter((req: any) => req.status === 'pending').length);
                  
                  alert(`Global: ${globalRequests.length} total, ${globalRequests.filter((req: any) => req.status === 'pending').length} pending\nlocalStorage: ${localStorageRequests.length} total, ${localStorageRequests.filter((req: any) => req.status === 'pending').length} pending`);
                } catch (error) {
                  console.error('Error reading storage:', error);
                  alert('Error reading storage');
                }
              }}
              style={{
                background: '#007bff',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                marginTop: '16px'
              }}
            >
              🔍 Test Storage
            </button>
          </div>
        ) : (
          <div className="requests-container">
            <div className="requests-header">
              <h2>All Requests ({requests.length})</h2>
              <button onClick={loadPasswordResetRequests} className="refresh-btn">
                Refresh
              </button>
            </div>

            <div className="requests-grid">
              {requests.map((request) => (
                <div key={request.id} className="request-card">
                  <div className="request-header">
                    <div className="request-status">
                      {getStatusIcon(request.status)}
                      <span 
                        className="status-text"
                        style={{ color: getStatusColor(request.status) }}
                      >
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowDetails(true);
                      }}
                      className="view-details-btn"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                  </div>

                  <div className="request-content">
                    <div className="request-info">
                      <div className="info-row">
                        <strong>Email:</strong>
                        <span>{request.email}</span>
                      </div>
                      {request.username && (
                        <div className="info-row">
                          <strong>Username:</strong>
                          <span>{request.username}</span>
                        </div>
                      )}
                      <div className="info-row">
                        <strong>Requested:</strong>
                        <span>{formatDate(request.request_date)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Request Details Modal */}
      {showDetails && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Password Reset Request Details</h3>
              <button 
                className="modal-close"
                onClick={() => setShowDetails(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-section">
                <h4>User Information</h4>
                <div className="detail-row">
                  <strong>Email:</strong>
                  <span>{selectedRequest.email}</span>
                </div>
                {selectedRequest.username && (
                  <div className="detail-row">
                    <strong>Username:</strong>
                    <span>{selectedRequest.username}</span>
                  </div>
                )}
              </div>

              <div className="detail-section">
                <h4>Request Details</h4>
                <div className="detail-row">
                  <strong>Status:</strong>
                  <span className="status-badge" style={{ backgroundColor: getStatusColor(selectedRequest.status) }}>
                    {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
                  </span>
                </div>
                <div className="detail-row">
                  <strong>Request Date:</strong>
                  <span>{formatDate(selectedRequest.request_date)}</span>
                </div>
                {selectedRequest.ip_address && (
                  <div className="detail-row">
                    <strong>IP Address:</strong>
                    <span>{selectedRequest.ip_address}</span>
                  </div>
                )}
              </div>

              {selectedRequest.processed_date && (
                <div className="detail-section">
                  <h4>Processing Information</h4>
                  <div className="detail-row">
                    <strong>Processed Date:</strong>
                    <span>{formatDate(selectedRequest.processed_date)}</span>
                  </div>
                  {selectedRequest.processed_by && (
                    <div className="detail-row">
                      <strong>Processed By:</strong>
                      <span>{selectedRequest.processed_by}</span>
                    </div>
                  )}
                </div>
              )}

              {selectedRequest.notes && (
                <div className="detail-section">
                  <h4>Notes</h4>
                  <p className="notes-text">{selectedRequest.notes}</p>
                </div>
              )}
            </div>

            <div className="modal-actions">
              {selectedRequest.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleStatusUpdate(selectedRequest.id, 'processed')}
                    className="btn btn-primary"
                    disabled={processing}
                  >
                    Mark as Processed
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(selectedRequest.id, 'completed')}
                    className="btn btn-success"
                    disabled={processing}
                  >
                    Mark as Completed
                  </button>
                </>
              )}
              {selectedRequest.status === 'processed' && (
                <button
                  onClick={() => handleStatusUpdate(selectedRequest.id, 'completed')}
                  className="btn btn-success"
                  disabled={processing}
                >
                  Mark as Completed
                </button>
              )}
              <button
                onClick={() => setShowDetails(false)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PasswordResetRequests;
