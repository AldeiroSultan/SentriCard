// File: backend/services/fraudDetection.js
// Purpose: Enhanced fraud detection service with more sophisticated logic

const User = require('../models/User');
const Transaction = require('../models/Transaction');

/**
 * Analyzes a transaction for potential fraud
 * @param {Object} transaction Transaction data to analyze
 * @returns {Object} Analysis results with fraud score and risk factors
 */
const analyzeTransaction = async (transaction) => {
  try {
    // Get user data for comparison with normal patterns
    const user = await User.findById(transaction.userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Get user's recent transactions
    const recentTransactions = await Transaction.find({ 
      userId: transaction.userId 
    }).sort({ timestamp: -1 }).limit(10);
    
    // Initialize score and risk factors
    let score = 0;
    const riskFactors = [];
    const weights = {
      amount: 25,
      location: 20,
      category: 15,
      time: 15,
      frequency: 20,
      device: 5
    };
    
    // Factor 1: Amount analysis
    const userAvgAmount = user.typicalSpendingPatterns.averageTransactionAmount || 100;
    if (transaction.amount > userAvgAmount * 5) {
      score += weights.amount;
      riskFactors.push('Transaction amount 5x higher than user average');
    } else if (transaction.amount > userAvgAmount * 3) {
      score += weights.amount * 0.8;
      riskFactors.push('Transaction amount 3x higher than user average');
    } else if (transaction.amount > userAvgAmount * 2) {
      score += weights.amount * 0.5;
      riskFactors.push('Transaction amount 2x higher than user average');
    }
    
    // Factor 2: Location analysis
    const isKnownLocation = user.typicalSpendingPatterns.frequentLocations.some(
      loc => transaction.location.city.includes(loc) || loc.includes(transaction.location.city)
    );
    
    if (transaction.location.country !== user.homeLocation.country) {
      score += weights.location;
      riskFactors.push('Transaction from foreign country');
    } else if (!isKnownLocation && transaction.location.city !== 'Online') {
      score += weights.location * 0.6;
      riskFactors.push('Transaction from unusual city');
    }
    
    // Factor 3: Merchant category analysis
    const isUnusualCategory = !user.typicalSpendingPatterns.frequentCategories.includes(transaction.merchantCategory);
    if (isUnusualCategory) {
      score += weights.category;
      riskFactors.push('Unusual merchant category for this user');
    }
    
    // Factor 4: Time analysis
    const transactionHour = new Date(transaction.timestamp).getHours();
    const isOutsideActiveHours = transactionHour < user.typicalSpendingPatterns.activeHours.start || 
                               transactionHour > user.typicalSpendingPatterns.activeHours.end;
    if (isOutsideActiveHours) {
      score += weights.time;
      riskFactors.push('Transaction outside typical active hours');
    }
    
    // Factor 5: Frequency analysis
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = recentTransactions.filter(t => 
      new Date(t.timestamp) > last24Hours
    ).length;
    
    if (recentCount > 8) {
      score += weights.frequency;
      riskFactors.push('Extremely high transaction frequency (>8 in 24h)');
    } else if (recentCount > 5) {
      score += weights.frequency * 0.7;
      riskFactors.push('High transaction frequency (>5 in 24h)');
    }
    
    // Factor 6: Device/IP analysis
    const isKnownDevice = recentTransactions.some(t => t.deviceId === transaction.deviceId);
    if (!isKnownDevice && transaction.deviceId !== 'unknown_device') {
      score += weights.device;
      riskFactors.push('Transaction from new device');
    }
    
    return {
      score,
      riskFactors,
      isHighRisk: score > 70
    };
  } catch (error) {
    console.error('Error analyzing transaction:', error);
    return {
      score: 0,
      riskFactors: ['Error analyzing transaction'],
      isHighRisk: false,
      error: error.message
    };
  }
};

/**
 * Get fraud statistics for dashboard
 */
const getFraudStatistics = async () => {
  try {
    const totalTransactions = await Transaction.countDocuments();
    const flaggedTransactions = await Transaction.countDocuments({ isFlagged: true });
    const confirmedFraudTransactions = await Transaction.countDocuments({ isConfirmedFraud: true });
    
    // Get last 7 days stats
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dailyStats = await Transaction.aggregate([
      {
        $match: {
          timestamp: { $gte: last7Days }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$timestamp" }
          },
          total: { $sum: 1 },
          flagged: {
            $sum: { $cond: [{ $eq: ["$isFlagged", true] }, 1, 0] }
          },
          confirmed: {
            $sum: { $cond: [{ $eq: ["$isConfirmedFraud", true] }, 1, 0] }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    return {
      summary: {
        totalTransactions,
        flaggedTransactions,
        confirmedFraudTransactions,
        flaggedPercentage: (flaggedTransactions / totalTransactions * 100).toFixed(2)
      },
      dailyStats
    };
  } catch (error) {
    console.error('Error getting fraud statistics:', error);
    return {
      error: error.message
    };
  }
};

module.exports = {
  analyzeTransaction,
  getFraudStatistics
};