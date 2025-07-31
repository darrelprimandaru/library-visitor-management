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

// Get total visitors over time (grouped by date)
router.get('/stats/total-visits', async (req, res) => {
  try {
    const stats = await Log.aggregate([
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
    const topClasses = await Log.aggregate([
      {
        $lookup: {
          from: 'students',
          localField: 'visitor',
          foreignField: '_id',
          as: 'visitorInfo'
        }
      },
      { $unwind: '$visitorInfo' },
      {
        $group: {
          _id: '$visitorInfo.class',
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
    const result = await Log.aggregate([
      {
        $match: {
          checkoutTime: { $ne: null } // only include completed visits
        }
      },
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


module.exports = router;
