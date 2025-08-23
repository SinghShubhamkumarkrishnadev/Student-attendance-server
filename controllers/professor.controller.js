const Professor = require('../models/professor.model');
const Class = require('../models/class.model');
const { generateToken } = require('../config/jwt.config');
const { successResponse, errorResponse } = require('../utils/response.utils');

/**
 * @desc    Add a new professor
 * @route   POST /api/professors
 * @access  Private (HOD only)
 */
const addProfessor = async (req, res) => {
  try {
    const { name, username, password } = req.body;
    const hodId = req.user.id;

    // Check if professor with username already exists
    const professorExists = await Professor.findOne({ username });
    if (professorExists) {
      return errorResponse(res, 'Username already taken', 400);
    }

    // Create new professor
    const professor = await Professor.create({
      name,
      username,
      password,
      createdBy: hodId
    });

    return successResponse(res, {
      message: 'Professor added successfully',
      professor: {
        id: professor._id,
        name: professor.name,
        username: professor.username
      }
    }, 201);

  } catch (error) {
    return errorResponse(res, 'Server error while adding professor', 500);
  }
};

/**
 * @desc    Get all professors
 * @route   GET /api/professors
 * @access  Private (HOD only)
 */
const getProfessors = async (req, res) => {
  try {
    const hodId = req.user.id;

    // Include classes field too
    const professors = await Professor.find({ createdBy: hodId })
      .select('-password') // only exclude password, keep classes
      .sort({ createdAt: -1 });

    return successResponse(res, { professors });
  } catch (error) {
    return errorResponse(res, 'Server error while fetching professors', 500);
  }
};


/**
 * @desc    Get professor by ID
 * @route   GET /api/professors/:id
 * @access  Private (HOD only)
 */
const getProfessorById = async (req, res) => {
  try {
    const professorId = req.params.id;
    const hodId = req.user.id;

    // Find professor by ID and created by this HOD
    const professor = await Professor.findOne({
      _id: professorId,
      createdBy: hodId
    }).select('-password');

    if (!professor) {
      return errorResponse(res, 'Professor not found', 404);
    }

    return successResponse(res, { professor });

  } catch (error) {
    return errorResponse(res, 'Server error while fetching professor', 500);
  }
};

/**
 * @desc    Update professor
 * @route   PUT /api/professors/:id
 * @access  Private (HOD only)
 */
const updateProfessor = async (req, res) => {
  try {
    const professorId = req.params.id;
    const hodId = req.user.id;
    const { name, username, password } = req.body;

    // Find professor by ID and created by this HOD
    let professor = await Professor.findOne({
      _id: professorId,
      createdBy: hodId
    });

    if (!professor) {
      return errorResponse(res, 'Professor not found', 404);
    }

    // Check if username is being changed and already exists
    if (username && username !== professor.username) {
      const usernameExists = await Professor.findOne({ username });
      if (usernameExists) {
        return errorResponse(res, 'Username already taken', 400);
      }
    }

    // Update professor fields
    if (name) professor.name = name;
    if (username) professor.username = username;
    if (password) professor.password = password;

    // Save updated professor
    await professor.save();

    return successResponse(res, {
      message: 'Professor updated successfully',
      professor: {
        id: professor._id,
        name: professor.name,
        username: professor.username
      }
    });

  } catch (error) {
    return errorResponse(res, 'Server error while updating professor', 500);
  }
};

/**
 * @desc    Delete professor
 * @route   DELETE /api/professors/:id
 * @access  Private (HOD only)
 */
const deleteProfessor = async (req, res) => {
  try {
    const professorId = req.params.id;
    const hodId = req.user.id;

    // Find professor by ID and created by this HOD
    const professor = await Professor.findOne({
      _id: professorId,
      createdBy: hodId
    });

    if (!professor) {
      return errorResponse(res, 'Professor not found', 404);
    }

    // Remove professor from all classes
    await Class.updateMany(
      { professors: professorId },
      { $pull: { professors: professorId } }
    );

    // Delete professor
    await professor.deleteOne();

    return successResponse(res, {
      message: 'Professor deleted successfully'
    });

  } catch (error) {
    return errorResponse(res, 'Server error while deleting professor', 500);
  }
};

/**
 * @desc    Professor login
 * @route   POST /api/professors/login
 * @access  Public
 */
const loginProfessor = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find professor by username
    const professor = await Professor.findOne({ username });
    if (!professor) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    // Check password
    const isMatch = await professor.comparePassword(password);
    if (!isMatch) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    // Generate token
    const token = generateToken({
      id: professor._id,
      role: 'professor'
    });

    return successResponse(res, {
      message: 'Login successful',
      token,
      professor: {
        id: professor._id,
        name: professor.name,
        username: professor.username
      }
    });

  } catch (error) {
    return errorResponse(res, 'Server error during login', 500);
  }
};

/**
 * @desc    Get professor's assigned classes
 * @route   GET /api/professors/classes
 * @access  Private (Professor only)
 */
const getProfessorClasses = async (req, res) => {
  try {
    const professorId = req.user.id;

    // Find professor to get assigned classes
    const professor = await Professor.findById(professorId);
    if (!professor) {
      return errorResponse(res, 'Professor not found', 404);
    }

    // Find all classes assigned to this professor with students
    const classes = await Class.find({
      professors: professorId
    }).populate('students', 'enrollmentNumber name');

    // Format response
    const formattedClasses = classes.map(cls => ({
      classId: cls.classId,
      className: cls.className,
      division: cls.division,
      students: cls.students.map(student => ({
        id: student._id,
        enrollment: student.enrollmentNumber,
        name: student.name
      }))
    }));

    return successResponse(res, { classes: formattedClasses });

  } catch (error) {
    return errorResponse(res, 'Server error while fetching classes', 500);
  }
};

module.exports = {
  addProfessor,
  getProfessors,
  getProfessorById,
  updateProfessor,
  deleteProfessor,
  loginProfessor,
  getProfessorClasses
};
