const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  barcode: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  class: { type: String, required: true }
});

module.exports = mongoose.model('Student', studentSchema);