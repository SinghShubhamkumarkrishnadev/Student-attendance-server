const express = require('express');
const router = express.Router();
const classController = require('../controllers/class.controller');
const { authenticate, authorizeHOD } = require('../middleware/auth.middleware');

// All routes require HOD authentication
router.use(authenticate, authorizeHOD);

// Create a new class
router.post('/', classController.createClass);

// Get all classes
router.get('/', classController.getClasses);

// Get class by ID
router.get('/:id', classController.getClassById);

// Update class
router.put('/:id', classController.updateClass);

// Delete class
router.delete('/:id', classController.deleteClass);

// Assign students to class
router.post('/:id/students', classController.assignStudentsToClass);

// Remove students from class
router.delete('/:id/students', classController.removeStudentsFromClass);

// Assign professors to class
router.post('/:id/professors', classController.assignProfessorsToClass);

// Remove professors from class
router.delete('/:id/professors', classController.removeProfessorsFromClass);

module.exports = router;
