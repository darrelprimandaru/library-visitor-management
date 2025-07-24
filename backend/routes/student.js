const express = require('express');
const router = express.Router();
const Student = require('../models/Student');

// Add a new student
router.post('/', async (req, res) => {
  try {
    const { barcode, name, class: studentClass } = req.body;
    const student = new Student({ barcode, name, class: studentClass });
    await student.save();
    res.status(201).json(student);
  } catch (err) {
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

module.exports = router;