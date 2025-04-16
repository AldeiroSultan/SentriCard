// File: backend/routes/transactions.js
const express = require('express');
const router = express.Router();
const { 
  getTransactions, 
  getFlaggedTransactions, 
  getTransactionById,
  processTransaction,
  updateFraudStatus,
  getTransactionStats
} = require('../controllers/transactionController');
const { protect, authorize } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(protect);

// Get all transactions with filtering
router.get('/', getTransactions);

// Get flagged transactions
router.get('/flagged', getFlaggedTransactions);

// Get transaction statistics
router.get('/stats', getTransactionStats);

// Get a single transaction
router.get('/:id', getTransactionById);

// Process new transaction
router.post('/', processTransaction);

// Update transaction fraud status (analysts and admins only)
router.put('/:id/fraud-status', authorize('analyst', 'admin'), updateFraudStatus);

module.exports = router;