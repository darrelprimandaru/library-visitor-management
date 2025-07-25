const fs = require('fs');

console.log('Available files in ./routes:', fs.readdirSync('./routes'));

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const studentRoutes = require('./routes/student');

const app = express();
app.use(express.json());
app.use(cors());
app.use('/api/students', studentRoutes);

mongoose.connect('mongodb://localhost:27017/library_visitors', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const visitorSchema = new mongoose.Schema({
  name: String,
  barcode: String,
  class: String,
  purpose: { type: String, default: '-' },
});

const logSchema = new mongoose.Schema({
  visitor: { type: mongoose.Schema.Types.ObjectId, ref: 'Visitor' },
  checkinTime: { type: Date, default: Date.now },
  checkoutTime: Date,
  purpose: { type: String, default: '-' },
});

const Visitor = mongoose.model('Visitor', visitorSchema);
const Log = mongoose.model('Log', logSchema);

app.post('/api/checkin', async (req, res) => {
  const { barcode, purpose } = req.body;

  // 1. Find the student
  const student = await Student.findOne({ barcode });
  if (!student) {
    return res.status(404).json({ message: 'Student not found' });
  }

  // 2. Check if visitor record already exists for this barcode
  let visitor = await Visitor.findOne({ barcode });
  if (!visitor) {
    visitor = await Visitor.create({
      name: student.name,
      barcode: student.barcode,
      class: student.class
    });
  }

  // 3. Create new log with purpose
  const log = await Log.create({
    visitor: visitor._id,
    purpose: purpose || '-' // Save purpose or fallback
  });

  res.json({ visitor, log });
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
  const pipeline = [
    {
      $project: {
        hour: { $hour: "$checkinTime" },
      },
    },
    {
      $group: {
        _id: {
          $switch: {
            branches: [
              { case: { $and: [{ $gte: ["$hour", 10] }, { $lt: ["$hour", 18] }] }, then: "10am - 6pm" },
              { case: { $and: [{ $gte: ["$hour", 18] }, { $lt: ["$hour", 24] }] }, then: "6pm - 12am" },
              { case: { $and: [{ $gte: ["$hour", 0] }, { $lt: ["$hour", 10] }] }, then: "12am - 10am" },
            ],
            default: "Other",
          },
        },
        count: { $sum: 1 },
      },
    },
  ];
  const data = await Log.aggregate(pipeline);
  res.json(data);
});


const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));