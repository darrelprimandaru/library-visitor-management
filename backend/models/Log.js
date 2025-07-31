const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  visitor: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' }, // matches model name
  checkinTime: { type: Date, default: Date.now },
  checkoutTime: Date,
  purpose: { type: String, default: '-' },
});

module.exports = mongoose.models.Log || mongoose.model('Log', logSchema);
