// File: backend/controllers/transactionController.js
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { analyzeTransaction } = require('../services/fraudDetection');

// @desc    Get all transactions with filtering
// @route   GET /api/transactions
// @access  Private
exports.getTransactions = async (req, res) => {
  try {
    // Extract filter parameters from query string
    const {
      startDate,
      endDate,
      minAmount,
      maxAmount,
      merchantCategory,
      merchantName,
      location,
      cardLastFour,
      isFlagged,
      searchTerm,
      page = 1,
      limit = 20,
      sortField = 'timestamp',
      sortOrder = 'desc'
    } = req.query;

    // Build filter query
    const query = {};

    // Date range filter
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }

    // Amount range filter
    if (minAmount || maxAmount) {
      query.amount = {};
      if (minAmount) {
        query.amount.$gte = parseFloat(minAmount);
      }
      if (maxAmount) {
        query.amount.$lte = parseFloat(maxAmount);
      }
    }

    // Merchant category filter
    if (merchantCategory) {
      query.merchantCategory = merchantCategory;
    }

    // Merchant name filter
    if (merchantName) {
      query.merchantName = { $regex: merchantName, $options: 'i' };
    }

    // Location filter
    if (location) {
      query['location.country'] = { $regex: location, $options: 'i' };
    }

    // Card last four digits filter
    if (cardLastFour) {
      query.cardLastFour = cardLastFour;
    }

    // Flag status filter
    if (isFlagged !== undefined) {
      query.isFlagged = isFlagged === 'true';
    }

    // Text search across multiple fields
    if (searchTerm) {
      query.$or = [
        { merchantName: { $regex: searchTerm, $options: 'i' } },
        { merchantCategory: { $regex: searchTerm, $options: 'i' } },
        { 'location.country': { $regex: searchTerm, $options: 'i' } },
        { 'location.city': { $regex: searchTerm, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Determine sort direction
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sortOptions = {};
    sortOptions[sortField] = sortDirection;

    // Execute query with pagination and sorting
    const transactions = await Transaction.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'name email');

    // Get total count for pagination
    const totalTransactions = await Transaction.countDocuments(query);
    
    // Calculate total pages
    const totalPages = Math.ceil(totalTransactions / parseInt(limit));

    // Return paginated results with metadata
    res.json({
      transactions,
      pagination: {
        total: totalTransactions,
        pages: totalPages,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (err) {
    console.error('Error getting transactions:', err);
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get flagged transactions
// @route   GET /api/transactions/flagged
// @access  Private
exports.getFlaggedTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ isFlagged: true })
      .sort({ timestamp: -1 })
      .populate('userId', 'name email');
      
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get a single transaction by ID
// @route   GET /api/transactions/:id
// @access  Private
exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('userId', 'name email');
      
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    res.json(transaction);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Process new transaction
// @route   POST /api/transactions
// @access  Private
exports.processTransaction = async (req, res) => {
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
};

// @desc    Update transaction fraud status
// @route   PUT /api/transactions/:id/fraud-status
// @access  Private
exports.updateFraudStatus = async (req, res) => {
  try {
    const { isConfirmedFraud } = req.body;
    
    if (isConfirmedFraud === undefined) {
      return res.status(400).json({ message: 'isConfirmedFraud field is required' });
    }
    
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    transaction.isConfirmedFraud = isConfirmedFraud;
    
    // If confirmed as not fraud, unflag it
    if (isConfirmedFraud === false) {
      transaction.isFlagged = false;
    }
    
    const updatedTransaction = await transaction.save();
    
    res.json(updatedTransaction);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get transactions statistics
// @route   GET /api/transactions/stats
// @access  Private
exports.getTransactionStats = async (req, res) => {
  try {
    // Get total transactions
    const totalTransactions = await Transaction.countDocuments();
    
    // Get flagged transactions
    const flaggedTransactions = await Transaction.countDocuments({ isFlagged: true });
    
    // Get confirmed fraud transactions
    const confirmedFraudTransactions = await Transaction.countDocuments({ isConfirmedFraud: true });
    
    // Get transaction amounts by category
    const transactionsByCategory = await Transaction.aggregate([
      { 
        $group: {
          _id: '$merchantCategory',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          flaggedCount: { 
            $sum: {
              $cond: [{ $eq: ['$isFlagged', true] }, 1, 0]
            }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Get transactions by day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const transactionsByDay = await Transaction.aggregate([
      {
        $match: {
          timestamp: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
          },
          count: { $sum: 1 },
          flaggedCount: { 
            $sum: {
              $cond: [{ $eq: ['$isFlagged', true] }, 1, 0]
            }
          },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.json({
      totalTransactions,
      flaggedTransactions,
      confirmedFraudTransactions,
      flaggedPercentage: (flaggedTransactions / totalTransactions * 100).toFixed(2),
      transactionsByCategory,
      transactionsByDay
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};