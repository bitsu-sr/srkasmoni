import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessagingService } from '../services/messagingService';
import { formatDistanceToNow } from 'date-fns';
import './MessageView.css';

interface MessageViewProps {
  messageId: number;
  onBack?: () => void;
  onReply?: (messageId: number) => void;
  onForward?: (messageId: number) => void;
  onDelete?: (messageId: number) => void;
}

const MessageView: React.FC<MessageViewProps> = ({
  messageId,
  onBack,
  onReply,
  onForward,
  onDelete
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch message details
  const { data: message, isLoading, error } = useQuery({
    queryKey: ['message', messageId],
    queryFn: () => MessagingService.getMessage(messageId),
    enabled: !!messageId,
  });

  // Handle delete confirmation
  const handleDelete = async () => {
    if (!message || !onDelete) return;
    
    if (window.confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
      setIsDeleting(true);
      try {
        await onDelete(messageId);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Format date and time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true });
    } else {
      return date.toLocaleDateString();
    }
  };

  // Get message type display name
  const getMessageTypeDisplay = (type: string): string => {
    const typeMap: Record<string, string> = {
      payment_notification: 'Payment Notification',
      profile_change_request: 'Profile Change Request',
      profile_deletion_request: 'Profile Deletion Request',
      profile_update_notification: 'Profile Update Notification',
      system_notification: 'System Notification'
    };
    return typeMap[type] || type;
  };

  // Get sender initials for avatar
  const getSenderInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Render message content with basic formatting
  const renderMessageContent = (content: string) => {
    // Simple text formatting - you can enhance this with a proper markdown parser
    const formattedContent = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');

    return (
      <div 
        className="message-content"
        dangerouslySetInnerHTML={{ __html: formattedContent }}
      />
    );
  };

  if (isLoading) {
    return (
      <div className="message-view-container">
        <div className="loading-message">
          <div className="spinner-large"></div>
        </div>
      </div>
    );
  }

  if (error || !message) {
    return (
      <div className="message-view-container">
        <div className="error-message">
          Error loading message: {error?.message || 'Message not found'}
        </div>
        {onBack && (
          <button className="back-button" onClick={onBack}>
            ← Back to Inbox
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="message-view-container">
      {onBack && (
        <button className="back-button" onClick={onBack}>
          ← Back to Inbox
        </button>
      )}

      {/* Message Header */}
      <div className="message-view-header">
        <h1 className="message-subject-large">{message.subject}</h1>
        
        <div className="message-meta-detailed">
          <div className="message-sender-detailed">
            <div className="sender-avatar-large">
              {getSenderInitials(message.sender_name || 'Unknown')}
            </div>
            <div className="sender-info-detailed">
              <p className="sender-name-large">{message.sender_name || 'Unknown'}</p>
              <p className="sender-email-large">{message.sender_email || 'Unknown'}</p>
              <span className={`message-type-badge-large ${message.message_type}`}>
                {getMessageTypeDisplay(message.message_type)}
              </span>
            </div>
          </div>

          <div className="message-timestamp-detailed">
            <div className="message-date-detailed">
              {formatDateTime(message.created_at)}
            </div>
            <div className="message-time-detailed">
              {new Date(message.created_at).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit',
                timeZoneName: 'short'
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Message Content */}
      <div className="message-content-container">
        {renderMessageContent(message.content)}

        {/* Message Actions */}
        <div className="message-actions">
          {onReply && (
            <button 
              className="action-button primary-action"
              onClick={() => onReply(messageId)}
            >
              💬 Reply
            </button>
          )}
          
          {onForward && (
            <button 
              className="action-button secondary-action"
              onClick={() => onForward(messageId)}
            >
              📤 Forward
            </button>
          )}
          
          {onDelete && (
            <button 
              className="action-button danger-action"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? '🗑️ Deleting...' : '🗑️ Delete'}
            </button>
          )}
        </div>

        {/* Message Footer with Additional Info */}
        <div className="message-footer">
          <h4 className="message-footer-title">Message Details</h4>
          <p className="message-footer-content">
            <strong>From:</strong> {message.sender_name} ({message.sender_email})<br />
            <strong>Type:</strong> {getMessageTypeDisplay(message.message_type)}<br />
            <strong>Sent:</strong> {new Date(message.created_at).toLocaleString()}<br />
            {message.sender_ip_address && (
              <>
                <strong>IP Address:</strong> <span className="ip-address">{message.sender_ip_address}</span><br />
              </>
            )}
            <strong>Recipients:</strong> {message.recipients.length} recipient(s)
          </p>
        </div>
      </div>
    </div>
  );
};

export default MessageView;
