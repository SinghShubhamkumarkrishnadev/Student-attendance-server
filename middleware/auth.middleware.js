const { verifyToken } = require('../config/jwt.config');
const HOD = require('../models/hod.model');
const Professor = require('../models/professor.model');
const { errorResponse } = require('../utils/response.utils');

/**
 * Middleware to authenticate users with JWT
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'No token provided, authorization denied', 401);
    }
    
    // Extract token
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return errorResponse(res, 'No token provided, authorization denied', 401);
    }
    
    // Verify token
    const decoded = verifyToken(token);
    
    // Add user info to request
    req.user = decoded;
    
    next();
  } catch (error) {
    console.error('Authentication Error:', error.message);
    return errorResponse(res, 'Token is invalid or expired', 401);
  }
};

/**
 * Middleware to authorize HOD access
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authorizeHOD = async (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return errorResponse(res, 'Authentication required', 401);
    }
    
    // Check if user is HOD
    if (req.user.role !== 'hod') {
      return errorResponse(res, 'Access denied. HOD authorization required', 403);
    }
    
    // Verify HOD exists in database
    const hod = await HOD.findById(req.user.id);
    if (!hod) {
      return errorResponse(res, 'HOD not found', 404);
    }
    
    // Check if HOD is verified
    if (!hod.verified) {
      return errorResponse(res, 'Email verification required', 403);
    }
    
    next();
  } catch (error) {
    console.error('HOD Authorization Error:', error.message);
    return errorResponse(res, 'Authorization failed', 500);
  }
};

/**
 * Middleware to authorize Professor access
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authorizeProfessor = async (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return errorResponse(res, 'Authentication required', 401);
    }
    
    // Check if user is Professor
    if (req.user.role !== 'professor') {
      return errorResponse(res, 'Access denied. Professor authorization required', 403);
    }
    
    // Verify Professor exists in database
    const professor = await Professor.findById(req.user.id);
    if (!professor) {
      return errorResponse(res, 'Professor not found', 404);
    }
    
    next();
  } catch (error) {
    console.error('Professor Authorization Error:', error.message);
    return errorResponse(res, 'Authorization failed', 500);
  }
};

module.exports = {
  authenticate,
  authorizeHOD,
  authorizeProfessor
};
