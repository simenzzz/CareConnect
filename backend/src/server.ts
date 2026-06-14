// IMPORTANT: env must be the first local import. Its module body runs
// `dotenv.config()` at load time, so `process.env` is populated before any other
// local module (database, firebase, routes) is required.
import { loadEnv } from './config/env';
import { logger } from './utils/logger';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { initializeFirebase } from './config/firebase';
import { connectDatabase } from './config/database';
import { generalLimiter, strictLimiter, reviewsLimiter } from './middleware/rateLimit';
import { errorDetails } from './utils/errors';
import authRoutes from './routes/auth';
import sittersRoutes from './routes/sitters';
import bookingsRoutes from './routes/bookings';
import paymentsRoutes from './routes/payments';
import reviewsRoutes from './routes/reviews';

// Validate configuration and fail fast before binding the server.
const env = loadEnv();

const app = express();
const PORT = env.PORT;

// Initialize Firebase and Database BEFORE importing routes
logger.info('🔧 Initializing Firebase...');
initializeFirebase();
logger.info('🔧 Initializing Database...');
connectDatabase();
logger.info('✅ Firebase and Database initialized');

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
app.use('/api/reviews', reviewsLimiter);

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
app.use('/api/reviews', reviewsRoutes);

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
  logger.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: 'Something went wrong',
    ...errorDetails(err)
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🚀 CareConnect Backend API running on port ${PORT}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/health`);
  logger.info(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process - keep server running
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception:', error);
  // Don't exit the process - keep server running
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
  });
});

export default app;
