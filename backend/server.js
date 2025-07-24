const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect('mongodb://localhost:27017/library_visitors', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const visitorSchema = new mongoose.Schema({
  name: String,
  barcode: String,
  class: String,
});

const logSchema = new mongoose.Schema({
  visitor: { type: mongoose.Schema.Types.ObjectId, ref: 'Visitor' },
  checkinTime: { type: Date, default: Date.now },
  checkoutTime: Date,
});

const Visitor = mongoose.model('Visitor', visitorSchema);
const Log = mongoose.model('Log', logSchema);

app.post('/api/checkin', async (req, res) => {
  const { barcode } = req.body;
  let visitor = await Visitor.findOne({ barcode });
  if (!visitor) visitor = await Visitor.create({ name: 'Unknown', barcode, class: '-' });
  const log = await Log.create({ visitor: visitor._id });
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

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));