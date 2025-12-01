const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  menuId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Menu'
    // NOT required anymore - tea bookings won't have a menuId
  },
  mealType: { 
    type: String, 
    enum: ['Breakfast', 'Lunch', 'Dinner', 'Morning Tea', 'Mid-Morning Tea', 'Evening Tea', 'Night Tea'], 
    required: true 
  },
  category: { 
    type: String, 
    enum: ['Vegetarian', 'Non-Veg', 'Beverage'],
    required: true 
  },
  quantity: { 
    type: Number, 
    required: true, 
    min: 1,
    default: 1
  },
  orderDate: { 
    type: Date, 
    required: true 
  },
  orderTime: { 
    type: Date, 
    default: Date.now 
  },
  status: { 
    type: String, 
    enum: ['Booked', 'Cancelled', 'Pending', 'Prepared', 'Served', 'Confirmed'], 
    default: 'Booked' 
  },
  cutoffTime: { 
    type: Date, 
    required: true 
  },
  notes: { 
    type: String 
  },
  specialRequests: {
    type: String,
    default: ''
  },
  price: { 
    type: Number,
    default: 0
  },
  isAutoBooked: {
    type: Boolean,
    default: false
  },
  canCancel: {
    type: Boolean,
    default: true
  },
  cancelledAt: {
    type: Date
  },
  cancelledAfterDeadline: {
    type: Boolean,
    default: false
  }
}, { 
  timestamps: true 
});

// Indexes for better query performance
orderSchema.index({ userId: 1, orderDate: 1, mealType: 1 });
orderSchema.index({ status: 1, orderDate: 1 });

// Check if order is for tea
orderSchema.methods.isTeaOrder = function() {
  return ['Morning Tea', 'Mid-Morning Tea', 'Evening Tea', 'Night Tea'].includes(this.mealType);
};

// Get tea serving time
orderSchema.methods.getTeaTime = function() {
  const times = {
    'Morning Tea': '05:30',
    'Mid-Morning Tea': '11:00',
    'Evening Tea': '18:00',
    'Night Tea': '22:00'
  };
  return times[this.mealType] || null;
};

module.exports = mongoose.model('Order', orderSchema);