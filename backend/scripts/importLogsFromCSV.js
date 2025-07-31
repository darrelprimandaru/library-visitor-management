const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const Log = require('../models/Log');
const Student = require('../models/Student');
const Visitor = require('../models/Visitor'); // <-- include this

mongoose.connect('mongodb://localhost:27017/library_visitors');

const filePath = path.join(__dirname, 'history_visitor_logs_2025-07-30.csv');

const logs = [];

fs.createReadStream(filePath)
  .pipe(csv())
  .on('data', (row) => {
    logs.push(row);
  })
  .on('end', async () => {
    let added = 0;
    for (const entry of logs) {
      const { Name, Class, Purpose } = entry;

      const checkinRaw = `${entry['Check-in Time']} ${entry['Check-out Time'] || ''}`.trim();
      const checkoutRaw = `${entry['Check-in Time']} ${entry['_6'] || ''}`.trim();

      const checkinTime = new Date(checkinRaw);
      const checkoutTime = new Date(checkoutRaw);

      if (isNaN(checkinTime) || isNaN(checkoutTime)) {
        console.warn(`⚠️ Skipping row due to invalid date:`, entry);
        continue;
      }

      // Match student
      const student = await Student.findOne({
        name: Name.trim(),
        class: Class.toString().trim(),
      });

      if (!student) {
        console.log(`❌ No match: ${Name} (${Class})`);
        continue;
      }

      // ✅ Create or reuse Visitor from the matched Student
      const visitor = await Visitor.findOneAndUpdate(
        { barcode: student.barcode },
        {
          name: student.name,
          class: student.class,
          barcode: student.barcode,
        },
        { new: true, upsert: true }
      );

      const log = new Log({
        visitor: visitor._id, // ✅ links to Visitor, not Student
        purpose: Purpose || '-',
        checkinTime,
        checkoutTime,
      });

      await log.save();
      console.log(`✅ Saved log for ${Name} (${Class})`);
      added++;
    }

    console.log(`\n✅ Imported ${added} logs`);
    mongoose.disconnect();
  });
