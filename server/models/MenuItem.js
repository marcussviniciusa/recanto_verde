const mongoose = require('mongoose');

const MenuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    enum: ['appetizer', 'main', 'dessert', 'drink', 'special'],
    required: true
  },
  available: {
    type: Boolean,
    default: true
  },
  image: {
    type: String
  },
  preparationTime: {
    type: Number, // in minutes
    default: 15
  },
  isSpecial: {
    type: Boolean,
    default: false
  },
  ingredients: [{
    type: String
  }],
  nutritionalInfo: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fats: Number
  },
  popularity: {
    orderCount: { type: Number, default: 0 },
    rating: { type: Number, default: 0 }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('MenuItem', MenuItemSchema);
