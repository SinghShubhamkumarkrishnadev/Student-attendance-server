const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  classId: {
    type: String,
    required: [true, 'Class ID is required'],
    unique: true,
    trim: true
  },
  className: {
    type: String,
    required: [true, 'Class name is required'],
    trim: true
  },
  division: {
    type: String,
    required: [true, 'Division is required'],
    trim: true
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  professors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Professor'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HOD',
    required: true
  }
}, { timestamps: true });

// Compound index for faster queries
classSchema.index({ className: 1, division: 1 });

const Class = mongoose.model('Class', classSchema);

module.exports = Class;
