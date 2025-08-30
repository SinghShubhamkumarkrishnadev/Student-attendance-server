// routes/attendance.routes.js
const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');
const { authenticate, authorizeProfessor, authorizeProfessorOrHod } = require('../middleware/auth.middleware');

// Write attendance → professors only
router.post('/bulk', authenticate, authorizeProfessor, attendanceController.markBulkAttendance);

// Read attendance → professors or hods
router.get('/:classId', authenticate, authorizeProfessorOrHod, attendanceController.getAttendanceByDate);
router.get('/summary/:classId', authenticate, authorizeProfessorOrHod, attendanceController.getMonthlySummary);
router.get('/class/:classId', authenticate, authorizeProfessorOrHod, attendanceController.getClassAttendance);
router.get('/student/:studentId', authenticate, authorizeProfessorOrHod, attendanceController.getStudentAttendance);

module.exports = router;
