const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');

// Get all confirmed fraud cases
router.get('/', async (req, res) => {
  try {
    const fraudCases = await Transaction.find({ isConfirmedFraud: true });
    res.json(fraudCases);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark a transaction as confirmed fraud
router.put('/:id/confirm', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    
    transaction.isConfirmedFraud = true;
    const updatedTransaction = await transaction.save();
    res.json(updatedTransaction);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark a transaction as false positive
router.put('/:id/false-positive', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    
    transaction.isFlagged = false;
    transaction.fraudScore = 0;
    const updatedTransaction = await transaction.save();
    res.json(updatedTransaction);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;