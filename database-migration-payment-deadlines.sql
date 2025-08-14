-- Database Migration for Payment Deadlines and Fine System
-- Run this in your Supabase SQL Editor

-- Add payment deadline fields to groups table
ALTER TABLE groups 
ADD COLUMN IF NOT EXISTS payment_deadline_day INTEGER NOT NULL DEFAULT 29 CHECK (payment_deadline_day >= 1 AND payment_deadline_day <= 31),
ADD COLUMN IF NOT EXISTS late_fine_percentage DECIMAL(5,2) NOT NULL DEFAULT 5.00 CHECK (late_fine_percentage >= 0 AND late_fine_percentage <= 100),
ADD COLUMN IF NOT EXISTS late_fine_fixed_amount DECIMAL(12,2) DEFAULT 100 CHECK (late_fine_fixed_amount >= 0);

-- Add payment deadline and fine information to group_members table
ALTER TABLE group_members 
ADD COLUMN IF NOT EXISTS payment_deadline DATE,
ADD COLUMN IF NOT EXISTS fine_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_late_payment BOOLEAN DEFAULT FALSE;

-- Create a function to calculate payment deadlines for each month
CREATE OR REPLACE FUNCTION calculate_payment_deadlines()
RETURNS TRIGGER AS $$
DECLARE
    group_start_date DATE;
    group_end_date DATE;
    current_month DATE;
    deadline_day INTEGER;
    month_start DATE;
    month_end DATE;
BEGIN
    -- Get group payment deadline day
    SELECT payment_deadline_day INTO deadline_day
    FROM groups 
    WHERE id = NEW.group_id;
    
    -- Get group start and end dates
    SELECT 
        TO_DATE(start_date || '-01', 'YYYY-MM-DD'),
        TO_DATE(end_date || '-01', 'YYYY-MM-DD')
    INTO group_start_date, group_end_date
    FROM groups 
    WHERE id = NEW.group_id;
    
    -- Calculate payment deadline for the assigned month
    current_month := TO_DATE(NEW.assigned_month_date || '-01', 'YYYY-MM-DD');
    
    -- Get the start and end of the month
    month_start := DATE_TRUNC('month', current_month)::DATE;
    month_end := (month_start + INTERVAL '1 month - 1 day')::DATE;
    
    -- Set payment deadline to the specified day of the month
    -- If the day doesn't exist in the month, use the last day of the month
    NEW.payment_deadline := LEAST(
        month_start + (deadline_day - 1) * INTERVAL '1 day',
        month_end
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate payment deadlines
CREATE TRIGGER calculate_payment_deadline_trigger
    BEFORE INSERT OR UPDATE ON group_members
    FOR EACH ROW
    EXECUTE FUNCTION calculate_payment_deadlines();

-- Create a function to calculate fines for late payments
CREATE OR REPLACE FUNCTION calculate_late_fine(
    p_group_id BIGINT,
    p_payment_date DATE,
    p_payment_amount DECIMAL(12,2)
)
RETURNS DECIMAL(12,2) AS $$
DECLARE
    group_deadline_day INTEGER;
    group_fine_percentage DECIMAL(5,2);
    group_fixed_fine DECIMAL(12,2);
    payment_month VARCHAR(7);
    payment_deadline DATE;
    fine_amount DECIMAL(12,2) := 0;
    month_start DATE;
    month_end DATE;
BEGIN
    -- Get group fine settings
    SELECT 
        payment_deadline_day,
        late_fine_percentage,
        late_fine_fixed_amount
    INTO group_deadline_day, group_fine_percentage, group_fixed_fine
    FROM groups 
    WHERE id = p_group_id;
    
    -- Calculate the payment deadline for the month of the payment
    month_start := DATE_TRUNC('month', p_payment_date)::DATE;
    month_end := (month_start + INTERVAL '1 month - 1 day')::DATE;
    payment_deadline := LEAST(
        month_start + (group_deadline_day - 1) * INTERVAL '1 day',
        month_end
    );
    
    -- Check if payment is late
    IF p_payment_date > payment_deadline THEN
        -- Calculate fine amount
        IF group_fixed_fine > 0 THEN
            fine_amount := group_fixed_fine;
        ELSE
            fine_amount := (p_payment_amount * group_fine_percentage) / 100;
        END IF;
    END IF;
    
    RETURN fine_amount;
END;
$$ LANGUAGE plpgsql;

-- Add fine calculation to payments table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS fine_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_late_payment BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_deadline DATE;

-- Create a function to automatically calculate fines when payments are created/updated
CREATE OR REPLACE FUNCTION calculate_payment_fine()
RETURNS TRIGGER AS $$
DECLARE
    calculated_fine DECIMAL(12,2);
    payment_deadline DATE;
    group_deadline_day INTEGER;
    month_start DATE;
    month_end DATE;
BEGIN
    -- Get group payment deadline day
    SELECT payment_deadline_day INTO group_deadline_day
    FROM groups 
    WHERE id = NEW.group_id;
    
    -- Calculate payment deadline for the month
    month_start := DATE_TRUNC('month', NEW.payment_date)::DATE;
    month_end := (month_start + INTERVAL '1 month - 1 day')::DATE;
    payment_deadline := LEAST(
        month_start + (group_deadline_day - 1) * INTERVAL '1 day',
        month_end
    );
    
    -- Set payment deadline
    NEW.payment_deadline := payment_deadline;
    
    -- Check if payment is late and calculate fine
    IF NEW.payment_date > payment_deadline THEN
        NEW.is_late_payment := TRUE;
        NEW.fine_amount := calculate_late_fine(NEW.group_id, NEW.payment_date, NEW.amount);
    ELSE
        NEW.is_late_payment := FALSE;
        NEW.fine_amount := 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate fines
CREATE TRIGGER calculate_payment_fine_trigger
    BEFORE INSERT OR UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION calculate_payment_fine();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_group_members_payment_deadline ON group_members(payment_deadline);
CREATE INDEX IF NOT EXISTS idx_group_members_is_late ON group_members(is_late_payment);
CREATE INDEX IF NOT EXISTS idx_payments_fine_amount ON payments(fine_amount);
CREATE INDEX IF NOT EXISTS idx_payments_is_late ON payments(is_late_payment);
CREATE INDEX IF NOT EXISTS idx_payments_deadline ON payments(payment_deadline);

-- Update existing group_members to calculate payment deadlines
UPDATE group_members 
SET payment_deadline = (
    SELECT LEAST(
        DATE_TRUNC('month', TO_DATE(assigned_month_date || '-01', 'YYYY-MM-DD'))::DATE + 
        (COALESCE(g.payment_deadline_day, 29) - 1) * INTERVAL '1 day',
        (DATE_TRUNC('month', TO_DATE(assigned_month_date || '-01', 'YYYY-MM-DD')) + INTERVAL '1 month - 1 day')::DATE
    )
    FROM groups g 
    WHERE g.id = group_members.group_id
);

-- Update existing payments to calculate fines
UPDATE payments 
SET 
    payment_deadline = (
        SELECT LEAST(
            DATE_TRUNC('month', payment_date)::DATE + 
            (COALESCE(g.payment_deadline_day, 29) - 1) * INTERVAL '1 day',
            (DATE_TRUNC('month', payment_date) + INTERVAL '1 month - 1 day')::DATE
        )
        FROM groups g 
        WHERE g.id = payments.group_id
    ),
    is_late_payment = (
        SELECT payment_date > (
            LEAST(
                DATE_TRUNC('month', payment_date)::DATE + 
                (COALESCE(g.payment_deadline_day, 29) - 1) * INTERVAL '1 day',
                (DATE_TRUNC('month', payment_date) + INTERVAL '1 month - 1 day')::DATE
            )
        )
        FROM groups g 
        WHERE g.id = payments.group_id
    ),
    fine_amount = (
        SELECT calculate_late_fine(group_id, payment_date, amount)
    );

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION calculate_payment_deadlines() TO anon;
GRANT EXECUTE ON FUNCTION calculate_late_fine(BIGINT, DATE, DECIMAL) TO anon;
GRANT EXECUTE ON FUNCTION calculate_payment_fine() TO anon;
