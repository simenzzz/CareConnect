import express, { Response } from 'express'
import { query } from '../config/database'
import { verifyToken, AuthenticatedRequest } from '../middleware/auth'
import { getEnv } from '../config/env'
import { errorDetails } from '../utils/errors'
import { validateBody } from '../middleware/validate'
import { paymentInitiateSchema } from '../validation/payment.schemas'
import { BOOKING_STATUS, PAYMENT_STATUS } from '../constants/bookingStatus'

const router = express.Router()

// Whish API configuration is read at request time from the validated env (no
// insecure placeholder fallbacks — the process refuses to boot without real creds).
const whishConfig = () => {
  const env = getEnv()
  return {
    apiUrl: env.WHISH_API_URL,
    channel: env.WHISH_CHANNEL,
    secret: env.WHISH_SECRET,
    websiteUrl: env.WHISH_WEBSITE_URL,
    frontendUrl: env.FRONTEND_URL,
    backendUrl: env.BACKEND_URL,
    currency: env.PAYMENT_CURRENCY,
  }
}

// Initialize payment with Whish (for both card and mobile money)
router.post('/whish/initiate', verifyToken, validateBody(paymentInitiateSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { apiUrl, channel, secret, websiteUrl, frontendUrl, backendUrl, currency } = whishConfig()
    const firebaseUid = req.user?.uid
    
    if (!firebaseUid) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      })
    }

    const { bookingId } = req.body

    // Validate required fields
    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: bookingId'
      })
    }

    // Get user info
    const userResult = await query(
      'SELECT id FROM users WHERE firebase_uid = $1',
      [firebaseUid]
    )
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    const userId = userResult.rows[0].id

    // Verify booking exists and belongs to user
    const bookingResult = await query(
      `SELECT b.*, c.user_id as customer_user_id 
       FROM bookings b
       JOIN customers c ON b.customer_id = c.id
       WHERE b.id = $1`,
      [bookingId]
    )

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      })
    }

    const booking = bookingResult.rows[0]

    // Verify user owns this booking
    if (booking.customer_user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to booking'
      })
    }

    // Verify booking is pending payment
    if (booking.status !== 'PENDING' && booking.status !== BOOKING_STATUS.CONFIRMED) {
      return res.status(400).json({
        success: false,
        message: `Cannot process payment for booking with status: ${booking.status}`
      })
    }

    // Calculate final amount (apply discount). Coerce defensively in case a legacy
    // row has a NULL discount.
    const finalAmount = Number(booking.price_usd) * (1 - (Number(booking.discount) || 0) / 100)

    // Check if payment already exists
    const existingPayment = await query(
      'SELECT * FROM payments WHERE booking_id = $1 AND payment_status = $2',
      [bookingId, PAYMENT_STATUS.COMPLETED]
    )

    if (existingPayment.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'This booking has already been paid'
      })
    }

    // Call Whish Collect API. Any failure here propagates to the 500 handler —
    // there is deliberately NO test-mode fallback that fabricates a payment URL.
    const whishResponse = await fetch(`${apiUrl}/payment/collect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'channel': channel,
        'secret': secret,
        'websiteurl': websiteUrl
      },
      body: JSON.stringify({
        amount: finalAmount,
        currency,
        invoice: `Booking #${bookingId}`,
        externalId: bookingId,
        successCallbackUrl: `${backendUrl}/api/payments/whish/callback?status=success`,
        failureCallbackUrl: `${backendUrl}/api/payments/whish/callback?status=failed`,
        successRedirectUrl: `${frontendUrl}/customer-portal?payment=success&bookingId=${bookingId}`,
        failureRedirectUrl: `${frontendUrl}/customer-portal?payment=failed&bookingId=${bookingId}`
      })
    })

    const whishData: any = await whishResponse.json()

    if (!whishData.status || !whishData.data?.collectUrl) {
      throw new Error('Failed to get payment URL from Whish')
    }

    // Create pending payment record
    const paymentResult = await query(
      `INSERT INTO payments (
        booking_id,
        amount,
        payment_method,
        payment_status,
        transaction_id,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *`,
      [
        bookingId,
        finalAmount,
        'WISHMONEY',
        PAYMENT_STATUS.PENDING,
        `WHISH_${bookingId}_${Date.now()}`
      ]
    )

    return res.json({
      success: true,
      message: 'Payment initiated successfully',
      data: {
        paymentUrl: whishData.data.collectUrl,
        paymentId: paymentResult.rows[0].id,
        amount: finalAmount,
        currency
      }
    })
  } catch (error) {
    console.error('Payment initiation error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to initiate payment',
      ...errorDetails(error)
    })
  }
})

// Whish callback endpoint (called by Whish after payment)
router.get('/whish/callback', async (req: express.Request, res: Response) => {
  try {
    const { status, externalId } = req.query

    console.log('Whish Callback Received:', { status, externalId })

    if (!externalId) {
      return res.status(400).json({
        success: false,
        message: 'Missing externalId in callback'
      })
    }

    const bookingId = parseInt(externalId as string)

    if (Number.isNaN(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid externalId in callback'
      })
    }

    const { apiUrl, channel, secret, websiteUrl, currency } = whishConfig()

    // Get booking to verify payment status with Whish
    const bookingResult = await query(
      'SELECT * FROM bookings WHERE id = $1',
      [bookingId]
    )

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      })
    }

    const booking = bookingResult.rows[0]

    // The `status` query param is NOT proof of payment — it is attacker-controllable.
    // The ONLY source of truth is re-verifying server-side with Whish. If that call
    // fails, the error propagates to the 500 handler and the booking is left untouched.
    const statusResponse = await fetch(`${apiUrl}/payment/collect/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'channel': channel,
        'secret': secret,
        'websiteurl': websiteUrl
      },
      body: JSON.stringify({
        currency,
        externalId: bookingId
      })
    })

    const statusData: any = await statusResponse.json()

    const isPaid = statusData.status && statusData.data?.collectStatus === 'success'

    // Re-verify the charged amount against the server-computed booking amount.
    // Never trust an amount from the client; if Whish reports an amount, it must match.
    const expectedAmount = Number(booking.price_usd) * (1 - Number(booking.discount) / 100)
    const reportedAmount = statusData.data?.amount
    const amountMismatch =
      reportedAmount !== undefined &&
      reportedAmount !== null &&
      Math.abs(Number(reportedAmount) - expectedAmount) > 0.01

    if (isPaid && !amountMismatch) {
      // Only confirm a booking that actually has a PENDING payment awaiting this
      // callback. Completing the payment is the gate: if no PENDING row is updated
      // (never initiated via /whish/initiate, or already processed), we confirm
      // nothing. This makes the callback idempotent and rejects out-of-band ids.
      const paymentUpdate = await query(
        `UPDATE payments
         SET payment_status = $1, updated_at = NOW()
         WHERE booking_id = $2 AND payment_status = $3`,
        [PAYMENT_STATUS.COMPLETED, bookingId, PAYMENT_STATUS.PENDING]
      )

      if (paymentUpdate.rowCount && paymentUpdate.rowCount > 0) {
        await query(
          `UPDATE bookings
           SET status = $1, payment_method = $2, updated_at = NOW()
           WHERE id = $3 AND status <> $1`,
          [BOOKING_STATUS.CONFIRMED, 'WISHMONEY', bookingId]
        )

        return res.json({
          success: true,
          message: 'Payment confirmed successfully'
        })
      }

      // No PENDING payment to complete: a duplicate callback for an already-confirmed
      // booking is an idempotent success; anything else is rejected (nothing initiated).
      if (booking.status === BOOKING_STATUS.CONFIRMED) {
        return res.json({
          success: true,
          message: 'Payment already confirmed'
        })
      }

      return res.status(409).json({
        success: false,
        message: 'No pending payment found for this booking'
      })
    }

    if (amountMismatch) {
      console.error('Whish payment amount mismatch', {
        bookingId,
        expectedAmount,
        reportedAmount
      })
    }

    // Not paid (or amount mismatch): mark the pending payment failed, confirm nothing.
    await query(
      `UPDATE payments
       SET payment_status = $1, updated_at = NOW()
       WHERE booking_id = $2 AND payment_status = $3`,
      [PAYMENT_STATUS.FAILED, bookingId, PAYMENT_STATUS.PENDING]
    )

    return res.json({
      success: false,
      message: 'Payment verification failed'
    })
  } catch (error) {
    console.error('Callback processing error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to process payment callback',
      ...errorDetails(error)
    })
  }
})

// Get payment details for a booking
router.get('/:bookingId', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const firebaseUid = req.user?.uid
    
    if (!firebaseUid) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      })
    }

    const { bookingId } = req.params

    // Get user info
    const userResult = await query(
      'SELECT id FROM users WHERE firebase_uid = $1',
      [firebaseUid]
    )
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    const userId = userResult.rows[0].id

    // Verify booking exists and user has access to it
    const bookingResult = await query(
      `SELECT b.*, c.user_id as customer_user_id, s.user_id as sitter_user_id
       FROM bookings b
       JOIN customers c ON b.customer_id = c.id
       JOIN sitters s ON b.sitter_id = s.id
       WHERE b.id = $1`,
      [bookingId]
    )

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      })
    }

    const booking = bookingResult.rows[0]

    // Verify user is either customer or sitter
    if (booking.customer_user_id !== userId && booking.sitter_user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to booking'
      })
    }

    // Get payment details
    const paymentResult = await query(
      `SELECT 
        id,
        booking_id,
        amount,
        payment_method,
        payment_status,
        transaction_id,
        created_at,
        updated_at
       FROM payments
       WHERE booking_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [bookingId]
    )

    if (paymentResult.rows.length === 0) {
      return res.json({
        success: true,
        payment: null,
        message: 'No payment found for this booking'
      })
    }

    return res.json({
      success: true,
      payment: paymentResult.rows[0]
    })
  } catch (error) {
    console.error('Get payment error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment details',
      ...errorDetails(error)
    })
  }
})

export default router
