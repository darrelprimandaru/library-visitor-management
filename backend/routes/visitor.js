const express = require('express');
const router = express.Router();
const Visitor = require('../models/Visitor'); // ✅ the new model
const Student = require('../models/Student');
const verifyToken = require('./authMiddleware');

// Delete a visitor log by ID
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const deleted = await Visitor.findByIdAndDelete(req.params.id); // ✅ use Visitor
    if (!deleted) {
      return res.status(404).json({ message: "Visitor log not found" });
    }
    res.json({ message: "Visitor log deleted" });
  } catch (err) {
    console.error("Error deleting visitor log:", err);
    res.status(500).json({ message: "Failed to delete visitor log" });
  }
});

// Edit visitor log (purpose)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { purpose } = req.body;
    const updated = await Visitor.findByIdAndUpdate(
      req.params.id,
      { purpose },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ message: "Visitor log not found" });
    }
    res.json(updated);
  } catch (err) {
    console.error("Error updating visitor log:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get all visitor logs
router.get('/', verifyToken, async (req, res) => {
  try {
    const logs = await Visitor.find().sort({ checkinTime: -1 });
    res.json(logs);
  } catch (err) {
    console.error("Error fetching visitor logs:", err);
    res.status(500).json({ message: "Failed to fetch visitor logs" });
  }
});

// Get total visitors over time (grouped by date)
router.get('/stats/total-visits', async (req, res) => {
  try {
    const stats = await Visitor.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$checkinTime" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    res.json(stats);
  } catch (err) {
    console.error("Error fetching total visits:", err);
    res.status(500).json({ message: "Failed to fetch total visits" });
  }
});

// Top visiting classes
router.get('/top-classes', async (req, res) => {
  try {
    const topClasses = await Visitor.aggregate([
      {
        $group: {
          _id: "$studentClass",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    res.json(topClasses);
  } catch (err) {
    console.error("Error getting top classes:", err);
    res.status(500).json({ message: "Failed to get top visiting classes" });
  }
});

// Get average visit duration in minutes
router.get('/average-duration', async (req, res) => {
  try {
    const result = await Visitor.aggregate([
      { $match: { checkoutTime: { $ne: null } } },
      {
        $project: {
          durationMinutes: {
            $divide: [
              { $subtract: ["$checkoutTime", "$checkinTime"] },
              1000 * 60
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          averageDuration: { $avg: "$durationMinutes" }
        }
      }
    ]);

    const avg = result.length > 0 ? result[0].averageDuration : 0;
    res.json({ averageDuration: avg.toFixed(2) });
  } catch (err) {
    console.error("Error calculating average duration:", err);
    res.status(500).json({ message: "Failed to calculate average visit duration" });
  }
});

const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const upload = multer({ dest: "uploads/" });

// Import visitor logs from CSV
router.post('/import', verifyToken, upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ message: 'No file uploaded' });

  const rows = [];
  const conflicts = [];
  const logsToInsert = [];

  fs.createReadStream(file.path)
    .pipe(csv())
    .on("data", (data) => rows.push(data))
    .on("end", async () => {
      try {
        fs.unlinkSync(file.path);

        for (const row of rows) {
          const student = await Student.findOne({ barcode: row.barcode });
          if (!student) continue;

          if (student.name !== row.name || student.class !== row.class) {
            conflicts.push({
              barcode: row.barcode,
              studentName: student.name,
              studentClass: student.class,
              csvName: row.name,
              csvClass: row.class
            });
          }

          logsToInsert.push({
            barcode: student.barcode,
            studentName: student.name,
            studentClass: student.class,
            purpose: row.purpose || '-',
            checkinTime: new Date(row.checkinTime),
            checkoutTime: row.checkoutTime ? new Date(row.checkoutTime) : null
          });
        }

        const inserted = await Visitor.insertMany(logsToInsert, { ordered: false });

        res.json({
          message: 'Visitor logs import complete',
          inserted: inserted.length,
          conflicts
        });

      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Import failed', error: err.message });
      }
    });
});

module.exports = router;
