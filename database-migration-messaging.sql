-- Database Migration for Messaging System
-- Run this in your Supabase SQL Editor

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  subject VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  message_type VARCHAR(50) NOT NULL CHECK (message_type IN ('payment_notification', 'profile_change_request', 'profile_deletion_request', 'profile_update_notification', 'system_notification')),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('admin', 'member', 'system')),
  sender_ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create message_recipients table for many-to-many relationship
CREATE TABLE IF NOT EXISTS message_recipients (
  id BIGSERIAL PRIMARY KEY,
  message_id BIGINT REFERENCES messages(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profile_change_requests table
CREATE TABLE IF NOT EXISTS profile_change_requests (
  id BIGSERIAL PRIMARY KEY,
  member_id BIGINT REFERENCES members(id) ON DELETE CASCADE,
  request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('profile_update', 'profile_deletion')),
  current_data JSONB NOT NULL,
  requested_changes JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_message_type ON messages(message_type);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_message_recipients_recipient_id ON message_recipients(recipient_id);
CREATE INDEX idx_message_recipients_message_id ON message_recipients(message_id);
CREATE INDEX idx_message_recipients_is_read ON message_recipients(is_read);
CREATE INDEX idx_profile_change_requests_member_id ON profile_change_requests(member_id);
CREATE INDEX idx_profile_change_requests_status ON profile_change_requests(status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_messages_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_profile_requests_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_messages_updated_at 
  BEFORE UPDATE ON messages 
  FOR EACH ROW EXECUTE FUNCTION update_messages_updated_at_column();

CREATE TRIGGER update_profile_change_requests_updated_at 
  BEFORE UPDATE ON profile_change_requests 
  FOR EACH ROW EXECUTE FUNCTION update_profile_requests_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_change_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for messages
CREATE POLICY "Users can view messages they sent" ON messages
  FOR SELECT USING (auth.uid() = sender_id);

CREATE POLICY "Users can view messages sent to them" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM message_recipients 
      WHERE message_id = messages.id AND recipient_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can create messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Create RLS policies for message_recipients
CREATE POLICY "Users can view their message recipients" ON message_recipients
  FOR SELECT USING (recipient_id = auth.uid());

CREATE POLICY "Users can update their message recipients" ON message_recipients
  FOR UPDATE USING (recipient_id = auth.uid());

CREATE POLICY "Message senders can create recipients" ON message_recipients
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages 
      WHERE id = message_id AND sender_id = auth.uid()
    )
  );

-- Create RLS policies for profile_change_requests
CREATE POLICY "Members can view their own requests" ON profile_change_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE id = member_id AND email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can view all profile change requests" ON profile_change_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Members can create profile change requests" ON profile_change_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM members 
      WHERE id = member_id AND email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can update profile change requests" ON profile_change_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon;
