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

app.use('/api', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/visitors', visitorRoutes);

// Debug
console.log('Available files in ./routes:', fs.readdirSync('./routes'));
console.log("🔍 MONGODB_URI:", process.env.MONGODB_URI);


// ✅ MongoDB connection
mongoose.connect(process.env.MONGODB_URI).then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// ✅ Your API endpoints (Checkin, Checkout, Logs, Stats, Distribution)

app.post('/api/checkin', async (req, res) => {
  try {
    const { barcode, purpose } = req.body;

    if (!/^\d{1,10}$/.test(barcode)) {
      return res.status(400).json({ message: 'Barcode must be a number from 1 to 10 digits.' });
    }

    const student = await Student.findOne({ barcode });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const existingLog = await Visitor.findOne({ barcode: student.barcode, checkoutTime: null });
    if (existingLog) return res.status(400).json({ message: 'Already checked in' });

    const log = await Visitor.create({
      barcode: student.barcode,
      studentName: student.name,
      studentClass: student.class,
      purpose: purpose || '-',
    });

    res.json({ visitor: student, log });
  } catch (err) {
    console.error('❌ Check-in error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.post('/api/checkout/:logId', async (req, res) => {
  const log = await Visitor.findByIdAndUpdate(req.params.logId, { checkoutTime: new Date() }, { new: true });
  if (!log) return res.status(404).json({ message: 'Log not found' });
  res.json(log);
});

app.get('/api/logs', async (req, res) => {
  const logs = await Visitor.find().sort({ checkinTime: -1 });

  res.json(logs);
});

app.get('/api/stats', async (req, res) => {
  const stats = await Visitor.aggregate([
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
    const result = await Visitor.aggregate([
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
