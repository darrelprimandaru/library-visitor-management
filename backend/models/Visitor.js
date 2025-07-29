const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  barcode: {
    type: String,
    required: true
  },
  name: String,
  class: String,
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

