const fs = require('fs');

console.log('Available files in ./routes:', fs.readdirSync('./routes'));

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const studentRoutes = require('./routes/student');
const vistorRoutes = require('./routes/visitor');
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

    const student = await Student.findOne({ barcode });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const visitor = await Visitor.findOneAndUpdate(
      { barcode },
      {
        name: student.name,
        class: student.class,
        barcode: student.barcode,
      },
      {
        new: true,
        upsert: true,
      }
    );

    const log = await Log.create({
      visitor: visitor._id,
      purpose: purpose || '-',
    });

    res.json({ visitor, log });
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
  const logs = await Log.find().populate('visitor').sort({ checkinTime: -1 }).limit(50);
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