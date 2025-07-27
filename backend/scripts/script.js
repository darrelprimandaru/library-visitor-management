const mongoose = require('mongoose');
const Log = require('../models/Log');
const Student = require('../models/Student');


mongoose.connect('mongodb://localhost:27017/YOUR_DB_NAME');

(async () => {
  try {
    const logs = await Log.find();

    let updatedCount = 0;

    for (const log of logs) {
      // Try to find student by ID
      const student = await Student.findById(log.visitor);
      if (!student) {
        // Try to match with another existing student (fallback logic)
        // For now, skip broken logs
        console.log(`Log ${log._id} has broken visitor reference: ${log.visitor}`);
        continue;
      }

      // Optional: Re-save the log to force proper linking
      await Log.findByIdAndUpdate(log._id, {
        visitor: student._id
      });

      updatedCount++;
    }

    console.log(`Repair complete. ${updatedCount} logs updated.`);
    process.exit();
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
})();
