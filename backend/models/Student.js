const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  barcode: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  class: { type: String, required: true }
});

studentSchema.index({ barcode: 1 }, { unique: true });

module.exports = mongoose.models.Student || mongoose.model('Student', studentSchema);

