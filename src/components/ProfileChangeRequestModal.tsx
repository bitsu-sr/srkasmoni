import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MessagingService } from '../services/messagingService';
import { CreateProfileChangeRequestData, UpdateProfileChangeRequestData, RequestType, RequestStatus } from '../types/message';
import { Member } from '../types/member';
import './ProfileChangeRequestModal.css';

interface ProfileChangeRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  member?: Member;
  isAdmin?: boolean;
  requestId?: number;
  currentStatus?: RequestStatus;
}

const ProfileChangeRequestModal: React.FC<ProfileChangeRequestModalProps> = ({
  isOpen,
  onClose,
  member,
  isAdmin = false,
  requestId,
  currentStatus
}) => {
  const [requestType, setRequestType] = useState<RequestType>('profile_update');
  const [requestedChanges, setRequestedChanges] = useState<Record<string, any>>({});
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const queryClient = useQueryClient();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setRequestType('profile_update');
      setRequestedChanges({});
      setRejectionReason('');
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  // Create profile change request mutation
  const createRequestMutation = useMutation({
    mutationFn: (data: CreateProfileChangeRequestData) => 
      MessagingService.createProfileChangeRequest(data),
    onSuccess: () => {
      setSuccess('Profile change request submitted successfully! Admins will be notified.');
      queryClient.invalidateQueries({ queryKey: ['profileChangeRequests'] });
      setTimeout(() => {
        onClose();
      }, 2000);
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to submit request');
    }
  });

  // Update profile change request mutation (for admins)
  const updateRequestMutation = useMutation({
    mutationFn: ({ requestId, data }: { requestId: number; data: UpdateProfileChangeRequestData }) =>
      MessagingService.updateProfileChangeRequest(requestId, data),
    onSuccess: () => {
      setSuccess('Request updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['profileChangeRequests'] });
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
      setTimeout(() => {
        onClose();
      }, 2000);
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to update request');
    }
  });

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!member) {
      setError('Member information is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (isAdmin && requestId) {
        // Admin updating existing request
        const updateData: UpdateProfileChangeRequestData = {
          status: currentStatus === 'pending' ? 'approved' : 'rejected',
          rejection_reason: currentStatus === 'pending' ? undefined : rejectionReason
        };

        await updateRequestMutation.mutateAsync({ requestId, data: updateData });
      } else {
        // Member creating new request
        const requestData: CreateProfileChangeRequestData = {
          member_id: member.id,
          request_type: requestType,
          current_data: {
            firstName: member.firstName,
            lastName: member.lastName,
            email: member.email,
            phone: member.phone,
            address: member.address,
            city: member.city,
            occupation: member.occupation,
            bankName: member.bankName,
            accountNumber: member.accountNumber
          },
          requested_changes: requestedChanges
        };

        await createRequestMutation.mutateAsync(requestData);
      }
    } catch (error) {
      // Error is handled by mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle input changes for requested changes
  const handleChangeInput = (field: string, value: any) => {
    setRequestedChanges(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Get current data fields based on request type
  const getCurrentDataFields = () => {
    if (!member) return [];

    const commonFields = [
      { key: 'firstName', label: 'First Name', value: member.firstName },
      { key: 'lastName', label: 'Last Name', value: member.lastName },
      { key: 'email', label: 'Email', value: member.email },
      { key: 'phone', label: 'Phone', value: member.phone },
      { key: 'address', label: 'Address', value: member.address },
      { key: 'city', label: 'City', value: member.city },
      { key: 'occupation', label: 'Occupation', value: member.occupation },
      { key: 'bankName', label: 'Bank Name', value: member.bankName },
      { key: 'accountNumber', label: 'Account Number', value: member.accountNumber }
    ];

    return commonFields;
  };

  // Get change input fields based on request type
  const getChangeInputFields = () => {
    if (requestType === 'profile_deletion') {
      return [
        { key: 'deletion_reason', label: 'Reason for Deletion', type: 'textarea' }
      ];
    }

    return getCurrentDataFields().map(field => ({
      ...field,
      type: 'input'
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="profile-request-modal-overlay" onClick={onClose}>
      <div className="profile-request-modal" onClick={e => e.stopPropagation()}>
        <div className="profile-request-modal-header">
          <h2 className="profile-request-modal-title">
            {isAdmin 
              ? `Review Profile Change Request`
              : requestType === 'profile_deletion' 
                ? 'Request Profile Deletion' 
                : 'Request Profile Changes'
            }
          </h2>
          <button 
            className="profile-request-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="profile-request-modal-body">
            {error && (
              <div className="error-message-profile">
                {error}
              </div>
            )}

            {success && (
              <div className="success-message-profile">
                {success}
              </div>
            )}

            {!isAdmin && (
              <>
                {/* Request Type Selection */}
                <div className="request-type-section">
                  <label className="request-type-label">
                    Request Type
                  </label>
                  <select
                    className="request-type-select"
                    value={requestType}
                    onChange={(e) => setRequestType(e.target.value as RequestType)}
                    disabled={isSubmitting}
                  >
                    <option value="profile_update">Update Profile Information</option>
                    <option value="profile_deletion">Delete Profile</option>
                  </select>
                </div>

                {/* Current Data Display */}
                <div className="current-data-section">
                  <h3 className="current-data-title">Current Information</h3>
                  <div className="current-data-grid">
                    {getCurrentDataFields().map(field => (
                      <div key={field.key} className="current-data-field">
                        <label className="current-data-label">{field.label}</label>
                        <div className="current-data-value">{field.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Requested Changes Input */}
                <div className="changes-section">
                  <h3 className="changes-title">
                    {requestType === 'profile_deletion' ? 'Deletion Details' : 'Requested Changes'}
                  </h3>
                  <div className="changes-grid">
                    {getChangeInputFields().map(field => (
                      <div key={field.key} className="change-field">
                        <label className="change-label">{field.label}</label>
                        {field.type === 'textarea' ? (
                          <textarea
                            className={`change-input change-textarea`}
                            value={requestedChanges[field.key] || ''}
                            onChange={(e) => handleChangeInput(field.key, e.target.value)}
                            disabled={isSubmitting}
                            required={requestType === 'profile_deletion'}
                          />
                        ) : (
                          <input
                            type="text"
                            className="change-input"
                            value={requestedChanges[field.key] || ''}
                            onChange={(e) => handleChangeInput(field.key, e.target.value)}
                            disabled={isSubmitting}
                            placeholder={`Enter new ${field.label.toLowerCase()}`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Admin Actions */}
            {isAdmin && currentStatus === 'pending' && (
              <>
                <div className="warning-message-profile">
                  <strong>Pending Request:</strong> This profile change request is awaiting your review.
                </div>
                
                <div className="reason-section">
                  <label className="reason-label">
                    Rejection Reason (if rejecting)
                  </label>
                  <textarea
                    className="reason-textarea"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Provide a reason for rejection if applicable..."
                  />
                </div>
              </>
            )}
          </div>

          <div className="profile-request-modal-footer">
            <button
              type="button"
              className="profile-request-modal-btn profile-request-modal-btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>

            {isAdmin && currentStatus === 'pending' ? (
              <>
                <button
                  type="submit"
                  className="profile-request-modal-btn profile-request-modal-btn-danger"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="loading-spinner-small"></span>
                      Rejecting...
                    </>
                  ) : (
                    'Reject Request'
                  )}
                </button>
                
                <button
                  type="submit"
                  className="profile-request-modal-btn profile-request-modal-btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="loading-spinner-small"></span>
                      Approving...
                    </>
                  ) : (
                    'Approve Request'
                  )}
                </button>
              </>
            ) : (
              <button
                type="submit"
                className="profile-request-modal-btn profile-request-modal-btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading-spinner-small"></span>
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileChangeRequestModal;
