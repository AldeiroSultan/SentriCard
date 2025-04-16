const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const { analyzeTransaction } = require('../services/fraudDetection');

// Get all transactions
router.get('/', async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ timestamp: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get flagged transactions
router.get('/flagged', async (req, res) => {
  try {
    const flaggedTransactions = await Transaction.find({ isFlagged: true }).sort({ timestamp: -1 });
    res.json(flaggedTransactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Process new transaction
router.post('/', async (req, res) => {
  try {
    // Analyze transaction for fraud
    const fraudAnalysis = await analyzeTransaction(req.body);
    
    // Create new transaction with fraud score
    const transaction = new Transaction({
      ...req.body,
      fraudScore: fraudAnalysis.score,
      isFlagged: fraudAnalysis.score > 70
    });
    
    const savedTransaction = await transaction.save();
    
    res.status(201).json({
      transaction: savedTransaction,
      fraudAnalysis
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;