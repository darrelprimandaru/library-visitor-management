const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const Log = require('../models/Log');
const Student = require('../models/Student');

mongoose.connect('mongodb://localhost:27017/library_visitors');

const filePath = path.join(__dirname, 'history_visitor_logs_2025-07-30.csv');

const logsFromCSV = [];

fs.createReadStream(filePath)
  .pipe(csv())
  .on('data', row => logsFromCSV.push(row))
  .on('end', async () => {
    const brokenLogs = await Log.aggregate([
      {
        $lookup: {
          from: 'students',
          localField: 'visitor',
          foreignField: '_id',
          as: 'studentData',
        }
      },
      { $match: { studentData: { $size: 0 } } }
    ]);

    console.log(`Found ${brokenLogs.length} logs with broken references.`);

    let fixed = 0;

    for (const brokenLog of brokenLogs) {
      // Find matching row from CSV by check-in date and time
      const original = logsFromCSV.find(row => {
        const checkInCSV = new Date(`${row['Check-in Time']} ${row['Check-out Time'] || ''}`).toISOString();
        const checkInLog = new Date(brokenLog.checkinTime).toISOString();
        return checkInCSV === checkInLog;
      });

      if (!original) {
        console.warn(`⚠️ No CSV match for log ${brokenLog._id}`);
        continue;
      }

      const name = original.Name?.trim();
      const studentClass = original.Class?.trim();

      if (!name || !studentClass) {
        console.warn(`⚠️ Missing name or class in CSV for log ${brokenLog._id}`);
        continue;
      }

      const student = await Student.findOne({ name, class: studentClass });

      if (!student) {
        console.warn(`❌ No matching student for ${name} (${studentClass})`);
        continue;
      }

      await Log.updateOne({ _id: brokenLog._id }, { visitor: student._id });
      console.log(`✅ Remapped log ${brokenLog._id} to ${name} (${studentClass})`);
      fixed++;
    }

    console.log(`\n🎉 Remapped ${fixed} broken logs using CSV`);
    mongoose.disconnect();
  });
