const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  cardLastFour: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  merchantName: {
    type: String,
    required: true
  },
  merchantCategory: {
    type: String,
    required: true
  },
  location: {
    country: String,
    city: String,
    zip: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  ipAddress: String,
  deviceId: String,
  fraudScore: {
    type: Number,
    default: 0
  },
  isFlagged: {
    type: Boolean,
    default: false
  },
  isConfirmedFraud: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', TransactionSchema);