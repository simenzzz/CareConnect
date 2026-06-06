-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('CARD', 'WISHMONEY', 'CASH')),
  payment_status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED')),
  transaction_id VARCHAR(255) UNIQUE,
  
  -- Card payment details
  card_last_four VARCHAR(4),
  cardholder_name VARCHAR(255),
  
  -- Whish Money / Mobile payment details
  phone_number VARCHAR(20),
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Indexes for faster queries
  CONSTRAINT payments_booking_id_key UNIQUE (booking_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);

-- Add comment
COMMENT ON TABLE payments IS 'Stores payment information for bookings';
COMMENT ON COLUMN payments.payment_method IS 'CARD (credit/debit), WISHMONEY, or CASH';
COMMENT ON COLUMN payments.payment_status IS 'PENDING, PROCESSING, COMPLETED, FAILED, or REFUNDED';
COMMENT ON COLUMN payments.transaction_id IS 'Unique transaction ID from payment gateway';
COMMENT ON COLUMN payments.card_last_four IS 'Last 4 digits of card number (for display only)';
COMMENT ON COLUMN payments.phone_number IS 'Phone number used for Whish Money or mobile payments';

