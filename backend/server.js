// File: backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// Create Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB Atlas successfully');
    console.log('Using connection string:', process.env.MONGODB_URI);
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    // Print the connection string (but hide the password)
    const connectionString = process.env.MONGODB_URI || '';
    const sanitizedString = connectionString.replace(/\/\/([^:]+):([^@]+)@/, '//\\1:***@');
    console.log('Attempted connection with:', sanitizedString);
  });

// Import routes
const transactionRoutes = require('./routes/transactions');
const userRoutes = require('./routes/users');
const fraudRoutes = require('./routes/fraudCases');
const dashboardRoutes = require('./routes/dashboard');
const authRoutes = require('./routes/auth'); // Add auth routes

// Use routes
app.use('/api/transactions', transactionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/fraud', fraudRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/auth', authRoutes); // Mount auth routes

// Basic route
app.get('/', (req, res) => {
  res.send('SentriCard Fraud Detection API is running');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});