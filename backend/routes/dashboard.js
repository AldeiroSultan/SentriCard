// File: backend/routes/dashboard.js
// Purpose: Route handler for dashboard analytics

const express = require('express');
const router = express.Router();
const { getFraudStatistics } = require('../services/fraudDetection');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

// Get fraud detection dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await getFraudStatistics();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get recent flagged transactions
router.get('/recent-flags', async (req, res) => {
  try {
    const recentFlags = await Transaction.find({ isFlagged: true })
      .sort({ timestamp: -1 })
      .limit(5)
      .populate('userId', 'name email');
      
    res.json(recentFlags);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get user count
router.get('/user-count', async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    res.json({ userCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;