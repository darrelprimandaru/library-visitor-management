const express = require('express');
const router = express.Router();
const verifyToken = require('./authMiddleware');
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

// Delete a student
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    await Student.findByIdAndDelete(id);
    res.status(200).json({ message: 'Student deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update a student
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { barcode, name, class: studentClass } = req.body;


    // ✅ Validate inputs (same as in create)
    if (!/^\d{5}$/.test(barcode)) {
      return res.status(400).json({ error: "Barcode must be exactly 5 digits (00000 to 99999)." });
    }
    if (!/^[A-Za-z ]+$/.test(name)) {
      return res.status(400).json({ error: "Name can only contain letters and spaces." });
    }
    if (!/^(?:[1-9]|1[0-2])[a-zA-Z]{0,2}$/.test(studentClass)) {
      return res.status(400).json({ error: "Class must be 1–12 followed by up to 2 letters (e.g. 10A, 12B)." });
    }

    const updated = await Student.findByIdAndUpdate(
      req.params.id,
      { name, class: studentClass },  // intentionally exclude barcode here
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Student not found" });
    }

    // 🔧 Also update any visitor logs with the same barcode
    await Visitor.updateMany(
      { barcode },
      { name, class: studentClass }
    );

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const upload = multer({ dest: 'uploads/' });

router.post('/import', verifyToken, upload.single('csv'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ message: 'No file uploaded' });

  const results = [];

  fs.createReadStream(file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        // Clean up temp file
        fs.unlinkSync(file.path);

        const formatted = results.map(row => ({
          barcode: row.barcode,
          name: row.name,
          class: row.class
        }));

        try {
          const insertResult = await Student.insertMany(formatted, { ordered: false });
          res.status(200).json({ message: 'Import complete', inserted: insertResult.length });
        } catch (err) {
          const inserted = err.insertedDocs ? err.insertedDocs.length : 0;
          res.status(200).json({
            message: `Import partially completed. ${inserted} new students added.`,
            inserted
          });
        }
      } catch (err) {
        res.status(500).json({ message: 'Import failed', error: err.message });
      }
    });
});


module.exports = router;
