import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessagingService } from '../services/messagingService';
import { MessageFilters, MessageType } from '../types/message';
import { formatDistanceToNow } from 'date-fns';
import './Inbox.css';

interface InboxProps {
  onMessageClick?: (messageId: number) => void;
}

const Inbox: React.FC<InboxProps> = ({ onMessageClick }) => {
  const [filters, setFilters] = useState<MessageFilters>({});
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  // Fetch inbox messages
  const { data: messages = [], isLoading, error } = useQuery({
    queryKey: ['inbox', filters],
    queryFn: () => MessagingService.getInbox(filters),
    staleTime: 30000, // 30 seconds
  });

  // Fetch unread count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unreadCount'],
    queryFn: () => MessagingService.getUnreadCount(),
    staleTime: 10000, // 10 seconds
  });

  // Mark message as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (messageId: number) => MessagingService.markAsRead(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
    },
  });

  // Handle message click
  const handleMessageClick = async (messageId: number) => {
    setSelectedMessageId(messageId);
    
    // Mark message as read if it's unread
    const message = messages.find(m => m.id === messageId);
    if (message && !message.is_read) {
      await markAsReadMutation.mutateAsync(messageId);
    }

    // Call parent callback if provided
    if (onMessageClick) {
      onMessageClick(messageId);
    }
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof MessageFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({});
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
  const getMessageTypeDisplay = (type: MessageType): string => {
    const typeMap: Record<MessageType, string> = {
      payment_notification: 'Payment',
      profile_change_request: 'Profile Request',
      profile_deletion_request: 'Deletion Request',
      profile_update_notification: 'Profile Update',
      system_notification: 'System',
      password_reset_request: 'Password Reset'
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

  if (error) {
    return (
      <div className="inbox-container">
        <div className="inbox-header">
          <h1 className="inbox-title">Inbox</h1>
        </div>
        <div className="error-message">
          Error loading messages: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="inbox-container">
      <div className="inbox-header">
        <h1 className="inbox-title">Inbox</h1>
        <div className="inbox-stats">
          <div className="unread-badge">
            {unreadCount} unread
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="inbox-filters">
        <div className="filter-group">
          <label className="filter-label">Message Type</label>
          <select
            className="filter-select"
            value={filters.message_type || ''}
            onChange={(e) => handleFilterChange('message_type', e.target.value || undefined)}
          >
            <option value="">All Types</option>
            <option value="payment_notification">Payment Notifications</option>
            <option value="profile_change_request">Profile Requests</option>
            <option value="profile_deletion_request">Deletion Requests</option>
            <option value="profile_update_notification">Profile Updates</option>
            <option value="system_notification">System Messages</option>
            <option value="password_reset_request">Password Reset Requests</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Status</label>
          <select
            className="filter-select"
            value={filters.is_read === undefined ? '' : filters.is_read.toString()}
            onChange={(e) => handleFilterChange('is_read', e.target.value === '' ? undefined : e.target.value === 'true')}
          >
            <option value="">All Messages</option>
            <option value="false">Unread</option>
            <option value="true">Read</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Date From</label>
          <input
            type="date"
            className="date-input"
            value={filters.date_from || ''}
            onChange={(e) => handleFilterChange('date_from', e.target.value || undefined)}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label">Date To</label>
          <input
            type="date"
            className="date-input"
            value={filters.date_to || ''}
            onChange={(e) => handleFilterChange('date_to', e.target.value || undefined)}
          />
        </div>

        <button
          className="clear-filters-btn"
          onClick={clearFilters}
        >
          Clear Filters
        </button>
      </div>

      {/* Messages List */}
      <div className="messages-list">
        {isLoading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="empty-inbox">
            <div className="empty-inbox-icon">📬</div>
            <p className="empty-inbox-text">
              {Object.keys(filters).length > 0 
                ? 'No messages match your filters'
                : 'No messages in your inbox'
              }
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`message-item ${!message.is_read ? 'unread' : ''} ${selectedMessageId === message.id ? 'selected' : ''}`}
              onClick={() => handleMessageClick(message.id)}
            >
              <div className="message-header">
                <h3 className="message-subject">{message.subject}</h3>
                <div className="message-meta">
                  <div className="message-date">
                    {formatDateTime(message.created_at)}
                  </div>
                  <div className="message-time">
                    {new Date(message.created_at).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              </div>

              <div className="message-sender">
                <div className="sender-avatar">
                  {getSenderInitials(message.sender_name)}
                </div>
                <div className="sender-info">
                  <p className="sender-name">{message.sender_name}</p>
                  <p className="sender-email">{message.sender_email}</p>
                </div>
                <span className={`message-type-badge ${message.message_type}`}>
                  {getMessageTypeDisplay(message.message_type)}
                </span>
              </div>

              {/* Message preview - you can customize this based on your needs */}
              <p className="message-preview">
                Click to view message content...
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Inbox;
