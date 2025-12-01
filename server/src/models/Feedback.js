const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  item: {
    type: String,
    enum: ['Breakfast', 'Lunch', 'Dinner', 'Morning Tea', 'Evening Tea', 'Mid-Morning Tea', 'Night Tea'],
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comments: {
    type: String,
    default: ''
  },
  reply: {
    type: String,
    default: ''
  },
  repliedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  repliedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for better query performance
feedbackSchema.index({ userId: 1, createdAt: -1 });
feedbackSchema.index({ item: 1, createdAt: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema);