const express = require('express');
const router = express.Router();
const Visitor = require('../models/Visitor'); // You also need Log for deletion
const Log = require('../models/Log');

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

module.exports = router;
