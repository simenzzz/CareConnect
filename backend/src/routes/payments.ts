import express, { Response } from 'express'
import { query } from '../config/database'
import { verifyToken, AuthenticatedRequest } from './auth'

const router = express.Router()

// Whish API Configuration
const WHISH_API_URL = process.env.WHISH_API_URL || 'https://lb.sandbox.whish.money/itel-service/api'
const WHISH_CHANNEL = process.env.WHISH_CHANNEL || 'placeholder_channel'
const WHISH_SECRET = process.env.WHISH_SECRET || 'placeholder_secret'
const WHISH_WEBSITE_URL = process.env.WHISH_WEBSITE_URL || 'http://localhost:5173'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
const PAYMENT_CURRENCY = process.env.PAYMENT_CURRENCY || 'USD'

// Initialize payment with Whish (for both card and mobile money)
router.post('/whish/initiate', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
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
    if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') {
      return res.status(400).json({
        success: false,
        message: `Cannot process payment for booking with status: ${booking.status}`
      })
    }

    // Calculate final amount (apply discount)
    const finalAmount = booking.price_usd * (1 - booking.discount / 100)

    // Check if payment already exists
    const existingPayment = await query(
      'SELECT * FROM payments WHERE booking_id = $1 AND payment_status = $2',
      [bookingId, 'COMPLETED']
    )

    if (existingPayment.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'This booking has already been paid'
      })
    }

    // Call Whish Collect API
    try {
      const whishResponse = await fetch(`${WHISH_API_URL}/payment/collect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'channel': WHISH_CHANNEL,
          'secret': WHISH_SECRET,
          'websiteurl': WHISH_WEBSITE_URL
        },
        body: JSON.stringify({
          amount: finalAmount,
          currency: PAYMENT_CURRENCY,
          invoice: `Booking #${bookingId}`,
          externalId: bookingId,
          successCallbackUrl: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/payments/whish/callback?status=success`,
          failureCallbackUrl: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/payments/whish/callback?status=failed`,
          successRedirectUrl: `${FRONTEND_URL}/customer-portal?payment=success&bookingId=${bookingId}`,
          failureRedirectUrl: `${FRONTEND_URL}/customer-portal?payment=failed&bookingId=${bookingId}`
        })
      })

      const whishData: any = await whishResponse.json()

      console.log('Whish API Response:', whishData)

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
          'PENDING',
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
          currency: PAYMENT_CURRENCY
        }
      })
    } catch (whishError) {
      console.error('Whish API Error:', whishError)
      
      // If Whish credentials are placeholders, return a test URL
      if (WHISH_CHANNEL === 'placeholder_channel') {
        return res.json({
          success: true,
          message: 'TEST MODE: Payment initiated (using placeholder credentials)',
          data: {
            paymentUrl: 'https://whish.money/pay/TEST_PLACEHOLDER',
            paymentId: 'test_payment_id',
            amount: finalAmount,
            currency: PAYMENT_CURRENCY,
            testMode: true,
            note: 'Update WHISH_CHANNEL and WHISH_SECRET in .env to use real Whish API'
          }
        })
      }

      throw whishError
    }
  } catch (error) {
    console.error('Payment initiation error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to initiate payment',
      error: error instanceof Error ? error.message : 'Unknown error'
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

    // Verify payment status with Whish
    try {
      const statusResponse = await fetch(`${WHISH_API_URL}/payment/collect/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'channel': WHISH_CHANNEL,
          'secret': WHISH_SECRET,
          'websiteurl': WHISH_WEBSITE_URL
        },
        body: JSON.stringify({
          currency: PAYMENT_CURRENCY,
          externalId: bookingId
        })
      })

      const statusData: any = await statusResponse.json()

      console.log('Whish Status Check:', statusData)

      if (statusData.status && statusData.data?.collectStatus === 'success') {
        // Update payment record
        await query(
          `UPDATE payments 
           SET payment_status = $1, updated_at = NOW()
           WHERE booking_id = $2 AND payment_status = $3`,
          ['COMPLETED', bookingId, 'PENDING']
        )

        // Update booking status
        await query(
          `UPDATE bookings 
           SET status = $1, payment_method = $2, updated_at = NOW()
           WHERE id = $3`,
          ['CONFIRMED', 'WISHMONEY', bookingId]
        )

        return res.json({
          success: true,
          message: 'Payment confirmed successfully'
        })
      } else {
        // Payment failed
        await query(
          `UPDATE payments 
           SET payment_status = $1, updated_at = NOW()
           WHERE booking_id = $2 AND payment_status = $3`,
          ['FAILED', bookingId, 'PENDING']
        )

        return res.json({
          success: false,
          message: 'Payment verification failed'
        })
      }
    } catch (whishError) {
      console.error('Whish status check error:', whishError)
      
      // If using placeholder credentials, simulate success for testing
      if (WHISH_CHANNEL === 'placeholder_channel' && status === 'success') {
        await query(
          `UPDATE payments 
           SET payment_status = $1, updated_at = NOW()
           WHERE booking_id = $2 AND payment_status = $3`,
          ['COMPLETED', bookingId, 'PENDING']
        )

        await query(
          `UPDATE bookings 
           SET status = $1, payment_method = $2, updated_at = NOW()
           WHERE id = $3`,
          ['CONFIRMED', 'WISHMONEY', bookingId]
        )

        return res.json({
          success: true,
          message: 'TEST MODE: Payment confirmed (simulated)',
          testMode: true
        })
      }

      throw whishError
    }
  } catch (error) {
    console.error('Callback processing error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to process payment callback',
      error: error instanceof Error ? error.message : 'Unknown error'
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
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export default router
