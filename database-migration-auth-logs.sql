-- Create auth_logs table for tracking authentication activities
CREATE TABLE IF NOT EXISTS auth_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    username VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    ip_address INET NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('login', 'logout', 'failed_login')),
    success BOOLEAN NOT NULL DEFAULT false,
    user_agent TEXT,
    session_id VARCHAR(255),
    error_details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_auth_logs_timestamp ON auth_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_auth_logs_username ON auth_logs(username);
CREATE INDEX IF NOT EXISTS idx_auth_logs_action ON auth_logs(action);
CREATE INDEX IF NOT EXISTS idx_auth_logs_success ON auth_logs(success);
CREATE INDEX IF NOT EXISTS idx_auth_logs_ip_address ON auth_logs(ip_address);

-- Add comments to the table and columns
COMMENT ON TABLE auth_logs IS 'Table to track all authentication activities including logins, logouts, and failed attempts';
COMMENT ON COLUMN auth_logs.id IS 'Unique identifier for each log entry';
COMMENT ON COLUMN auth_logs.timestamp IS 'When the authentication activity occurred';
COMMENT ON COLUMN auth_logs.username IS 'Username used in the authentication attempt';
COMMENT ON COLUMN auth_logs.first_name IS 'First name of the user if available';
COMMENT ON COLUMN auth_logs.last_name IS 'Last name of the user if available';
COMMENT ON COLUMN auth_logs.ip_address IS 'IP address of the client making the request';
COMMENT ON COLUMN auth_logs.action IS 'Type of authentication activity (login, logout, failed_login)';
COMMENT ON COLUMN auth_logs.success IS 'Whether the authentication attempt was successful';
COMMENT ON COLUMN auth_logs.user_agent IS 'User agent string from the client';
COMMENT ON COLUMN auth_logs.session_id IS 'Session identifier if available';
COMMENT ON COLUMN auth_logs.error_details IS 'Details of the failed login attempt if applicable';
COMMENT ON COLUMN auth_logs.created_at IS 'When this log entry was created';

-- Enable Row Level Security (RLS)
ALTER TABLE auth_logs ENABLE ROW LEVEL SECURITY;

-- Add error_details column if it doesn't exist (for existing databases)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'auth_logs' AND column_name = 'error_details'
    ) THEN
        ALTER TABLE auth_logs ADD COLUMN error_details TEXT;
        COMMENT ON COLUMN auth_logs.error_details IS 'Details of the failed login attempt if applicable';
    END IF;
END $$;

-- Create RLS policies
-- Only admins and super users can view all logs
CREATE POLICY "Admins can view all auth logs" ON auth_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.email = auth.jwt() ->> 'email' 
            AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'super_user')
        )
    );

-- Users can only view their own logs
CREATE POLICY "Users can view their own auth logs" ON auth_logs
    FOR SELECT USING (
        username = (
            SELECT auth.users.email 
            FROM auth.users 
            WHERE auth.users.email = auth.jwt() ->> 'email'
        )
    );

-- Insert sample data for testing (optional)
-- INSERT INTO auth_logs (username, first_name, last_name, ip_address, action, success) VALUES
-- ('admin@example.com', 'Admin', 'User', '127.0.0.1', 'login', true),
-- ('user@example.com', 'Regular', 'User', '192.168.1.100', 'login', true),
-- ('user@example.com', 'Regular', 'User', '192.168.1.100', 'logout', true),
-- ('unknown@example.com', NULL, NULL, '203.0.113.0', 'failed_login', false);
