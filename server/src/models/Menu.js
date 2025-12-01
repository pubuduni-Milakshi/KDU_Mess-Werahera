const mongoose = require('mongoose');

const menuSchema = new mongoose.Schema({
  day: { 
    type: String, 
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], 
    required: true 
  },
  breakfast: {
    type: String,
    required: true
  },
  lunch: {
    type: String,
    required: true
  },
  dinner: {
    type: String,
    required: true
  },
  specialNotes: {
    type: String,
    default: ''
  },
  weekStartDate: {
    type: Date,
    required: true
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  publishedAt: {
    type: Date
  }
}, { 
  timestamps: true 
});

// Indexes for faster queries
menuSchema.index({ day: 1, weekStartDate: 1 });
menuSchema.index({ isPublished: 1, weekStartDate: -1 });

module.exports = mongoose.model('Menu', menuSchema);