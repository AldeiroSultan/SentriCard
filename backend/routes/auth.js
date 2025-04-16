// File: backend/routes/auth.js
const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  getMe, 
  logout 
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/me', protect, getMe);
router.get('/logout', protect, logout);

module.exports = router;