# Payments API Documentation - Whish Integration

## Overview
The Payments API is integrated with **Whish Money** for processing all payments (both credit/debit cards and mobile money). Whish handles the secure payment processing, so card details never touch your server.

## Configuration

### Environment Variables
Add these to your `backend/.env` file:

```env
# Whish Money Configuration
WHISH_API_URL=https://lb.sandbox.whish.money/itel-service/api
WHISH_CHANNEL=your_channel_here
WHISH_SECRET=your_secret_here
WHISH_WEBSITE_URL=http://localhost:5173

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Currency
PAYMENT_CURRENCY=USD
```

**⚠️ Test Mode:** If `WHISH_CHANNEL` is set to `placeholder_channel`, the API runs in test mode and returns simulated responses.

---

## Endpoints

### 1. Initiate Payment (Whish)
**POST** `/api/payments/whish/initiate`

Initiates a payment through Whish. Returns a payment URL where the customer will complete the payment.

**Headers:**
```json
{
  "Authorization": "Bearer <firebase_token>",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "bookingId": 123
}
```

**Response (Success - Real Mode):**
```json
{
  "success": true,
  "message": "Payment initiated successfully",
  "data": {
    "paymentUrl": "https://whish.money/pay/8nQS2mL",
    "paymentId": 1,
    "amount": 50.00,
    "currency": "USD"
  }
}
```

**Response (Success - Test Mode):**
```json
{
  "success": true,
  "message": "TEST MODE: Payment initiated (using placeholder credentials)",
  "data": {
    "paymentUrl": "https://whish.money/pay/TEST_PLACEHOLDER",
    "paymentId": "test_payment_id",
    "amount": 50.00,
    "currency": "USD",
    "testMode": true,
    "note": "Update WHISH_CHANNEL and WHISH_SECRET in .env to use real Whish API"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "This booking has already been paid"
}
```

**How to use:**
1. Customer clicks "Pay Now" on your frontend
2. Frontend calls this API
3. Redirect customer to the returned `paymentUrl`
4. Customer completes payment on Whish's secure page
5. Whish calls your callback endpoint
6. Whish redirects customer back to your site

---

### 2. Whish Callback (Internal)
**GET** `/api/payments/whish/callback`

This endpoint is called by Whish after payment is processed. **You don't call this directly** - Whish calls it automatically.

**Query Parameters:**
- `status`: "success" or "failed"
- `externalId`: The booking ID

**What it does:**
1. Receives callback from Whish
2. Verifies payment status with Whish API
3. Updates payment record in database
4. Updates booking status to CONFIRMED

---

### 3. Get Payment Details
**GET** `/api/payments/:bookingId`

Get payment details for a specific booking. Accessible by both customer and sitter.

**Headers:**
```json
{
  "Authorization": "Bearer <firebase_token>"
}
```

**Response (Success):**
```json
{
  "success": true,
  "payment": {
    "id": 1,
    "booking_id": 123,
    "amount": 50.00,
    "payment_method": "WISHMONEY",
    "payment_status": "COMPLETED",
    "transaction_id": "WHISH_123_1697123456789",
    "created_at": "2025-10-12T20:00:00.000Z",
    "updated_at": "2025-10-12T20:05:00.000Z"
  }
}
```

**Response (No Payment):**
```json
{
  "success": true,
  "payment": null,
  "message": "No payment found for this booking"
}
```

---

## Payment Flow

```
┌─────────────┐
│  Customer   │
└──────┬──────┘
       │ 1. Clicks "Pay Now"
       ▼
┌─────────────────────┐
│   Your Frontend     │
│ (React)             │
└──────┬──────────────┘
       │ 2. POST /api/payments/whish/initiate
       ▼
┌─────────────────────┐
│   Your Backend      │
│ (Express)           │
└──────┬──────────────┘
       │ 3. Calls Whish Collect API
       ▼
┌─────────────────────┐
│   Whish API         │
│ Returns payment URL │
└──────┬──────────────┘
       │ 4. Returns paymentUrl
       ▼
┌─────────────────────┐
│   Your Frontend     │
│ Redirects to Whish  │
└──────┬──────────────┘
       │ 5. Customer enters card/payment info
       ▼
┌─────────────────────┐
│   Whish Payment     │
│   Page (Secure)     │
└──────┬──────────────┘
       │ 6. Processes payment
       ▼
┌─────────────────────┐
│   Whish API         │
│ Calls your callback │
└──────┬──────────────┘
       │ 7. GET /api/payments/whish/callback
       ▼
┌─────────────────────┐
│   Your Backend      │
│ Updates DB          │
└──────┬──────────────┘
       │ 8. Redirects customer
       ▼
┌─────────────────────┐
│   Your Frontend     │
│ Shows success msg   │
└─────────────────────┘
```

---

## Database Setup

Run this SQL script to create the payments table:

```sql
-- File: backend/create-payments-table.sql
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('CARD', 'WISHMONEY', 'CASH')),
  payment_status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED')),
  transaction_id VARCHAR(255) UNIQUE,
  card_last_four VARCHAR(4),
  cardholder_name VARCHAR(255),
  phone_number VARCHAR(20),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT payments_booking_id_key UNIQUE (booking_id)
);

CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_status ON payments(payment_status);
CREATE INDEX idx_payments_method ON payments(payment_method);
CREATE INDEX idx_payments_transaction_id ON payments(transaction_id);
```

---

## Frontend Integration Example

### Step 1: Add "Pay Now" Button

```tsx
// In MyBookings.tsx or wherever you display bookings
const handlePayment = async (bookingId: number) => {
  try {
    const token = await getAuthToken() // Your auth token function
    
    const response = await fetch('http://localhost:5000/api/payments/whish/initiate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ bookingId })
    })
    
    const data = await response.json()
    
    if (data.success) {
      // Redirect to Whish payment page
      window.location.href = data.data.paymentUrl
    } else {
      alert(data.message)
    }
  } catch (error) {
    console.error('Payment error:', error)
    alert('Failed to initiate payment')
  }
}

// In your JSX
<button onClick={() => handlePayment(booking.id)}>
  Pay Now - ${booking.priceUsd}
</button>
```

### Step 2: Handle Return from Whish

```tsx
// In your Customer Portal page (UserPortalPage.tsx)
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search)
  const paymentStatus = urlParams.get('payment')
  const bookingId = urlParams.get('bookingId')
  
  if (paymentStatus === 'success') {
    alert(`Payment successful for booking #${bookingId}!`)
    // Refresh bookings list
  } else if (paymentStatus === 'failed') {
    alert(`Payment failed for booking #${bookingId}. Please try again.`)
  }
}, [])
```

---

## Security

✅ **What's Secure:**
- Card details never touch your server (handled by Whish)
- All communication over HTTPS
- Firebase authentication required
- Users can only pay for their own bookings

⚠️ **TODO for Production:**
- Use HTTPS for your website
- Add rate limiting on payment endpoints
- Store Whish credentials securely (never commit to git)
- Test thoroughly with Whish sandbox before going live

---

## Testing

### With Placeholder Credentials (Current State):
1. API returns test URLs
2. No actual charges
3. Good for frontend development
4. Simulates successful payments

### With Real Whish Credentials:
1. Get credentials from Whish
2. Update `.env` file
3. Restart backend: `npm start`
4. Use Whish sandbox for testing
5. Real payment flow works!

---

## Error Codes

| Status | Message | Solution |
|--------|---------|----------|
| 400 | Missing required field: bookingId | Include bookingId in request |
| 400 | This booking has already been paid | Booking is already paid |
| 401 | Unauthorized | Check authentication token |
| 403 | Unauthorized access to booking | User doesn't own this booking |
| 404 | Booking not found | Check booking ID exists |
| 500 | Failed to initiate payment | Check server logs |

---

## Whish API Integration Details

**Base URL (Sandbox):** `https://lb.sandbox.whish.money/itel-service/api`
**Base URL (Production):** `https://whish.money/itel-service/api/`

**Required Headers:**
- `channel`: Your channel ID from Whish
- `secret`: Your secret key from Whish
- `websiteurl`: Your website URL

**Supported Currencies:**
- USD ✅ (Currently used)
- LBP (Lebanese Pound)

---

## Support

- **Whish Documentation:** Check the Whish Web Service Technical Specifications
- **Get Credentials:** Contact Whish support to get your channel and secret
- **Questions:** Ask in your development team

---

## Next Steps

1. ✅ **Create payments table** - Run `backend/create-payments-table.sql`
2. ✅ **Backend API completed** - Whish integration done
3. ⏳ **Get real Whish credentials** - Contact Whish
4. ⏳ **Update .env file** - Add real channel and secret
5. ⏳ **Add payment button to frontend** - In My Bookings section
6. ⏳ **Test with Whish sandbox** - Use test credentials
7. ⏳ **Go live** - Switch to production Whish URL
