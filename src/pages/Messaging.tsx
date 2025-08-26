import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { MessagingService } from '../services/messagingService';
import Inbox from '../components/Inbox';
import MessageView from '../components/MessageView';
import ProfileChangeRequestModal from '../components/ProfileChangeRequestModal';
import { Member } from '../types/member';
import { ProfileChangeRequest } from '../types/message';
import './Messaging.css';

type MessagingTab = 'inbox' | 'requests' | 'sent';

const Messaging: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<MessagingTab>('inbox');
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);
  const [isProfileRequestModalOpen, setIsProfileRequestModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ProfileChangeRequest | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Fetch profile change requests (for admins)
  const { data: profileRequests = [] } = useQuery({
    queryKey: ['profileChangeRequests'],
    queryFn: () => MessagingService.getProfileChangeRequests(),
    enabled: user?.role === 'admin',
    staleTime: 30000,
  });

  // Fetch user's member data (for non-admins)
  const { data: userMember } = useQuery({
    queryKey: ['userMember', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      // This would need to be implemented in your memberService
      // For now, returning a mock member object
      return {
        id: 1,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: '',
        address: '',
        city: '',
        occupation: '',
        bankName: '',
        accountNumber: '',
        birthDate: '',
        birthplace: '',
        nationalId: '',
        nationality: '',
        dateOfRegistration: '',
        totalReceived: 0,
        lastPayment: '',
        nextPayment: '',
        status: 'active',
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as Member;
    },
    enabled: !!user?.email && user.role !== 'admin',
  });

  // Handle message selection
  const handleMessageClick = (messageId: number) => {
    setSelectedMessageId(messageId);
  };

  // Handle back to inbox
  const handleBackToInbox = () => {
    setSelectedMessageId(null);
  };

  // Handle profile change request creation
  const handleCreateProfileRequest = () => {
    if (userMember) {
      setSelectedMember(userMember);
      setIsProfileRequestModalOpen(true);
    }
  };

  // Handle profile change request review (for admins)
  const handleReviewRequest = (request: ProfileChangeRequest) => {
    setSelectedRequest(request);
    setIsProfileRequestModalOpen(true);
  };

  // Handle profile request modal close
  const handleCloseProfileRequestModal = () => {
    setIsProfileRequestModalOpen(false);
    setSelectedRequest(null);
    setSelectedMember(null);
  };

  // Handle message actions
  const handleReply = (_messageId: number) => {
    // Implement reply functionality
  };

  const handleForward = (_messageId: number) => {
    // Implement forward functionality
  };

  const handleDelete = async (_messageId: number) => {
    // Implement delete functionality
    setSelectedMessageId(null);
  };

  // Get pending requests count
  const pendingRequestsCount = profileRequests.filter(req => req.status === 'pending').length;

  // Get unread messages count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unreadCount'],
    queryFn: () => MessagingService.getUnreadCount(),
    staleTime: 10000,
  });

  return (
    <div className="messaging-page-container">
      <div className="messaging-layout">
        {/* Sidebar */}
        <div className="messaging-sidebar">
          <div className="messaging-sidebar-header">
            <h3 className="messaging-sidebar-title">Messaging</h3>
            <div className="messaging-sidebar-stats">
              <div className="messaging-stat">
                <p className="messaging-stat-number">{unreadCount}</p>
                <p className="messaging-stat-label">Unread</p>
              </div>
              {user?.role === 'admin' && (
                <div className="messaging-stat">
                  <p className="messaging-stat-number">{pendingRequestsCount}</p>
                  <p className="messaging-stat-label">Pending</p>
                </div>
              )}
            </div>
          </div>

          <div className="messaging-sidebar-actions">
            {user?.role !== 'admin' && (
              <button
                className="messaging-action-btn"
                onClick={handleCreateProfileRequest}
              >
                📝 Request Changes
              </button>
            )}
            
            <button
              className="messaging-action-btn secondary"
              onClick={() => setActiveTab('sent')}
            >
              📤 Sent Messages
            </button>
          </div>

          <div className="messaging-sidebar-content">
            <div className="messaging-quick-actions">
              <h4 className="quick-action-title">Quick Actions</h4>
              
              <div className="quick-action-item" onClick={() => setActiveTab('inbox')}>
                <div className="quick-action-icon">📥</div>
                <span className="quick-action-text">Inbox</span>
              </div>
              
              {user?.role === 'admin' && (
                <div className="quick-action-item" onClick={() => setActiveTab('requests')}>
                  <div className="quick-action-icon">📋</div>
                  <span className="quick-action-text">Profile Requests</span>
                </div>
              )}
              
              <div className="quick-action-item" onClick={() => setActiveTab('sent')}>
                <div className="quick-action-icon">📤</div>
                <span className="quick-action-text">Sent Messages</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="messaging-main">
          <div className="messaging-header">
            <h1 className="messaging-header-title">
              {activeTab === 'inbox' && 'Inbox'}
              {activeTab === 'requests' && 'Profile Change Requests'}
              {activeTab === 'sent' && 'Sent Messages'}
            </h1>
            <p className="messaging-header-subtitle">
              {activeTab === 'inbox' && 'Manage your incoming messages and notifications'}
              {activeTab === 'requests' && 'Review and process member profile change requests'}
              {activeTab === 'sent' && 'View messages you have sent'}
            </p>
          </div>

          <div className="messaging-content">

            {/* Tab Content */}
            <div className="messaging-tab-container">
              {/* Inbox Tab */}
              <div className={`messaging-tab-content ${activeTab === 'inbox' ? 'active' : ''}`}>
                {selectedMessageId ? (
                  <div className="messaging-view">
                    <MessageView
                      messageId={selectedMessageId}
                      onBack={handleBackToInbox}
                      onReply={handleReply}
                      onForward={handleForward}
                      onDelete={handleDelete}
                    />
                  </div>
                ) : (
                  <div className="messaging-inbox">
                    <Inbox onMessageClick={handleMessageClick} />
                  </div>
                )}
              </div>

              {/* Profile Requests Tab (Admin Only) */}
              {user?.role === 'admin' && (
                <div className={`messaging-tab-content ${activeTab === 'requests' ? 'active' : ''}`}>
                  <div className="messaging-inbox">
                    {profileRequests.length === 0 ? (
                      <div className="messaging-empty-state">
                        <div className="messaging-empty-icon">📋</div>
                        <h3 className="messaging-empty-title">No Profile Requests</h3>
                        <p className="messaging-empty-text">
                          There are no pending profile change requests at this time.
                        </p>
                      </div>
                    ) : (
                      <div style={{ padding: '20px' }}>
                        <h3>Profile Change Requests</h3>
                        <div style={{ display: 'grid', gap: '15px', marginTop: '20px' }}>
                          {profileRequests.map((request) => (
                            <div
                              key={request.id}
                              style={{
                                padding: '20px',
                                border: '1px solid #e9ecef',
                                borderRadius: '8px',
                                backgroundColor: 'white',
                                cursor: 'pointer'
                              }}
                              onClick={() => handleReviewRequest(request)}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <h4 style={{ margin: 0, color: '#333' }}>
                                  {request.request_type === 'profile_update' ? 'Profile Update Request' : 'Profile Deletion Request'}
                                </h4>
                                <span style={{
                                  padding: '4px 8px',
                                  borderRadius: '12px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  backgroundColor: request.status === 'pending' ? '#fff3cd' : 
                                                   request.status === 'approved' ? '#d4edda' : '#f8d7da',
                                  color: request.status === 'pending' ? '#856404' : 
                                         request.status === 'approved' ? '#155724' : '#721c24'
                                }}>
                                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                </span>
                              </div>
                              <p style={{ margin: '5px 0', color: '#666' }}>
                                <strong>Member ID:</strong> {request.member_id}
                              </p>
                              <p style={{ margin: '5px 0', color: '#666' }}>
                                <strong>Requested:</strong> {new Date(request.created_at).toLocaleDateString()}
                              </p>
                              {request.status === 'pending' && (
                                <p style={{ margin: '10px 0', color: '#856404', fontStyle: 'italic' }}>
                                  Click to review this request
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sent Messages Tab */}
              <div className={`messaging-tab-content ${activeTab === 'sent' ? 'active' : ''}`}>
                <div className="messaging-inbox">
                  <div className="messaging-empty-state">
                    <div className="messaging-empty-icon">📤</div>
                    <h3 className="messaging-empty-title">Sent Messages</h3>
                    <p className="messaging-empty-text">
                      Messages you have sent will appear here. This feature is coming soon.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Change Request Modal */}
      <ProfileChangeRequestModal
        isOpen={isProfileRequestModalOpen}
        onClose={handleCloseProfileRequestModal}
        member={selectedMember || undefined}
        isAdmin={user?.role === 'admin'}
        requestId={selectedRequest?.id}
        currentStatus={selectedRequest?.status}
      />
    </div>
  );
};

export default Messaging;
