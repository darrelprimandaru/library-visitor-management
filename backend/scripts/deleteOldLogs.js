const mongoose = require('mongoose');
const Log = require('../models/Log');

mongoose.connect('mongodb://localhost:27017/library_visitors');

async function run() {
  try {
    const result = await Log.deleteMany({ checkoutTime: { $ne: null } });
    console.log(`✅ Deleted ${result.deletedCount} logs that had checkoutTime`);
  } catch (err) {
    console.error('❌ Failed to delete logs:', err);
  } finally {
    mongoose.disconnect();
  }
}

run();
