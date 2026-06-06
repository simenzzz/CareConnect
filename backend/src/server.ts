// IMPORTANT: env must be the first local import. Its module body runs
// `dotenv.config()` at load time, so `process.env` is populated before any other
// local module (database, firebase, routes) is required.
import { loadEnv } from './config/env';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { initializeFirebase } from './config/firebase';
import { connectDatabase } from './config/database';
import { generalLimiter, strictLimiter } from './middleware/rateLimit';
import { errorDetails } from './utils/errors';
import authRoutes from './routes/auth';
import sittersRoutes from './routes/sitters';
import bookingsRoutes from './routes/bookings';
import paymentsRoutes from './routes/payments';

// Validate configuration and fail fast before binding the server.
const env = loadEnv();

const app = express();
const PORT = env.PORT;

// Initialize Firebase and Database BEFORE importing routes
console.log('🔧 Initializing Firebase...');
initializeFirebase();
console.log('🔧 Initializing Database...');
connectDatabase();
console.log('✅ Firebase and Database initialized');

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true
}));
app.use(morgan('combined')); // Logging
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting: a strict limiter on sensitive surfaces, a general one elsewhere.
app.use('/api', generalLimiter);
app.use('/api/auth', strictLimiter);
app.use('/api/payments', strictLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'CareConnect Backend API'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sitters', sittersRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/payments', paymentsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

// Error handler — detail is gated through the single errorDetails() helper so the
// dev/prod boundary lives in exactly one place.
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: 'Something went wrong',
    ...errorDetails(err)
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 CareConnect Backend API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process - keep server running
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Don't exit the process - keep server running
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

export default app;