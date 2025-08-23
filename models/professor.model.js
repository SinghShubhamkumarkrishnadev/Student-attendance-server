const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const professorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Professor name is required'],
    trim: true
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  classes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HOD',
    required: true
  }
}, { timestamps: true });

// Hash password before saving
professorSchema.pre('save', async function(next) {
  // Only hash the password if it's modified (or new)
  if (!this.isModified('password')) return next();
  
  try {
    // Generate salt
    const salt = await bcrypt.genSalt(10);
    // Hash password
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
professorSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const Professor = mongoose.model('Professor', professorSchema);

module.exports = Professor;
