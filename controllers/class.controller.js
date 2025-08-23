const Class = require('../models/class.model');
const Student = require('../models/student.model');
const Professor = require('../models/professor.model');
const Counter = require('../models/counter.model'); // <-- ADD THIS LINE
const { successResponse, errorResponse } = require('../utils/response.utils');
const mongoose = require('mongoose');

/**
 * @desc    Create a new class
 * @route   POST /api/classes
 * @access  Private (HOD only)
 */
const createClass = async (req, res) => {
  try {
    const { className, division } = req.body;
    const hodId = req.user.id;

    if (!className || !division) {
      return errorResponse(res, 'Class name and division are required', 400);
    }

    // Atomically increment (or create) the counter for this HOD
    const counter = await Counter.findOneAndUpdate(
      { hod: hodId },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const newClassId = counter.seq;

    // Create new class with generated numeric classId
    const newClass = await Class.create({
      classId: newClassId,
      className,
      division,
      students: [],
      professors: [],
      createdBy: hodId
    });

    return successResponse(res, {
      message: 'Class created successfully',
      class: newClass
    }, 201);

  } catch (error) {
    // Handle unlikely duplicate key error gracefully
    if (error && (error.code === 11000 || (error.message && error.message.includes('duplicate')))) {
      return errorResponse(res, 'Duplicate class id generated. Please try again.', 500);
    }

    return errorResponse(res, 'Server error while creating class', 500);
  }
};

/**
 * @desc    Get all classes
 * @route   GET /api/classes
 * @access  Private (HOD only)
 */
const getClasses = async (req, res) => {
  try {
    const hodId = req.user.id;

    const classes = await Class.find({ createdBy: hodId })
      .sort({ className: 1, division: 1 })
      .populate("students", "enrollmentNumber name semester")
      .populate("professors", "name username _id");  // ✅ always populated

    return successResponse(res, { classes });
  } catch (error) {
    return errorResponse(res, "Server error while fetching classes", 500);
  }
};



/**
 * @desc    Get class by ID
 * @route   GET /api/classes/:id
 * @access  Private (HOD only)
 */
const getClassById = async (req, res) => {
  try {
    const _id = req.params.id;
    const hodId = req.user.id;

    // Find class by ID and created by this HOD
    const classData = await Class.findOne({
      _id,
      createdBy: hodId
    })
      .populate('students', 'enrollmentNumber name semester')
      .populate('professors', 'name username');

    if (!classData) {
      return errorResponse(res, 'Class not found', 404);
    }

    return successResponse(res, { class: classData });

  } catch (error) {
    return errorResponse(res, 'Server error while fetching class', 500);
  }
};

/**
 * @desc    Update class
 * @route   PUT /api/classes/:id
 * @access  Private (HOD only)
 */
const updateClass = async (req, res) => {
  try {
    const _id = req.params.id;
    const hodId = req.user.id;
    const { className, division } = req.body;

    // Find class by ID and created by this HOD
    let classData = await Class.findOne({
      _id,
      createdBy: hodId
    });

    if (!classData) {
      return errorResponse(res, 'Class not found', 404);
    }

    // Update class fields
    if (className) classData.className = className;
    if (division) classData.division = division;

    // Save updated class
    await classData.save();

    return successResponse(res, {
      message: 'Class updated successfully',
      class: classData
    });

  } catch (error) {
    return errorResponse(res, 'Server error while updating class', 500);
  }
};

/**
 * @desc    Delete class
 * @route   DELETE /api/classes/:id
 * @access  Private (HOD only)
 */
const deleteClass = async (req, res) => {
  try {
    const _id = req.params.id;
    const hodId = req.user.id;

    // Find class by ID and created by this HOD
    const classData = await Class.findOne({
      _id,
      createdBy: hodId
    });

    if (!classData) {
      return errorResponse(res, 'Class not found', 404);
    }

    // Update all students to remove class assignment
    await Student.updateMany(
      { classId: classData._id },
      { $set: { classId: null } }
    );

    // Update all professors to remove class from their classes array
    await Professor.updateMany(
      { classes: classData._id },
      { $pull: { classes: classData._id } }
    );

    // Delete class
    await classData.deleteOne();

    return successResponse(res, {
      message: 'Class deleted successfully'
    });

  } catch (error) {
    return errorResponse(res, 'Server error while deleting class', 500);
  }
};

/**
 * @desc    Assign students to class
 * @route   POST /api/classes/:id/students
 * @access  Private (HOD only)
 */
// Assign students
const assignStudentsToClass = async (req, res) => {
  try {
    const classId = req.params.id; // class _id
    const hodId = req.user.id;
    const { studentIds } = req.body;


    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return errorResponse(res, 'Please provide an array of student IDs', 400);
    }

    const classData = await Class.findOne({ _id: classId, createdBy: hodId });
    if (!classData) return errorResponse(res, 'Class not found', 404);

    const studentObjectIds = studentIds.map(id => new mongoose.Types.ObjectId(id));

    const studentsFound = await Student.find({
      _id: { $in: studentObjectIds },
      createdBy: hodId
    });


    if (studentsFound.length !== studentIds.length) {
      return errorResponse(res, 'One or more students not found', 404);
    }

    // Add to class.students without duplicates
    await Class.updateOne(
      { _id: classData._id },
      { $addToSet: { students: { $each: studentObjectIds } } }
    );

    // Set student.classId to the Class _id (ObjectId)
    await Student.updateMany(
      { _id: { $in: studentObjectIds } },
      { $set: { classId: classData._id } }
    );

    return successResponse(res, { message: `${studentIds.length} students assigned to class successfully` });
  } catch (error) {
    return errorResponse(res, 'Server error while assigning students', 500);
  }
};


/**
 * @desc    Remove students from class
 * @route   DELETE /api/classes/:id/students
 * @access  Private (HOD only)
 */
const removeStudentsFromClass = async (req, res) => {
  try {
    const classId = req.params.id;
    const hodId = req.user.id;
    const { studentIds } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return errorResponse(res, 'Please provide an array of student IDs', 400);
    }

    const classData = await Class.findOne({ _id: classId, createdBy: hodId });
    if (!classData) return errorResponse(res, 'Class not found', 404);

    const studentObjectIds = studentIds.map(id => new mongoose.Types.ObjectId(id));

    // Remove classId only where it equals this class._id
    const updateRes = await Student.updateMany(
      { _id: { $in: studentObjectIds }, classId: classData._id },
      { $set: { classId: null } }
    );

    // Remove from class.students (compare ObjectIds)
    classData.students = classData.students.filter(
      sId => !studentObjectIds.some(objId => objId.equals(sId))
    );
    await classData.save();

    return successResponse(res, { message: 'Students removed successfully' });
  } catch (error) {
    return errorResponse(res, 'Server error while removing students', 500);
  }
};


/**
 * @desc    Assign professors to class
 * @route   POST /api/classes/:id/professors
 * @access  Private (HOD only)
 */
const assignProfessorsToClass = async (req, res) => {
  try {
    const classId = req.params.id;
    const hodId = req.user.id;
    const { professorIds } = req.body;

    if (!professorIds || !Array.isArray(professorIds) || professorIds.length === 0) {
      return errorResponse(res, 'Please provide an array of professor IDs', 400);
    }

    const classData = await Class.findOne({ _id: classId, createdBy: hodId });
    if (!classData) return errorResponse(res, 'Class not found', 404);

    const profObjectIds = professorIds.map(id => new mongoose.Types.ObjectId(id));

    const professorsFound = await Professor.find({
      _id: { $in: profObjectIds },
      createdBy: hodId
    });

    if (professorsFound.length !== professorIds.length) {
      return errorResponse(res, 'One or more professors not found', 404);
    }

    const existing = classData.professors.map(id => id.toString());
    const merged = Array.from(new Set([...existing, ...professorIds.map(String)]));

    classData.professors = merged.map(id => new mongoose.Types.ObjectId(id));
    await classData.save();

    // Ensure professors reference this class._id
    await Professor.updateMany(
      { _id: { $in: profObjectIds } },
      { $addToSet: { classes: classData._id } }
    );

    return successResponse(res, { message: `${professorIds.length} professors assigned to class successfully` });
  } catch (error) {
    return errorResponse(res, 'Server error while assigning professors', 500);
  }
};


/**
 * @desc    Remove professors from class
 * @route   DELETE /api/classes/:id/professors
 * @access  Private (HOD only)
 */
const removeProfessorsFromClass = async (req, res) => {
  try {
    const classId = req.params.id;
    const hodId = req.user.id;
    const { professorIds } = req.body;

    if (!professorIds || !Array.isArray(professorIds) || professorIds.length === 0) {
      return errorResponse(res, 'Please provide an array of professor IDs', 400);
    }

    const classData = await Class.findOne({ _id: classId, createdBy: hodId });
    if (!classData) return errorResponse(res, 'Class not found', 404);

    const objectIds = professorIds.map(id => new mongoose.Types.ObjectId(id));

    // Pull class _id from professors' classes array
    await Professor.updateMany(
      { _id: { $in: objectIds } },
      { $pull: { classes: classData._id } }
    );

    // Remove from classData.professors (ObjectId compare)
    classData.professors = classData.professors.filter(
      profId => !objectIds.some(objId => objId.equals(profId))
    );
    await classData.save();

    return successResponse(res, { message: `Professors removed from class successfully` });
  } catch (error) {
    return errorResponse(res, 'Server error while removing professors', 500);
  }
};




module.exports = {
  createClass,
  getClasses,
  getClassById,
  updateClass,
  deleteClass,
  assignStudentsToClass,
  removeStudentsFromClass,
  assignProfessorsToClass,
  removeProfessorsFromClass
};
