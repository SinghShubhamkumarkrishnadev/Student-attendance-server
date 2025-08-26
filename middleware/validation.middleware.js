const { errorResponse } = require('../utils/response.utils');

/**
 * Validate HOD registration data
 */
const validateHODRegistration = (req, res, next) => {
  const { collegeName, username, password, email } = req.body;

  if (!collegeName || !username || !password || !email) {
    return errorResponse(res, 'All fields are required', 400);
  }

  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  if (!emailRegex.test(email)) {
    return errorResponse(res, 'Please provide a valid email address', 400);
  }

  if (username.length < 3) {
    return errorResponse(res, 'Username must be at least 3 characters long', 400);
  }

  if (password.length < 6) {
    return errorResponse(res, 'Password must be at least 6 characters long', 400);
  }

  next();
};

/**
 * Validate email + OTP (for registration email verify)
 */
const validateOTP = (req, res, next) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return errorResponse(res, 'Email and OTP are required', 400);
  }

  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  if (!emailRegex.test(email)) {
    return errorResponse(res, 'Please provide a valid email address', 400);
  }

  const otpRegex = /^\d{6}$/;
  if (!otpRegex.test(otp)) {
    return errorResponse(res, 'OTP must be 6 digits', 400);
  }

  next();
};

/**
 * Validate only OTP in body (for update verify + delete confirm)
 */
const validateOTPOnly = (req, res, next) => {
  const { otp } = req.body;

  if (!otp) {
    return errorResponse(res, 'OTP is required', 400);
  }

  const otpRegex = /^\d{6}$/;
  if (!otpRegex.test(otp)) {
    return errorResponse(res, 'OTP must be 6 digits', 400);
  }

  next();
};

/**
 * Validate login data
 */
const validateLogin = (req, res, next) => {
  const username =
    req.body && typeof req.body.username !== 'undefined'
      ? String(req.body.username).trim()
      : '';
  const password =
    req.body && typeof req.body.password !== 'undefined'
      ? String(req.body.password)
      : '';

  if (!username || !password) {
    return errorResponse(res, 'Username and password are required', 400);
  }

  req.body.username = username;
  req.body.password = password;

  next();
};

/**
 * Validate professor data
 */
const validateProfessor = (req, res, next) => {
  const { name, username, password } = req.body;

  if (!name || !username || !password) {
    return errorResponse(res, 'Name, username, and password are required', 400);
  }

  if (username.length < 3) {
    return errorResponse(res, 'Username must be at least 3 characters long', 400);
  }

  if (password.length < 6) {
    return errorResponse(res, 'Password must be at least 6 characters long', 400);
  }

  next();
};

/**
 * Validate HOD update data (partial update allowed)
 * Rules:
 * - At least one field required
 * - Cannot mix direct updates (username/collegeName) with sensitive updates (email/password)
 */
const validateHODUpdate = (req, res, next) => {
  const { collegeName, username, password, email } = req.body;

  if (!collegeName && !username && !password && !email) {
    return errorResponse(res, 'At least one field must be provided to update', 400);
  }

  const directFields = [];
  const sensitiveFields = [];

  if (username) directFields.push('username');
  if (collegeName) directFields.push('collegeName');
  if (email) sensitiveFields.push('email');
  if (password) sensitiveFields.push('password');

  if (directFields.length > 0 && sensitiveFields.length > 0) {
    return errorResponse(
      res,
      `You cannot update [${directFields.join(', ')}] together with [${sensitiveFields.join(', ')}]. Please update them separately.`,
      400
    );
  }

  if (email) {
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return errorResponse(res, 'Please provide a valid email address', 400);
    }
  }

  if (username && username.length < 3) {
    return errorResponse(res, 'Username must be at least 3 characters long', 400);
  }

  if (password && password.length < 6) {
    return errorResponse(res, 'Password must be at least 6 characters long', 400);
  }

  next();
};

module.exports = {
  validateHODRegistration,
  validateOTP,
  validateOTPOnly,
  validateLogin,
  validateProfessor,
  validateHODUpdate
};
