const express = require('express');
const router = express.Router();
const studentController = require('../controllers/student.controller');
const { authenticate, authorizeHOD } = require('../middleware/auth.middleware');
const { handleExcelUpload } = require('../middleware/upload.middleware');

// All routes require HOD authentication
router.use(authenticate, authorizeHOD);

// Bulk upload students from Excel
router.post(
  '/bulk-upload', 
  handleExcelUpload, 
  studentController.bulkUploadStudents
);

// Get all students with optional filters
router.get('/', studentController.getStudents);

// Get student by ID
router.get('/:id', studentController.getStudentById);

// Update student
router.put('/:id', studentController.updateStudent);

// Delete student
router.delete('/:id', studentController.deleteStudent);

// Bulk delete students
router.delete('/', studentController.deleteStudentsBulk);

module.exports = router;
