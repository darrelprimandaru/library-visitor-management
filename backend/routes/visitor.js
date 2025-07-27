const express = require('express');
const router = express.Router();
const Visitor = require('../models/Visitor'); // You also need Log for deletion
const Log = require('../models/Log');
const Student = require('../models/Student');


// Delete a visitor log by ID
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Log.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Visitor log not found" });
    }
    res.json({ message: "Visitor log deleted" });
  } catch (err) {
    console.error("Error deleting visitor log:", err);
    res.status(500).json({ message: "Failed to delete visitor log" });
  }
});

//Edit visitor log (purpose)
router.put('/:id', async (req, res) => {
  try {
    const { purpose } = req.body;

    const updated = await Log.findByIdAndUpdate(req.params.id, { purpose }, { new: true });

    if (!updated) {
      return res.status(404).json({ message: "Log not found" });
    }

    res.json(updated);
  } catch (err) {
    console.error("Error updating log:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get all visitor logs with populated student data
router.get('/', async (req, res) => {
  try {
    const logs = await Log.find()
      .populate('visitor') // this must match the model name exactly
      .sort({ checkinTime: -1 });

    res.json(logs);
  } catch (err) {
    console.error("Error fetching visitor logs:", err);
    res.status(500).json({ message: "Failed to fetch visitor logs" });
  }
});







module.exports = router;
