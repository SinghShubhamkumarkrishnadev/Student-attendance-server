const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const hodSchema = new mongoose.Schema({
  collegeName: {
    type: String,
    required: [true, 'College name is required'],
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
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email address'
    ]
  },
  verified: {
    type: Boolean,
    default: false
  },
  otp: {
    code: String,
    expiresAt: Date
  },
  deleteOtp: {
    code: String,
    expiresAt: Date
  },
  pendingUpdates: {
    email: String,
    password: String
  }
}, { timestamps: true });

// ================== PASSWORD HASH ==================
hodSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ================== CASCADE DELETE ==================
async function cascadeDelete(hodId) {
  const Professor = mongoose.model("Professor");
  const Student = mongoose.model("Student");
  const ClassModel = mongoose.model("Class");

  const Attendance = mongoose.models.Attendance || null;
  const Subject = mongoose.models.Subject || null;

  await Promise.all([
    Professor.deleteMany({ hod: hodId }),
    Student.deleteMany({ hod: hodId }),
    ClassModel.deleteMany({ hod: hodId }),
    Attendance ? Attendance.deleteMany({ hod: hodId }) : Promise.resolve(),
    Subject ? Subject.deleteMany({ hod: hodId }) : Promise.resolve(),
  ]);
}

hodSchema.pre("findOneAndDelete", async function (next) {
  try {
    const hodId = this.getQuery()["_id"];
    await cascadeDelete(hodId);
    next();
  } catch (err) {
    next(err);
  }
});

hodSchema.pre("remove", async function (next) {
  try {
    await cascadeDelete(this._id);
    next();
  } catch (err) {
    next(err);
  }
});

// ================== METHODS ==================
hodSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const HOD = mongoose.model('HOD', hodSchema);
module.exports = HOD;
