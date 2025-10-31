import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// Import routes
import authRoutes from './routes/auth.js';
import contactRoutes from './routes/contacts.js';
import sessionRoutes from './routes/session.js';
import alertRoutes from './routes/alerts.js';

// Import utils
import { checkExpiredSessions } from './utils/sessionMonitor.js';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// ================================================================
// MIDDLEWARE CONFIGURATION
// ================================================================

// Security middleware - helmet helps secure Express apps
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS configuration - allow requests from frontend
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Rate limiting - prevent brute force attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Strict rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts, please try again later.'
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware - only in development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ================================================================
// ROUTES
// ================================================================

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    message: 'SafeHer API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/alerts', alertRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to SafeHer API',
    version: '1.0.0',
    documentation: '/api/docs',
    status: '/api/status'
  });
});

// ================================================================
// ERROR HANDLING
// ================================================================

// 404 handler - route not found
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error occurred:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      error: err 
    })
  });
});

// ================================================================
// DATABASE CONNECTION & SERVER STARTUP
// ================================================================

const startServer = async () => {
  try {
    // Connect to MongoDB
    console.log('🔄 Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connected to MongoDB successfully');
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);

    // Check for expired sessions on startup
    console.log('🔍 Checking for expired sessions...');
    await checkExpiredSessions();

    // Set up periodic check for expired sessions (every 30 seconds)
    setInterval(async () => {
      try {
        await checkExpiredSessions();
      } catch (error) {
        console.error('Error in periodic session check:', error);
      }
    }, 30000);

    // Start the Express server
    app.listen(PORT, () => {
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🚀 SafeHer Backend Server Started Successfully!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📍 Server running on: http://localhost:${PORT}`);
      console.log(`🔗 API endpoint: http://localhost:${PORT}/api`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🕐 Started at: ${new Date().toLocaleString()}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
    });

  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ Failed to start server');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('Error details:', error.message);
    console.error('');
    
    if (error.message.includes('MONGODB_URI')) {
      console.error('💡 Solution: Check your MONGODB_URI in .env file');
    } else if (error.message.includes('EADDRINUSE')) {
      console.error(`💡 Solution: Port ${PORT} is already in use. Try a different port.`);
    }
    
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    process.exit(1);
  }
};

// ================================================================
// GRACEFUL SHUTDOWN
// ================================================================

// Handle SIGTERM signal (from Docker, Kubernetes, etc.)
process.on('SIGTERM', () => {
  console.log('');
  console.log('⚠️  SIGTERM signal received');
  console.log('🔄 Closing HTTP server...');
  
  mongoose.connection.close(() => {
    console.log('✅ MongoDB connection closed');
    console.log('👋 Server shut down gracefully');
    process.exit(0);
  });
});

// Handle SIGINT signal (Ctrl+C)
process.on('SIGINT', () => {
  console.log('');
  console.log('⚠️  SIGINT signal received (Ctrl+C)');
  console.log('🔄 Closing HTTP server...');
  
  mongoose.connection.close(() => {
    console.log('✅ MongoDB connection closed');
    console.log('👋 Server shut down gracefully');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('❌ UNCAUGHT EXCEPTION - Server will restart');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('❌ UNHANDLED REJECTION');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

// ================================================================
// START THE SERVER
// ================================================================

startServer();

// Export for testing
export default app;