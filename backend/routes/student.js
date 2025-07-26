const express = require('express');
const router = express.Router();
const Student = require('../models/Student');

// Add a new student
router.post('/', async (req, res) => {
  try {
    const { barcode, name, class: studentClass } = req.body;

    // ✅ Check for existing barcode
    const existing = await Student.findOne({ barcode });
    if (existing) {
      return res.status(400).json({ error: "A student with this barcode already exists." });
    }

    const student = new Student({ barcode, name, class: studentClass });
    await student.save();
    res.status(201).json(student);
  } catch (err) {
  // Covers all versions of MongoDB/Mongoose
  if (err.code === 11000 && err.message.includes('barcode')) {
    return res.status(400).json({ error: "A student with this barcode already exists." });
  }
  res.status(400).json({ error: err.message });
}

});


// Get student by barcode
router.get('/:barcode', async (req, res) => {
  try {
    const student = await Student.findOne({ barcode: req.params.barcode });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json(student);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// List all students
router.get('/', async (req, res) => {
  try {
    const students = await Student.find();
    res.json(students);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

//Delete a student
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Student.findByIdAndDelete(id);
    res.status(200).json({ message: 'Student deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;