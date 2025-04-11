const Class = require('../models/class.model');
const Student = require('../models/student.model');
const Professor = require('../models/professor.model');
const { successResponse, errorResponse } = require('../utils/response.utils');

/**
 * @desc    Create a new class
 * @route   POST /api/classes
 * @access  Private (HOD only)
 */
const createClass = async (req, res) => {
  try {
    const { classId, className, division } = req.body;
    const hodId = req.user.id;

    // Check if class with classId already exists
    const classExists = await Class.findOne({ 
      classId,
      createdBy: hodId 
    });
    
    if (classExists) {
      return errorResponse(res, 'Class with this ID already exists', 400);
    }

    // Create new class
    const newClass = await Class.create({
      classId,
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
    console.error('Create Class Error:', error);
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

    // Find all classes created by this HOD
    const classes = await Class.find({ createdBy: hodId })
      .sort({ className: 1, division: 1 });

    return successResponse(res, { classes });

  } catch (error) {
    console.error('Get Classes Error:', error);
    return errorResponse(res, 'Server error while fetching classes', 500);
  }
};

/**
 * @desc    Get class by ID
 * @route   GET /api/classes/:id
 * @access  Private (HOD only)
 */
const getClassById = async (req, res) => {
  try {
    const classId = req.params.id;
    const hodId = req.user.id;

    // Find class by ID and created by this HOD
    const classData = await Class.findOne({
      classId,
      createdBy: hodId
    })
      .populate('students', 'enrollmentNumber name semester')
      .populate('professors', 'name username');

    if (!classData) {
      return errorResponse(res, 'Class not found', 404);
    }

    return successResponse(res, { class: classData });

  } catch (error) {
    console.error('Get Class By ID Error:', error);
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
    const classId = req.params.id;
    const hodId = req.user.id;
    const { className, division } = req.body;

    // Find class by ID and created by this HOD
    let classData = await Class.findOne({
      classId,
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
    console.error('Update Class Error:', error);
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
    const classId = req.params.id;
    const hodId = req.user.id;

    // Find class by ID and created by this HOD
    const classData = await Class.findOne({
      classId,
      createdBy: hodId
    });

    if (!classData) {
      return errorResponse(res, 'Class not found', 404);
    }

    // Update all students to remove class assignment
    await Student.updateMany(
      { classId: classData.classId },
      { $set: { classId: null } }
    );

    // Update all professors to remove class from their classes array
    await Professor.updateMany(
      { classes: classData.classId },
      { $pull: { classes: classData.classId } }
    );

    // Delete class
    await classData.remove();

    return successResponse(res, {
      message: 'Class deleted successfully'
    });

  } catch (error) {
    console.error('Delete Class Error:', error);
    return errorResponse(res, 'Server error while deleting class', 500);
  }
};

/**
 * @desc    Assign students to class
 * @route   POST /api/classes/:id/students
 * @access  Private (HOD only)
 */
const assignStudentsToClass = async (req, res) => {
  try {
    const classId = req.params.id;
    const hodId = req.user.id;
    const { studentIds } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return errorResponse(res, 'Please provide an array of student IDs', 400);
    }

    // Find class by ID and created by this HOD
    const classData = await Class.findOne({
      classId,
      createdBy: hodId
    });

    if (!classData) {
      return errorResponse(res, 'Class not found', 404);
    }

    // Verify all students exist and belong to this HOD
    const students = await Student.find({
      _id: { $in: studentIds },
      createdBy: hodId
    });

    if (students.length !== studentIds.length) {
      return errorResponse(res, 'One or more students not found', 404);
    }

    // Update students to assign them to this class
    await Student.updateMany(
      { _id: { $in: studentIds } },
      { $set: { classId: classData.classId } }
    );

    // Update class to include these students
    classData.students = [...new Set([...classData.students, ...studentIds])];
    await classData.save();

    return successResponse(res, {
      message: `${studentIds.length} students assigned to class successfully`
    });

  } catch (error) {
    console.error('Assign Students to Class Error:', error);
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

    // Find class by ID and created by this HOD
    const classData = await Class.findOne({
      classId,
      createdBy: hodId
    });

    if (!classData) {
      return errorResponse(res, 'Class not found', 404);
    }

    // Update students to remove class assignment
    await Student.updateMany(
      { 
        _id: { $in: studentIds },
        classId: classData.classId
      },
      { $set: { classId: null } }
    );

    // Update class to remove these students
    classData.students = classData.students.filter(
      student => !studentIds.includes(student.toString())
    );
    await classData.save();

    return successResponse(res, {
      message: `Students removed from class successfully`
    });

  } catch (error) {
    console.error('Remove Students from Class Error:', error);
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

    // Find class by ID and created by this HOD
    const classData = await Class.findOne({
      classId,
      createdBy: hodId
    });

    if (!classData) {
      return errorResponse(res, 'Class not found', 404);
    }

    // Verify all professors exist and belong to this HOD
    const professors = await Professor.find({
      _id: { $in: professorIds },
      createdBy: hodId
    });

    if (professors.length !== professorIds.length) {
      return errorResponse(res, 'One or more professors not found', 404);
    }

    // Update professors to add this class to their classes array
    await Professor.updateMany(
      { _id: { $in: professorIds } },
      { $addToSet: { classes: classData.classId } }
    );

    // Update class to include these professors
    classData.professors = [...new Set([...classData.professors, ...professorIds])];
    await classData.save();

    return successResponse(res, {
      message: `${professorIds.length} professors assigned to class successfully`
    });

  } catch (error) {
    console.error('Assign Professors to Class Error:', error);
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

    // Find class by ID and created by this HOD
    const classData = await Class.findOne({
      classId,
      createdBy: hodId
    });

    if (!classData) {
      return errorResponse(res, 'Class not found', 404);
    }

    // Update professors to remove this class from their classes array
    await Professor.updateMany(
      { _id: { $in: professorIds } },
      { $pull: { classes: classData.classId } }
    );

    // Update class to remove these professors
    classData.professors = classData.professors.filter(
      professor => !professorIds.includes(professor.toString())
    );
    await classData.save();

    return successResponse(res, {
      message: `Professors removed from class successfully`
    });

  } catch (error) {
    console.error('Remove Professors from Class Error:', error);
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
