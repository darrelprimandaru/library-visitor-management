const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Visitor = require('../models/Visitor');

// Add a new student
router.post('/', async (req, res) => {
  try {
    const { barcode, name, class: studentClass } = req.body;

    // ✅ Validate barcode format
    if (!/^\d{5}$/.test(barcode)) {
      return res.status(400).json({ error: "Barcode must be exactly 5 digits (00000 to 99999)." });
    }

    // ✅ Validate name (letters and spaces)
    if (!/^[A-Za-z ]+$/.test(name)) {
      return res.status(400).json({ error: "Name can only contain letters and spaces." });
    }

    // ✅ Validate class (1–12 with optional letters like A or B)
    if (!/^(?:[1-9]|1[0-2])[a-zA-Z]{0,2}$/.test(studentClass)) {
      return res.status(400).json({ error: "Class must be 1–12 followed by up to 2 letters (e.g. 10A, 12B)." });
    }

    // ✅ Check for duplicate barcode
    const existing = await Student.findOne({ barcode });
    if (existing) {
      return res.status(400).json({ error: "A student with this barcode already exists." });
    }

    const student = new Student({ barcode, name, class: studentClass });
    await student.save();
    res.status(201).json(student);
  } catch (err) {
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

// Update a student
router.put('/:id', async (req, res) => {
  try {
    const { barcode, name, class: studentClass } = req.body;

    // Validations
    if (!/^\d{5}$/.test(barcode)) {
      return res.status(400).json({ error: "Barcode must be 5 digits" });
    }
    if (!/^[A-Za-z ]+$/.test(name)) {
      return res.status(400).json({ error: "Name must be letters and spaces only" });
    }
    if (!/^(?:[1-9]|1[0-2])[a-zA-Z]{0,2}$/.test(studentClass)) {
      return res.status(400).json({ error: "Invalid class format" });
    }

    const updated = await Student.findByIdAndUpdate(req.params.id, {
      barcode,
      name,
      class: studentClass
    }, { new: true });

    if (!updated) {
      return res.status(404).json({ error: "Student not found" });
    }

    // 🔧 Also update the Visitor document if it exists
    await Visitor.findOneAndUpdate(
      { barcode },
      { name, class: studentClass }
    );

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


module.exports = router;