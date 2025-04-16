// File: backend/scripts/seedData.js
// Purpose: Script to seed the database with test data for the fraud detection system

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas for seeding'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Sample user data
const users = [
  {
    name: 'John Smith',
    email: 'john.smith@example.com',
    homeLocation: {
      country: 'USA',
      city: 'New York',
      zip: '10001'
    },
    cards: [
      {
        lastFour: '4321',
        type: 'Visa',
        isActive: true
      }
    ],
    typicalSpendingPatterns: {
      averageTransactionAmount: 120,
      frequentCategories: ['groceries', 'dining', 'retail'],
      frequentLocations: ['New York', 'Online'],
      activeHours: {
        start: 8,
        end: 23
      }
    }
  },
  {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@example.com',
    homeLocation: {
      country: 'USA',
      city: 'San Francisco',
      zip: '94105'
    },
    cards: [
      {
        lastFour: '8765',
        type: 'Mastercard',
        isActive: true
      }
    ],
    typicalSpendingPatterns: {
      averageTransactionAmount: 85,
      frequentCategories: ['dining', 'entertainment', 'travel'],
      frequentLocations: ['San Francisco', 'Los Angeles', 'Online'],
      activeHours: {
        start: 9,
        end: 22
      }
    }
  }
];

// Function to generate transactions for users
const generateTransactionsForUser = (userId, userDetails, fraudulent = false) => {
  const transactions = [];
  
  // Generate normal transactions
  if (!fraudulent) {
    // Regular purchase in usual location
    transactions.push({
      userId,
      cardLastFour: userDetails.cards[0].lastFour,
      amount: userDetails.typicalSpendingPatterns.averageTransactionAmount * (0.8 + Math.random() * 0.4),
      merchantName: 'Local Grocery Store',
      merchantCategory: 'groceries',
      location: {
        country: userDetails.homeLocation.country,
        city: userDetails.homeLocation.city,
        zip: userDetails.homeLocation.zip
      },
      timestamp: new Date(),
      ipAddress: '192.168.1.1',
      deviceId: 'device_' + userId.toString().substring(0, 5),
      fraudScore: 10,
      isFlagged: false,
      isConfirmedFraud: false
    });
    
    // Online purchase
    transactions.push({
      userId,
      cardLastFour: userDetails.cards[0].lastFour,
      amount: userDetails.typicalSpendingPatterns.averageTransactionAmount * (0.8 + Math.random() * 0.4),
      merchantName: 'Online Retailer',
      merchantCategory: 'retail',
      location: {
        country: userDetails.homeLocation.country,
        city: 'Online',
        zip: '00000'
      },
      timestamp: new Date(),
      ipAddress: '192.168.1.1',
      deviceId: 'device_' + userId.toString().substring(0, 5),
      fraudScore: 15,
      isFlagged: false,
      isConfirmedFraud: false
    });
  } 
  // Generate suspicious/fraudulent transactions
  else {
    // Unusually large transaction
    transactions.push({
      userId,
      cardLastFour: userDetails.cards[0].lastFour,
      amount: userDetails.typicalSpendingPatterns.averageTransactionAmount * 5,
      merchantName: 'Luxury Electronics',
      merchantCategory: 'electronics',
      location: {
        country: 'Nigeria', // Different country
        city: 'Lagos',
        zip: '23401'
      },
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
      ipAddress: '85.214.45.22', // Different IP
      deviceId: 'unknown_device',
      fraudScore: 85,
      isFlagged: true,
      isConfirmedFraud: false
    });
    
    // Multiple transactions in short time
    const baseTime = Date.now();
    for (let i = 0; i < 3; i++) {
      transactions.push({
        userId,
        cardLastFour: userDetails.cards[0].lastFour,
        amount: 25 + Math.random() * 30,
        merchantName: 'Online Gaming Site ' + (i+1),
        merchantCategory: 'gaming',
        location: {
          country: 'Russia', // Different country
          city: 'Moscow',
          zip: '10100'
        },
        timestamp: new Date(baseTime - (i * 1000 * 60 * 15)), // 15 min apart
        ipAddress: '91.108.23.' + (i+1),
        deviceId: 'device_unknown',
        fraudScore: 75,
        isFlagged: true,
        isConfirmedFraud: false
      });
    }
  }
  
  return transactions;
};

// Seed the database
const seedDatabase = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Transaction.deleteMany({});
    
    console.log('Cleared existing data');
    
    // Insert users
    const createdUsers = await User.insertMany(users);
    console.log(`Inserted ${createdUsers.length} users`);
    
    // Generate transactions for each user
    let allTransactions = [];
    
    for (const user of createdUsers) {
      // Generate normal transactions
      const normalTransactions = generateTransactionsForUser(user._id, user);
      allTransactions = [...allTransactions, ...normalTransactions];
      
      // Generate fraudulent transactions (50% chance per user)
      if (Math.random() > 0.5) {
        const fraudulentTransactions = generateTransactionsForUser(user._id, user, true);
        allTransactions = [...allTransactions, ...fraudulentTransactions];
      }
    }
    
    // Insert transactions
    const createdTransactions = await Transaction.insertMany(allTransactions);
    console.log(`Inserted ${createdTransactions.length} transactions`);
    
    console.log('Database seeded successfully!');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding database:', error);
    mongoose.connection.close();
  }
};

// Run the seeding function
seedDatabase();