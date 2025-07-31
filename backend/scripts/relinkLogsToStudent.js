const mongoose = require('mongoose');
const Log = require('../models/Log');
const Student = require('../models/Student');

mongoose.connect('mongodb://localhost:27017/library_visitors');

async function relink() {
  try {
    const logs = await Log.find({ visitor: { $exists: false }, barcode: { $exists: true } });

    let updated = 0;

    for (const log of logs) {
      const { name, class: studentClass, barcode } = log;

      const student = await Student.findOne({ barcode, name, class: studentClass });

      if (student) {
        log.visitor = student._id;

        // Remove old fields
        log.barcode = undefined;
        log.name = undefined;
        log.class = undefined;

        await log.save();
        console.log(`✅ Relinked log ${log._id} → ${student.name} (${student.class})`);
        updated++;
      } else {
        console.log(`❌ No match for log ${log._id} → barcode: ${barcode}, name: ${name}, class: ${studentClass}`);
      }
    }

    console.log(`\n✅ Done. ${updated} logs updated.`);
  } catch (err) {
    console.error("❌ Migration error:", err);
  } finally {
    mongoose.disconnect();
  }
}

relink();
