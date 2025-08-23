export type MessageType = 'payment_notification' | 'profile_change_request' | 'profile_deletion_request' | 'profile_update_notification' | 'system_notification';
export type SenderType = 'admin' | 'member' | 'system';
export type RequestType = 'profile_update' | 'profile_deletion';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface Message {
  id: number;
  subject: string;
  content: string;
  message_type: MessageType;
  sender_id: string;
  sender_type: SenderType;
  sender_ip_address?: string;
  created_at: string;
  updated_at: string;
}

export interface MessageRecipient {
  id: number;
  message_id: number;
  recipient_id: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface MessageWithRecipients extends Message {
  recipients: MessageRecipient[];
  sender_name?: string;
  sender_email?: string;
}

export interface InboxMessage {
  id: number;
  subject: string;
  message_type: MessageType;
  sender_id: string;
  sender_name: string;
  sender_email: string;
  sender_type: SenderType;
  sender_ip_address?: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileChangeRequest {
  id: number;
  member_id: number;
  request_type: RequestType;
  current_data: Record<string, any>;
  requested_changes: Record<string, any>;
  status: RequestStatus;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMessageData {
  subject: string;
  content: string;
  message_type: MessageType;
  recipient_ids: string[];
  sender_ip_address?: string;
}

export interface CreateProfileChangeRequestData {
  member_id: number;
  request_type: RequestType;
  current_data: Record<string, any>;
  requested_changes: Record<string, any>;
}

export interface UpdateProfileChangeRequestData {
  status: RequestStatus;
  rejection_reason?: string;
}

export interface MessageFilters {
  message_type?: MessageType;
  is_read?: boolean;
  sender_type?: SenderType;
  date_from?: string;
  date_to?: string;
}
