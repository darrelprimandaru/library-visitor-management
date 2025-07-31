const fs = require('fs');

require('dotenv').config(); // Load .env
const cors = require('cors');
const jwt = require('jsonwebtoken');

app.use(cors());
app.use(express.json()); // In case it's missing

const authRoutes = require('./routes/auth');
app.use('/api', authRoutes);


console.log('Available files in ./routes:', fs.readdirSync('./routes'));

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const studentRoutes = require('./routes/student');
const Student = require('./models/Student');
const Visitor = require('./models/Visitor');
const Log = require('./models/Log');
const visitorRoutes = require('./routes/visitor');


const app = express();
app.use(express.json());
app.use(cors());
app.use('/api/students', studentRoutes);
app.use('/api/visitors', visitorRoutes);

mongoose.connect('mongodb://localhost:27017/library_visitors', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});


app.post('/api/checkin', async (req, res) => {
  try {
    const { barcode, purpose } = req.body;

    if (!/^\d{5}$/.test(barcode)) {
      return res.status(400).json({ message: 'Barcode must be a number from 00000 to 99999.' });
    }

    const student = await Student.findOne({ barcode });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Prevent double check-in
    const existingLog = await Log.findOne({ visitor: student._id, checkoutTime: null });
    if (existingLog) {
      return res.status(400).json({ message: 'Student is already checked in and has not checked out.' });
    }

    const log = await Log.create({
      visitor: student._id,      // <-- changed to use student._id directly
      purpose: purpose || '-',
    });

    res.json({ visitor: student, log });  // <-- return the student directly
  } catch (err) {
    console.error('❌ Check-in error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});





app.post('/api/checkout/:logId', async (req, res) => {
  const { logId } = req.params;
  const log = await Log.findByIdAndUpdate(logId, { checkoutTime: new Date() }, { new: true });
  if (!log) return res.status(404).json({ message: 'Log not found' });
  res.json(log);
});

app.get('/api/logs', async (req, res) => {
  const logs = await Log.find()
    .populate({
      path: 'visitor',
      model: 'Student',
      select: 'name class barcode -_id' // optionally exclude _id
    })
    .sort({ checkinTime: -1 });

  res.json(logs);
});

app.get('/api/stats', async (req, res) => {
  const pipeline = [
    { $group: {
      _id: { $dateToString: { format: "%Y-%m-%d", date: "$checkinTime" }},
      count: { $sum: 1 }
    }},
    { $sort: { _id: -1 } },
    { $limit: 7 }
  ];
  const stats = await Log.aggregate(pipeline);
  res.json(stats.reverse());
});

app.get('/api/distribution', async (req, res) => {
  const range = req.query.range || 'weekly';
  const timezone = req.query.tz || 'Asia/Jakarta';

  const now = new Date();
  let start;

  if (range === 'daily') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (range === 'weekly') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  } else if (range === 'monthly') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  } else if (range === 'yearly') {
    start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  } else {
    // default fallback
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  }


  try {
    const result = await Log.aggregate([
      { $match: { checkinTime: { $gte: start } } },
      {
        $project: {
          localHour: {
            $hour: {
              date: "$checkinTime",
              timezone: timezone
            }
          }
        }
      },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $lt: ["$localHour", 8] }, then: "12am–8am" },
                { case: { $lt: ["$localHour", 16] }, then: "8am–4pm" }
              ],
              default: "4pm–12am"
            }
          },
          count: { $sum: 1 }
        }
      }
    ]);
    res.json(result);
  } catch (err) {
    console.error("Error generating distribution:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});




const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));