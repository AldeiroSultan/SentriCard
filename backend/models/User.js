// File: backend/models/User.js
// Purpose: User model schema definition

const mongoose = require('mongoose');

// Define the card schema first
const CardSchema = new mongoose.Schema({
  lastFour: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  homeLocation: {
    country: String,
    city: String,
    zip: String
  },
  cards: [CardSchema], // Use the CardSchema for the cards array
  typicalSpendingPatterns: {
    averageTransactionAmount: Number,
    frequentCategories: [String],
    frequentLocations: [String],
    activeHours: {
      start: Number,
      end: Number
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);