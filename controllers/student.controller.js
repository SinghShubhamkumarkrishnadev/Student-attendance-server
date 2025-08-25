// controllers/student.controller.js
const mongoose = require('mongoose');
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
    if (!req.file) {
      return errorResponse(res, 'Please upload an Excel file', 400);
    }

    const hodId = req.user.id;
    const filePath = req.file.path;

    // Parse Excel file
    const students = await parseExcel(filePath);
    if (Array.isArray(students)) console.log('[bulkUploadStudents] sample:', students.slice(0, 5));

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
      // note: classId is intentionally not set via Excel upload; assign via API
    }));

    // Insert students in bulk
    const insertedStudents = await Student.insertMany(studentsToInsert);

    return successResponse(res, {
      message: `${insertedStudents.length} students uploaded successfully`,
      totalUploaded: insertedStudents.length,
      totalSkipped: students.length - newStudents.length
    }, 201);

  } catch (error) {
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
    let { semester, classId } = req.query;

    // Build query
    const query = { createdBy: hodId };

    if (semester) {
      // accept either string or number
      const semNum = Number(semester);
      if (!Number.isNaN(semNum)) query.semester = semNum;
    }

    if (classId) {
      // If client passed a Class _id (ObjectId), filter by student.classId
      if (mongoose.Types.ObjectId.isValid(classId)) {
        query.classId = classId;
      } else {
        // otherwise treat classId as human class code (e.g., "CS101") and attempt to resolve to _id
        const cls = await Class.findOne({ classId: classId, createdBy: hodId }).select('_id');
        if (cls) {
          query.classId = cls._id;
        } else {
          // no class found for this human code — return empty result set quickly
          return successResponse(res, { students: [] });
        }
      }
    }

    // Find students with optional filters
    const students = await Student.find(query).sort({ enrollmentNumber: 1 });

    return successResponse(res, { students });

  } catch (error) {
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
    return errorResponse(res, 'Server error while fetching student', 500);
  }
};

/**
 * @desc    Update student
 * @route   PUT /api/students/:id
 * @access  Private (HOD only)
 *
 * Note: `classId` in request body can be either:
 *  - a Class._id (ObjectId string), or
 *  - a human class code (e.g., "CS101") — this will be resolved to Class._id
 */
const updateStudent = async (req, res) => {
  try {
    const studentId = req.params.id;
    const hodId = req.user.id;
    let { name, semester, classId, division } = req.body;

    // Find student by ID and created by this HOD
    let student = await Student.findOne({
      _id: studentId,
      createdBy: hodId
    });

    if (!student) {
      return errorResponse(res, 'Student not found', 404);
    }

    // If changing class, ensure we resolve classId to Class._id and update classes arrays accordingly
    if (classId) {
      let newClassId = null;

      // If classId looks like an ObjectId, try to find by _id
      if (mongoose.Types.ObjectId.isValid(classId)) {
        const cls = await Class.findOne({ _id: classId, createdBy: hodId }).select('_id');
        if (!cls) {
          return errorResponse(res, 'Class not found', 404);
        }
        newClassId = cls._id;
      } else {
        // treat as human class code
        const cls = await Class.findOne({ classId: classId, createdBy: hodId }).select('_id');
        if (!cls) {
          return errorResponse(res, 'Class not found', 404);
        }
        newClassId = cls._id;
      }

      // If newClassId is same as current student.classId → no class-change
      if (!student.classId || String(newClassId) !== String(student.classId)) {
        // Remove from old class (if existed) by matching Class _id
        if (student.classId) {
          await Class.updateOne(
            { _id: student.classId },
            { $pull: { students: studentId } }
          );
        }

        // Add to new class
        await Class.updateOne(
          { _id: newClassId },
          { $addToSet: { students: studentId } }
        );

        // set student's classId to the Class _id
        student.classId = newClassId;
      }
    }

    // Update student fields
    if (name) student.name = name;
    if (semester) {
      const semNum = Number(semester);
      if (!Number.isNaN(semNum)) student.semester = semNum;
    }
    if (division !== undefined) student.division = division;

    // Save updated student
    await student.save();

    return successResponse(res, {
      message: 'Student updated successfully',
      student
    });

  } catch (error) {
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

    // If student is assigned to a class (student.classId is an ObjectId), remove from that Class.students
    if (student.classId) {
      await Class.updateOne(
        { _id: student.classId },
        { $pull: { students: studentId } }
      );
    }

    // Delete student
    await student.deleteOne();

    return successResponse(res, {
      message: 'Student deleted successfully'
    });

  } catch (error) {
    return errorResponse(res, 'Server error while deleting student', 500);
  }
};

/**
 * @desc    Bulk delete students
 * @route   DELETE /api/students
 * @access  Private (HOD only)
 * @body    { studentIds: [ "id1", "id2", ... ] }
 */
const deleteStudentsBulk = async (req, res) => {
  try {
    const { studentIds } = req.body;
    const hodId = req.user.id;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return errorResponse(res, "No studentIds provided", 400);
    }

    // Find students belonging to this HOD
    const students = await Student.find({
      _id: { $in: studentIds },
      createdBy: hodId
    });

    if (students.length === 0) {
      return errorResponse(res, "No students found for deletion", 404);
    }

    // Remove student refs from their classes
    const classUpdates = students
      .filter(s => s.classId)
      .map(s =>
        Class.updateOne({ _id: s.classId }, { $pull: { students: s._id } })
      );

    await Promise.all(classUpdates);

    // Delete students in one go
    const result = await Student.deleteMany({
      _id: { $in: studentIds },
      createdBy: hodId
    });

    return successResponse(res, {
      message: `${result.deletedCount} students deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error("[deleteStudentsBulk]", error);
    return errorResponse(res, "Server error while bulk deleting students", 500);
  }
};

module.exports = {
  bulkUploadStudents,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  deleteStudentsBulk   
};
