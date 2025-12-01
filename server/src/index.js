const express = require('express');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

// Import database connection
const connectDB = require('./config/db');

// Initialize Express app
const app = express();

// ========== MIDDLEWARE ==========
// Security headers with relaxed Content Security Policy for images
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "http://localhost:5000", "http://localhost:3000"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"]
    }
  }
}));

// Enable CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Serve static files for uploads (with proper headers)
app.use('/uploads', express.static('uploads', {
  setHeaders: (res, path) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Access-Control-Allow-Origin', process.env.CLIENT_URL || 'http://localhost:3000');
  }
}));

// Logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ========== CREATE UPLOADS DIRECTORY ==========
const uploadsDir = path.join(__dirname, 'uploads', 'profiles');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Uploads directory created:', uploadsDir);
} else {
  console.log('✅ Uploads directory exists:', uploadsDir);
}

// ========== DATABASE CONNECTION ==========
connectDB().catch(err => { 
  console.error('Database connection failed:', err); 
  process.exit(1); 
});

// ========== ROUTES ==========
console.log('Loading routes...');

const authRoutes = require('./routes/authroutes');
const menuRoutes = require('./routes/menuRoutes');
const reportRoutes = require('./routes/reportRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const adminRoutes = require('./routes/adminRoutes');
const messStaffRoutes = require('./routes/messStaffRoutes');
const orderRoutes = require('./routes/orderRoutes');
const usersRoutes = require('./routes/users');
const settingsRoutes = require('./routes/settings');
const bookingRoutes = require('./routes/booking');
const teaRequestRoutes = require('./routes/teaRequestRoutes');
const billRoutes = require('./routes/billRoutes');
const menuHistoryRoutes = require('./routes/menuHistory');


console.log('Mounting routes...');

// Mount all routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/mess-staff', messStaffRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/tea-requests', teaRequestRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/menu-history', menuHistoryRoutes);

console.log('All routes mounted successfully');

// ========== DEFAULT ROUTE ==========
app.get('/', (req, res) => {
  res.json({ 
    message: 'KDU Mess Management API is running',
    version: '1.0.0',
    status: 'active',
    endpoints: {
      auth: '/api/auth',
      menu: '/api/menu',
      bookings: '/api/bookings',
      orders: '/api/orders',
      reports: '/api/reports',
      feedback: '/api/feedback',
      admin: '/api/admin',
      messStaff: '/api/mess-staff',
      users: '/api/users',
      settings: '/api/settings',
      teaRequests: '/api/tea-requests',
      bills: '/api/bills',
      menuHistory: '/api/menu-history'
    }
  });
});

// ========== ERROR HANDLING ==========
// Handle 404 - Route not found
app.use((req, res, next) => {
  res.status(404).json({ 
    msg: `Route ${req.originalUrl} not found` 
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({ 
    msg: err.message || 'Something went wrong!',
    ...(process.env.NODE_ENV === 'development' && { error: err.stack })
  });
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`
  ========================================
  KDU Mess Management Server Started
  ========================================
  Port: ${PORT}
  API URL: http://localhost:${PORT}
  Frontend: ${process.env.CLIENT_URL || 'http://localhost:3000'}
  Environment: ${process.env.NODE_ENV || 'development'}
  ========================================
  `);
});

// ========== GRACEFUL SHUTDOWN ==========
const gracefulShutdown = () => {
  console.log('\nShutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Forcing shutdown');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = app;