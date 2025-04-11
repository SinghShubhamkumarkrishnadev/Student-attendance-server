const Student = require('../models/student.model');
const Class = require('../models/class.model');
const { parseExcel } = require('../utils/excel.utils');
const { successResponse, errorResponse } = require('../utils/response.utils');

/**
 * @desc    Bulk upload students from Excel
 * @route   POST /api/students/bulk-upload
 * @access  Private (HOD only)
 */
const bulkUploadStudents = async (req, res) => {
  try {
    // Check if file exists
    if (!req.file) {
      return errorResponse(res, 'Please upload an Excel file', 400);
    }

    const hodId = req.user.id;
    const filePath = req.file.path;

    // Parse Excel file
    const students = await parseExcel(filePath);
    
    if (!students || students.length === 0) {
      return errorResponse(res, 'No valid student data found in the Excel file', 400);
    }

    // Validate student data
    const invalidStudents = students.filter(
      student => !student.enrollmentNumber || !student.name || !student.semester
    );

    if (invalidStudents.length > 0) {
      return errorResponse(res, 'Some student records are missing required fields', 400);
    }

    // Check for duplicate enrollment numbers in the database
    const existingEnrollments = await Student.find({
      enrollmentNumber: { $in: students.map(s => s.enrollmentNumber) }
    }).select('enrollmentNumber');

    const existingEnrollmentSet = new Set(existingEnrollments.map(s => s.enrollmentNumber));

    // Filter out students that already exist
    const newStudents = students.filter(s => !existingEnrollmentSet.has(s.enrollmentNumber));

    if (newStudents.length === 0) {
      return errorResponse(res, 'All students in the file already exist in the database', 400);
    }

    // Add createdBy field to each student
    const studentsToInsert = newStudents.map(student => ({
      ...student,
      createdBy: hodId
    }));

    // Insert students in bulk
    const insertedStudents = await Student.insertMany(studentsToInsert);

    return successResponse(res, {
      message: `${insertedStudents.length} students uploaded successfully`,
      totalUploaded: insertedStudents.length,
      totalSkipped: students.length - newStudents.length
    }, 201);

  } catch (error) {
    console.error('Bulk Upload Students Error:', error);
    return errorResponse(res, 'Server error during bulk upload', 500);
  }
};

/**
 * @desc    Get all students
 * @route   GET /api/students
 * @access  Private (HOD only)
 */
const getStudents = async (req, res) => {
  try {
    const hodId = req.user.id;
    const { semester, classId } = req.query;

    // Build query
    const query = { createdBy: hodId };
    
    if (semester) {
      query.semester = semester;
    }
    
    if (classId) {
      query.classId = classId;
    }

    // Find students with optional filters
    const students = await Student.find(query)
      .sort({ enrollmentNumber: 1 });

    return successResponse(res, { students });

  } catch (error) {
    console.error('Get Students Error:', error);
    return errorResponse(res, 'Server error while fetching students', 500);
  }
};

/**
 * @desc    Get student by ID
 * @route   GET /api/students/:id
 * @access  Private (HOD only)
 */
const getStudentById = async (req, res) => {
  try {
    const studentId = req.params.id;
    const hodId = req.user.id;

    // Find student by ID and created by this HOD
    const student = await Student.findOne({
      _id: studentId,
      createdBy: hodId
    });

    if (!student) {
      return errorResponse(res, 'Student not found', 404);
    }

    return successResponse(res, { student });

  } catch (error) {
    console.error('Get Student By ID Error:', error);
    return errorResponse(res, 'Server error while fetching student', 500);
  }
};

/**
 * @desc    Update student
 * @route   PUT /api/students/:id
 * @access  Private (HOD only)
 */
const updateStudent = async (req, res) => {
  try {
    const studentId = req.params.id;
    const hodId = req.user.id;
    const { name, semester, classId } = req.body;

    // Find student by ID and created by this HOD
    let student = await Student.findOne({
      _id: studentId,
      createdBy: hodId
    });

    if (!student) {
      return errorResponse(res, 'Student not found', 404);
    }

    // If changing class, check if class exists
    if (classId && classId !== student.classId) {
      const classExists = await Class.findOne({ 
        classId, 
        createdBy: hodId 
      });
      
      if (!classExists) {
        return errorResponse(res, 'Class not found', 404);
      }

      // If student already has a class, remove from old class
      if (student.classId) {
        await Class.updateOne(
          { classId: student.classId },
          { $pull: { students: studentId } }
        );
      }

      // Add to new class
      await Class.updateOne(
        { classId },
        { $addToSet: { students: studentId } }
      );
    }

    // Update student fields
    if (name) student.name = name;
    if (semester) student.semester = semester;
    if (classId) student.classId = classId;

    // Save updated student
    await student.save();

    return successResponse(res, {
      message: 'Student updated successfully',
      student
    });

  } catch (error) {
    console.error('Update Student Error:', error);
    return errorResponse(res, 'Server error while updating student', 500);
  }
};

/**
 * @desc    Delete student
 * @route   DELETE /api/students/:id
 * @access  Private (HOD only)
 */
const deleteStudent = async (req, res) => {
  try {
    const studentId = req.params.id;
    const hodId = req.user.id;

    // Find student by ID and created by this HOD
    const student = await Student.findOne({
      _id: studentId,
      createdBy: hodId
    });

    if (!student) {
      return errorResponse(res, 'Student not found', 404);
    }

    // If student is assigned to a class, remove from class
    if (student.classId) {
      await Class.updateOne(
        { classId: student.classId },
        { $pull: { students: studentId } }
      );
    }

    // Delete student
    await student.remove();

    return successResponse(res, {
      message: 'Student deleted successfully'
    });

  } catch (error) {
    console.error('Delete Student Error:', error);
    return errorResponse(res, 'Server error while deleting student', 500);
  }
};

module.exports ={
  bulkUploadStudents,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent
}
