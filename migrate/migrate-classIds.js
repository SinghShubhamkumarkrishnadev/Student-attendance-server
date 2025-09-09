const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('../config/db.config');
const Student = require('../models/student.model');
const Class = require('../models/class.model');

// Load environment variables
dotenv.config();

const migrateClassIds = async () => {
  try {
    await connectDB();

    console.log('Starting migration: Adding classId to classIds array...');

    // Find all students with a classId set and classIds empty or missing
    const students = await Student.find({
      classId: { $exists: true, $ne: null },
      $or: [
        { classIds: { $exists: false } },
        { classIds: { $size: 0 } }
      ]
    });

    console.log(`Found ${students.length} students to migrate.`);

    for (const student of students) {
      const classId = student.classId;

      if (!classId) continue;

      // Make sure the class exists
      const cls = await Class.findById(classId);
      if (!cls) {
        console.warn(`Class not found for student ${student._id}`);
        continue;
      }

      // Update the student's classIds array
      student.classIds = [classId];
      student.classId = undefined; // optional: remove old field
      await student.save();

      console.log(`Migrated student ${student._id}`);
    }

    console.log('Migration completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrateClassIds();
