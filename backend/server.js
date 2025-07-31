const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs');

dotenv.config(); // ✅ load environment variables first

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/student');
const visitorRoutes = require('./routes/visitor');
const Student = require('./models/Student');
const Visitor = require('./models/Visitor');
const Log = require('./models/Log');

app.use('/api', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/visitors', visitorRoutes);

// Debug
console.log('Available files in ./routes:', fs.readdirSync('./routes'));

// ✅ MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// ✅ Your API endpoints (Checkin, Checkout, Logs, Stats, Distribution)

app.post('/api/checkin', async (req, res) => {
  try {
    const { barcode, purpose } = req.body;

    if (!/^\d{5}$/.test(barcode)) {
      return res.status(400).json({ message: 'Barcode must be a number from 00000 to 99999.' });
    }

    const student = await Student.findOne({ barcode });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const existingLog = await Log.findOne({ visitor: student._id, checkoutTime: null });
    if (existingLog) return res.status(400).json({ message: 'Already checked in' });

    const log = await Log.create({
      visitor: student._id,
      purpose: purpose || '-',
    });

    res.json({ visitor: student, log });
  } catch (err) {
    console.error('❌ Check-in error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.post('/api/checkout/:logId', async (req, res) => {
  const log = await Log.findByIdAndUpdate(req.params.logId, { checkoutTime: new Date() }, { new: true });
  if (!log) return res.status(404).json({ message: 'Log not found' });
  res.json(log);
});

app.get('/api/logs', async (req, res) => {
  const logs = await Log.find().populate({
    path: 'visitor',
    model: 'Student',
    select: 'name class barcode -_id'
  }).sort({ checkinTime: -1 });

  res.json(logs);
});

app.get('/api/stats', async (req, res) => {
  const stats = await Log.aggregate([
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$checkinTime" } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: -1 } },
    { $limit: 7 }
  ]);

  res.json(stats.reverse());
});

app.get('/api/distribution', async (req, res) => {
  const range = req.query.range || 'weekly';
  const timezone = req.query.tz || 'Asia/Jakarta';
  const now = new Date();
  let start;

  if (range === 'daily') start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  else if (range === 'weekly') start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  else if (range === 'monthly') start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  else if (range === 'yearly') start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  else start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);

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
    console.error("❌ Distribution error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
