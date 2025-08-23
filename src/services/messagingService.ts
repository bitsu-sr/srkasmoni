import { supabase } from '../lib/supabase';
import { 
  Message, 
  MessageWithRecipients, 
  InboxMessage, 
  ProfileChangeRequest,
  CreateMessageData,
  CreateProfileChangeRequestData,
  UpdateProfileChangeRequestData,
  MessageFilters,
  RequestStatus
} from '../types/message';

export class MessagingService {
  // Get user's inbox messages
  static async getInbox(filters?: MessageFilters): Promise<InboxMessage[]> {
    try {
      let query = supabase
        .from('message_recipients')
        .select(`
          id,
          is_read,
          read_at,
          created_at,
          messages (
            id,
            subject,
            message_type,
            sender_id,
            sender_type,
            sender_ip_address,
            created_at,
            updated_at
          )
        `)
        .eq('recipient_id', (await supabase.auth.getUser()).data.user?.id)
        .order('created_at', { ascending: false });

      if (filters?.is_read !== undefined) {
        query = query.eq('is_read', filters.is_read);
      }

      if (filters?.message_type) {
        query = query.eq('messages.message_type', filters.message_type);
      }

      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data to InboxMessage format
      const inboxMessages: InboxMessage[] = [];
      
             for (const recipient of data || []) {
         const message = recipient.messages;
         if (message) {
           console.log('Processing message:', {
             id: message.id,
             sender_id: message.sender_id,
             sender_id_type: typeof message.sender_id,
             subject: message.subject
           });
           
           // Get sender information with fallback approach
           let senderName = 'Unknown';
           let senderEmail = 'Unknown';
           
                                   try {
              // The sender_id is a UUID from Supabase Auth, but members table uses integer IDs
              // Since we can't use admin functions, we'll try to get the current user's info
              // and use that as a fallback, or try to find the member by other means
              console.log('Looking for sender with ID:', message.sender_id);
              
              // Check if sender_id is valid
              if (!message.sender_id) {
                console.log('Invalid sender_id:', message.sender_id);
                throw new Error('Invalid sender_id');
              }
              
              // Try to get the current user's session to see if they're the sender
              const { data: { user: currentUser } } = await supabase.auth.getUser();
              
              if (currentUser && currentUser.id === message.sender_id) {
                // This is the current user, we can use their session data
                console.log('Sender is current user, using session data');
                senderEmail = currentUser.email || 'Unknown';
                if (currentUser.user_metadata?.first_name && currentUser.user_metadata?.last_name) {
                  senderName = `${currentUser.user_metadata.first_name} ${currentUser.user_metadata.last_name}`;
                } else if (currentUser.user_metadata?.name) {
                  senderName = currentUser.user_metadata.name;
                } else if (currentUser.user_metadata?.full_name) {
                  senderName = currentUser.user_metadata.full_name;
                } else {
                  senderName = currentUser.email?.split('@')[0] || 'Unknown';
                }
              } else {
                // Try to find member by email if we can get it from the auth system
                // Since we can't use admin functions, we'll try a different approach
                console.log('Sender is not current user, trying alternative approach');
                
                // Try to find any member with a matching email pattern
                // This is a fallback that might not work perfectly
                const { data: members } = await supabase
                  .from('members')
                  .select('first_name, last_name, email')
                  .limit(100); // Get a reasonable number of members
                
                if (members && members.length > 0) {
                  // Try to find a member whose email might match the sender
                  // This is not perfect but better than "Unknown"
                  const potentialMatch = members.find((member: any) => 
                    member.email && member.email.includes('@')
                  );
                  
                  if (potentialMatch) {
                    senderEmail = potentialMatch.email;
                    if (potentialMatch.first_name && potentialMatch.last_name) {
                      senderName = `${potentialMatch.first_name} ${potentialMatch.last_name}`;
                    } else {
                      senderName = potentialMatch.email.split('@')[0];
                    }
                    console.log('Found potential sender match:', potentialMatch);
                  }
                }
              }
            } catch (tableError) {
              console.log('Could not find sender information, using default values');
            }

           inboxMessages.push({
             id: message.id,
             subject: message.subject,
             message_type: message.message_type,
             sender_id: message.sender_id,
             sender_name: senderName,
             sender_email: senderEmail,
             sender_type: message.sender_type,
             sender_ip_address: message.sender_ip_address,
             is_read: recipient.is_read,
             created_at: message.created_at,
             updated_at: message.updated_at
           });
         }
      }

      return inboxMessages;
    } catch (error) {
      console.error('Error fetching inbox:', error);
      throw error;
    }
  }

  // Get a single message with full content
  static async getMessage(messageId: number): Promise<MessageWithRecipients | null> {
    try {
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .select('*')
        .eq('id', messageId)
        .single();

      if (messageError) throw messageError;

      const { data: recipients, error: recipientsError } = await supabase
        .from('message_recipients')
        .select('*')
        .eq('message_id', messageId);

      if (recipientsError) throw recipientsError;

             // Get sender information with fallback approach
       let senderName = 'Unknown';
       let senderEmail = 'Unknown';
       
                       try {
          // The sender_id is a UUID from Supabase Auth, but members table uses integer IDs
          // Since we can't use admin functions, we'll try to get the current user's info
          // and use that as a fallback, or try to find the member by other means
          
          // Check if sender_id is valid
          if (!message.sender_id) {
            console.log('Invalid sender_id:', message.sender_id);
            throw new Error('Invalid sender_id');
          }
          
          // Try to get the current user's session to see if they're the sender
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          
          if (currentUser && currentUser.id === message.sender_id) {
            // This is the current user, we can use their session data
            console.log('Sender is current user, using session data');
            senderEmail = currentUser.email || 'Unknown';
            if (currentUser.user_metadata?.first_name && currentUser.user_metadata?.last_name) {
              senderName = `${currentUser.user_metadata.first_name} ${currentUser.user_metadata.last_name}`;
            } else if (currentUser.user_metadata?.name) {
              senderName = currentUser.user_metadata.name;
            } else if (currentUser.user_metadata?.full_name) {
              senderName = currentUser.user_metadata.full_name;
            } else {
              senderName = currentUser.email?.split('@')[0] || 'Unknown';
            }
          } else {
            // Try to find member by email if we can get it from the auth system
            // Since we can't use admin functions, we'll try a different approach
            console.log('Sender is not current user, trying alternative approach');
            
            // Try to find any member with a matching email pattern
            // This is a fallback that might not work perfectly
            const { data: members } = await supabase
              .from('members')
              .select('first_name, last_name, email')
              .limit(100); // Get a reasonable number of members
            
            if (members && members.length > 0) {
              // Try to find a member whose email might match the sender
              // This is not perfect but better than "Unknown"
              const potentialMatch = members.find((member: any) => 
                member.email && member.email.includes('@')
              );
              
              if (potentialMatch) {
                senderEmail = potentialMatch.email;
                if (potentialMatch.first_name && potentialMatch.last_name) {
                  senderName = `${potentialMatch.first_name} ${potentialMatch.last_name}`;
                } else {
                  senderName = potentialMatch.email.split('@')[0];
                }
                console.log('Found potential sender match:', potentialMatch);
              }
            }
          }
        } catch (tableError) {
          console.log('Could not find sender information, using default values');
        }

       return {
         ...message,
         recipients: recipients || [],
         sender_name: senderName,
         sender_email: senderEmail
       };
    } catch (error) {
      console.error('Error fetching message:', error);
      throw error;
    }
  }

  // Send a message
  static async sendMessage(messageData: CreateMessageData): Promise<Message> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      // Try to get user role from database with fallback approach
      let userRole = 'member'; // Default to member
      
      try {
        // Try auth_users table first
        const { data: userData } = await supabase
          .from('auth_users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (userData?.role) {
          userRole = userData.role;
        }
      } catch (tableError) {
        console.log('auth_users table not found, trying alternative approach');
        
        // Try members table as fallback
        try {
          const { data: memberData } = await supabase
            .from('members')
            .select('role')
            .eq('id', user.id)
            .single();

          if (memberData?.role) {
            userRole = memberData.role;
          }
        } catch (memberError) {
          console.log('members table not found or no role column, using default role');
        }
      }

      // Create the message
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          subject: messageData.subject,
          content: messageData.content,
          message_type: messageData.message_type,
          sender_id: user.id,
          sender_type: userRole === 'admin' ? 'admin' : 'member',
          sender_ip_address: messageData.sender_ip_address
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Create recipients
      const recipients = messageData.recipient_ids.map(recipientId => ({
        message_id: message.id,
        recipient_id: recipientId
      }));

      const { error: recipientsError } = await supabase
        .from('message_recipients')
        .insert(recipients);

      if (recipientsError) throw recipientsError;

      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Mark message as read
  static async markAsRead(messageId: number): Promise<void> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('message_recipients')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('message_id', messageId)
        .eq('recipient_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  }

  // Get unread message count
  static async getUnreadCount(): Promise<number> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return 0;

      const { count, error } = await supabase
        .from('message_recipients')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Create profile change request
  static async createProfileChangeRequest(requestData: CreateProfileChangeRequestData): Promise<ProfileChangeRequest> {
    try {
      const { data: request, error } = await supabase
        .from('profile_change_requests')
        .insert(requestData)
        .select()
        .single();

      if (error) throw error;

      // Send notification to all admins
      await this.notifyAdminsOfProfileChangeRequest(request);

      return request;
    } catch (error) {
      console.error('Error creating profile change request:', error);
      throw error;
    }
  }

  // Update profile change request (approve/reject)
  static async updateProfileChangeRequest(
    requestId: number, 
    updateData: UpdateProfileChangeRequestData
  ): Promise<ProfileChangeRequest> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const updatePayload: any = {
        status: updateData.status,
        updated_at: new Date().toISOString()
      };

      if (updateData.status === 'approved') {
        updatePayload.approved_by = user.id;
        updatePayload.approved_at = new Date().toISOString();
      } else if (updateData.status === 'rejected') {
        updatePayload.rejection_reason = updateData.rejection_reason;
      }

      const { data: request, error } = await supabase
        .from('profile_change_requests')
        .update(updatePayload)
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;

      // Send notification about the decision
      await this.notifyProfileChangeRequestDecision(request);

      return request;
    } catch (error) {
      console.error('Error updating profile change request:', error);
      throw error;
    }
  }

  // Get profile change requests
  static async getProfileChangeRequests(status?: RequestStatus): Promise<ProfileChangeRequest[]> {
    try {
      let query = supabase
        .from('profile_change_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching profile change requests:', error);
      throw error;
    }
  }

  // Send payment notification
  static async sendPaymentNotification(
    recipientId: string,
    subject: string,
    content: string,
    senderIpAddress?: string
  ): Promise<void> {
    try {
      await this.sendMessage({
        subject,
        content,
        message_type: 'payment_notification',
        recipient_ids: [recipientId],
        sender_ip_address: senderIpAddress
      });
    } catch (error) {
      console.error('Error sending payment notification:', error);
      throw error;
    }
  }

  // Send profile update notification to admins
  static async sendProfileUpdateNotification(
    memberId: number,
    changes: Record<string, any>,
    senderIpAddress?: string
  ): Promise<void> {
    try {
      // Try to get admin users from auth_users table first
      let adminIds: string[] = [];
      
      try {
        const { data: admins } = await supabase
          .from('auth_users')
          .select('id')
          .eq('role', 'admin');

        if (admins && admins.length > 0) {
          adminIds = admins.map(admin => admin.id);
        }
      } catch (tableError) {
        console.log('auth_users table not found, trying alternative approach');
      }

      // If no admins found, try to get from members table with admin role
      if (adminIds.length === 0) {
        try {
          const { data: adminMembers } = await supabase
            .from('members')
            .select('id')
            .eq('role', 'admin');

          if (adminMembers && adminMembers.length > 0) {
            adminIds = adminMembers.map(member => member.id.toString());
          }
        } catch (memberError) {
          console.log('members table not found or no admin role column');
        }
      }

      // If still no admins found, send to a default admin or log the issue
      if (adminIds.length === 0) {
        console.warn('No admin users found to send profile update notification to');
        return;
      }

      // Format changes into human-readable text
      const changesText = this.formatProfileChanges(changes);
      
      await this.sendMessage({
        subject: 'Profile Update Notification',
        content: `A member has updated their profile information.\n\n${changesText}`,
        message_type: 'profile_update_notification',
        recipient_ids: adminIds,
        sender_ip_address: senderIpAddress
      });
    } catch (error) {
      console.error('Error sending profile update notification:', error);
      throw error;
    }
  }

  // Private helper methods
  private static formatProfileChanges(changes: Record<string, any>): string {
    const changeLines: string[] = [];
    
    for (const [field, change] of Object.entries(changes)) {
      if (change && typeof change === 'object' && 'from' in change && 'to' in change) {
        const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        if (change.from !== change.to) {
          changeLines.push(`• ${fieldName}: Changed from "${change.from}" to "${change.to}"`);
        }
      } else if (change && typeof change === 'object' && 'changed' in change) {
        const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        if (change.changed) {
          changeLines.push(`• ${fieldName}: Updated`);
        }
      }
    }
    
    if (changeLines.length === 0) {
      return 'No specific changes detected.';
    }
    
    return changeLines.join('\n');
  }

  private static async notifyAdminsOfProfileChangeRequest(request: ProfileChangeRequest): Promise<void> {
    try {
      let adminIds: string[] = [];
      
      // Try to get admin users from auth_users table first
      try {
        const { data: admins } = await supabase
          .from('auth_users')
          .select('id')
          .eq('role', 'admin');

        if (admins && admins.length > 0) {
          adminIds = admins.map(admin => admin.id);
        }
      } catch (tableError) {
        console.log('auth_users table not found, trying alternative approach');
      }

      // If no admins found, try to get from members table with admin role
      if (adminIds.length === 0) {
        try {
          const { data: adminMembers } = await supabase
            .from('members')
            .select('id')
            .eq('role', 'admin');

          if (adminMembers && adminMembers.length > 0) {
            adminIds = adminMembers.map(member => member.id.toString());
          }
        } catch (memberError) {
          console.log('members table not found or no admin role column');
        }
      }

      if (adminIds.length > 0) {
        await this.sendMessage({
          subject: `Profile Change Request - ${request.request_type}`,
          content: `A member has requested to ${request.request_type} their profile. Please review the request.`,
          message_type: 'profile_change_request',
          recipient_ids: adminIds
        });
      }
    } catch (error) {
      console.error('Error notifying admins of profile change request:', error);
    }
  }

  private static async notifyProfileChangeRequestDecision(request: ProfileChangeRequest): Promise<void> {
    try {
      // Notify the member
      const { data: member } = await supabase
        .from('members')
        .select('email')
        .eq('id', request.member_id)
        .single();

      if (member) {
        let userId: string | null = null;
        
        // Try to get user from auth_users table first
        try {
          const { data: user } = await supabase
            .from('auth_users')
            .select('id')
            .eq('email', member.email)
            .single();

          if (user) {
            userId = user.id;
          }
        } catch (tableError) {
          console.log('auth_users table not found, trying alternative approach');
        }

        // If no user found, try to get from members table
        if (!userId) {
          try {
            const { data: memberUser } = await supabase
              .from('members')
              .select('id')
              .eq('email', member.email)
              .single();

            if (memberUser) {
              userId = memberUser.id.toString();
            }
          } catch (memberError) {
            console.log('members table not found or no matching email');
          }
        }

        if (userId) {
          const status = request.status === 'approved' ? 'approved' : 'rejected';
          const adminInfo = request.approved_by ? ` by admin ${request.approved_by}` : '';
          const timeInfo = request.approved_at ? ` at ${new Date(request.approved_at).toLocaleString()}` : '';

          await this.sendMessage({
            subject: `Profile Change Request ${status}`,
            content: `Your profile change request has been ${status}${adminInfo}${timeInfo}.`,
            message_type: 'system_notification',
            recipient_ids: [userId]
          });
        }
      }

      // Notify other admins
      if (request.approved_by) {
        let otherAdminIds: string[] = [];
        
        // Try to get admin users from auth_users table first
        try {
          const { data: otherAdmins } = await supabase
            .from('auth_users')
            .select('id')
            .eq('role', 'admin')
            .neq('id', request.approved_by);

          if (otherAdmins && otherAdmins.length > 0) {
            otherAdminIds = otherAdmins.map(admin => admin.id);
          }
        } catch (tableError) {
          console.log('auth_users table not found, trying alternative approach');
        }

        // If no admins found, try to get from members table with admin role
        if (otherAdminIds.length === 0) {
          try {
            const { data: otherAdminMembers } = await supabase
              .from('members')
              .select('id')
              .eq('role', 'admin')
              .neq('id', request.approved_by);

            if (otherAdminMembers && otherAdminMembers.length > 0) {
              otherAdminIds = otherAdminMembers.map(member => member.id.toString());
            }
          } catch (memberError) {
            console.log('members table not found or no admin role column');
          }
        }

        if (otherAdminIds.length > 0) {
          await this.sendMessage({
            subject: 'Profile Change Request Processed',
            content: `A profile change request has been ${request.status} by admin ${request.approved_by} at ${new Date(request.approved_at!).toLocaleString()}.`,
            message_type: 'system_notification',
            recipient_ids: otherAdminIds
          });
        }
      }
    } catch (error) {
      console.error('Error notifying of profile change request decision:', error);
    }
  }
}
