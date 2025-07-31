// scripts/migrateLogsToUseVisitorRef.js

const mongoose = require('mongoose');
const Log = require('../models/Log');
const Student = require('../models/Student');

mongoose.connect('mongodb://localhost:27017/library_visitors', {
  // These options are deprecated in modern MongoDB drivers but harmless
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function migrate() {
  try {
    const logs = await Log.find({ visitor: { $exists: false } });

    let updatedCount = 0;

    for (const log of logs) {
      const { name, class: studentClass, barcode } = log;

      if (!name || !studentClass || !barcode) {
        console.log(`⚠️ Skipped log ${log._id} — missing name/class/barcode`);
        continue;
      }

      const student = await Student.findOne({
        name: name.trim(),
        class: studentClass.toString().trim(),
        barcode: barcode.toString().padStart(5, '0'),
      });

      if (student) {
        log.visitor = student._id;
        // Clean up old fields
        log.name = undefined;
        log.class = undefined;
        log.barcode = undefined;
        await log.save();
        console.log(`✅ Linked log ${log._id} to student ${student.name} (${student.class})`);
        updatedCount++;
      } else {
        console.log(`❌ No matching student for log ${log._id} with name ${name}, class ${studentClass}, barcode ${barcode}`);
      }
    }

    console.log(`\n✅ Done. ${updatedCount} logs updated.`);
  } catch (err) {
    console.error("❌ Migration error:", err);
  } finally {
    mongoose.disconnect();
  }
}

migrate();
