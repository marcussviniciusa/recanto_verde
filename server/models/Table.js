const mongoose = require('mongoose');

const TableSchema = new mongoose.Schema({
  tableNumber: {
    type: Number,
    required: true,
    unique: true
  },
  capacity: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'reserved'],
    default: 'available'
  },
  currentOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  assignedWaiter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  occupiedAt: {
    type: Date,
    default: null
  },
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true }
  },
  section: {
    type: String,
    default: 'main'
  }
});

// Virtual for table status color
TableSchema.virtual('statusColor').get(function() {
  switch(this.status) {
    case 'available':
      return 'green';
    case 'occupied':
      return 'yellow';
    case 'reserved':
      return 'orange';
    default:
      return 'gray';
  }
});

module.exports = mongoose.model('Table', TableSchema);
