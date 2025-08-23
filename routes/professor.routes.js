const express = require('express');
const router = express.Router();
const professorController = require('../controllers/professor.controller');
const { 
  authenticate, 
  authorizeHOD, 
  authorizeProfessor 
} = require('../middleware/auth.middleware');
const { 
  validateProfessor, 
  validateLogin 
} = require('../middleware/validation.middleware');

// Public routes
router.post('/login', validateLogin, professorController.loginProfessor);

// HOD routes for managing professors
router.post(
  '/', 
  authenticate, 
  authorizeHOD, 
  validateProfessor, 
  professorController.addProfessor
);

router.get(
  '/', 
  authenticate, 
  authorizeHOD, 
  professorController.getProfessors
);

router.get(
  '/:id', 
  authenticate, 
  authorizeHOD, 
  professorController.getProfessorById
);

router.put(
  '/:id', 
  authenticate, 
  authorizeHOD, 
  professorController.updateProfessor
);

router.delete(
  '/:id', 
  authenticate, 
  authorizeHOD, 
  professorController.deleteProfessor
);

// Professor routes
router.get(
  '/classes', 
  authenticate, 
  authorizeProfessor, 
  professorController.getProfessorClasses
);

module.exports = router;
