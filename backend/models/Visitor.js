const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  barcode: {
    type: String,
    required: true
  },
  studentName: String,       // ✅ name at time of check-in
  studentClass: String,      // ✅ class at time of check-in
  checkinTime: {
    type: Date,
    default: Date.now
  },
  checkoutTime: {
    type: Date,
    default: null
  },
  purpose: {
    type: String,
    default: '-'
  }
});

module.exports = mongoose.models.Visitor || mongoose.model('Visitor', visitorSchema);
