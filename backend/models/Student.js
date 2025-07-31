const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  barcode: {
    type: String,
    required: true,
    unique: true,
    match: /^\d{5}$/, // must be exactly 5 digits
  },
  name: {
    type: String,
    required: true,
    match: /^[A-Za-z ]+$/,
  },
  class: {
    type: String,
    required: true,
    match: /^(?:[1-9]|1[0-2])[a-zA-Z]{0,2}$/,
  }
});

module.exports = mongoose.models.Student || mongoose.model('Student', studentSchema);

