const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  enrollmentNumber: {
    type: String,
    required: [true, 'Enrollment number is required'],
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Student name is required'],
    trim: true
  },
  semester: {
    type: Number,
    required: [true, 'Semester is required'],
    min: [1, 'Semester must be at least 1']
  },
  division: {
    type: String,
    trim: true,
    default: null
  },  
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HOD',
    required: true
  }
}, { timestamps: true });

// Index for faster queries
studentSchema.index({ enrollmentNumber: 1 });
studentSchema.index({ classId: 1 });

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
