const express = require('express');
const router = express.Router();
const hodController = require('../controllers/hod.controller');
const { authenticate, authorizeHOD } = require('../middleware/auth.middleware');
const { 
  validateHODRegistration, 
  validateOTP, 
  validateLogin 
} = require('../middleware/validation.middleware');

// Public routes
router.post('/register', validateHODRegistration, hodController.registerHOD);
router.post('/verify-otp', validateOTP, hodController.verifyOTPHandler);
router.post('/resend-otp', hodController.resendOTP);
router.post('/login', validateLogin, hodController.loginHOD);

// Protected routes
router.get('/profile', authenticate, authorizeHOD, hodController.getHODProfile);

module.exports = router;
