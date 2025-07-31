const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const Student = require('../models/Student');

mongoose.connect('mongodb://localhost:27017/library_visitors');

async function importStudents() {
  const students = [];

  fs.createReadStream('student_list.csv')
    .pipe(csv())
    .on('data', (row) => {
      const barcode = row['Barcode'].toString().padStart(5, '0');
      students.push({
        barcode,
        name: row['Name'],
        class: row['Class'].toString(),
      });
    })
    .on('end', async () => {
      try {
        await Student.deleteMany({});
        await Student.insertMany(students);
        console.log(`✅ Imported ${students.length} students`);
      } catch (err) {
        console.error('Failed to import students:', err);
      } finally {
        mongoose.disconnect();
      }
    });
}

importStudents();
