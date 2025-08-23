const HOD = require('../models/hod.model');
const { generateToken } = require('../config/jwt.config');
const { generateOTP, verifyOTP } = require('../utils/otp.utils');
const { sendOTPEmail } = require('../config/email.config');
const { successResponse, errorResponse } = require('../utils/response.utils');

/**
 * @desc    Register a new HOD
 * @route   POST /api/hods/register
 * @access  Public
 */
const registerHOD = async (req, res) => {
  try {
    const { collegeName, username, password, email } = req.body;

    // Check if HOD already exists
    const hodExists = await HOD.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (hodExists) {
      if (hodExists.email === email) {
        return errorResponse(res, 'Email already registered', 400);
      }
      return errorResponse(res, 'Username already taken', 400);
    }

    // Generate OTP
    const { otp, expiresAt } = generateOTP();

    // Create HOD with unverified status
    const hod = await HOD.create({
      collegeName,
      username,
      password,
      email,
      verified: false,
      otp: {
        code: otp,
        expiresAt
      }
    });

    // Send OTP email
    await sendOTPEmail(email, otp, collegeName);

    // Return success without sensitive data
    return successResponse(res, {
      message: 'Registration initiated. Please verify your email with the OTP sent.',
      hodId: hod._id,
      email: hod.email
    }, 201);

  } catch (error) {
    return errorResponse(res, 'Server error during registration', 500);
  }
};

/**
 * @desc    Verify HOD email with OTP
 * @route   POST /api/hods/verify-otp
 * @access  Public
 */
const verifyOTPHandler = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Find HOD by email
    const hod = await HOD.findOne({ email });
    if (!hod) {
      return errorResponse(res, 'HOD not found', 404);
    }

    // If already verified
    if (hod.verified) {
      return errorResponse(res, 'Email already verified', 400);
    }

    // Verify OTP
    const isValid = verifyOTP(otp, hod.otp.code, hod.otp.expiresAt);
    if (!isValid) {
      return errorResponse(res, 'Invalid or expired OTP', 400);
    }

    // Update HOD to verified status
    hod.verified = true;
    hod.otp = undefined; // Clear OTP after verification
    await hod.save();

    // Generate token
    const token = generateToken({ 
      id: hod._id, 
      role: 'hod' 
    });

    return successResponse(res, {
      message: 'Email verified successfully',
      token,
      hod: {
        id: hod._id,
        username: hod.username,
        collegeName: hod.collegeName,
        email: hod.email
      }
    });

  } catch (error) {
    console.error('OTP Verification Error:', error);
    return errorResponse(res, 'Server error during verification', 500);
  }
};

/**
 * @desc    Resend OTP to HOD email
 * @route   POST /api/hods/resend-otp
 * @access  Public
 */
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Find HOD by email
    const hod = await HOD.findOne({ email });
    if (!hod) {
      return errorResponse(res, 'HOD not found', 404);
    }

    // If already verified
    if (hod.verified) {
      return errorResponse(res, 'Email already verified', 400);
    }

    // Generate new OTP
    const { otp, expiresAt } = generateOTP();

    // Update HOD with new OTP
    hod.otp = {
      code: otp,
      expiresAt
    };
    await hod.save();

    // Send OTP email
    await sendOTPEmail(email, otp, hod.collegeName);

    return successResponse(res, {
      message: 'OTP resent successfully',
      email: hod.email
    });

  } catch (error) {
    return errorResponse(res, 'Server error while resending OTP', 500);
  }
};

/**
 * @desc    Login HOD
 * @route   POST /api/hods/login
 * @access  Public
 */
const loginHOD = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find HOD by username
    const hod = await HOD.findOne({ username });
    if (!hod) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    // Check if email is verified
    if (!hod.verified) {
      return errorResponse(res, 'Email not verified. Please verify your email first.', 401);
    }

    // Check password
    const isMatch = await hod.comparePassword(password);
    if (!isMatch) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    // Generate token
    const token = generateToken({ 
      id: hod._id, 
      role: 'hod' 
    });

    return successResponse(res, {
      message: 'Login successful',
      token,
      hod: {
        id: hod._id,
        username: hod.username,
        collegeName: hod.collegeName,
        email: hod.email
      }
    });

  } catch (error) {
    return errorResponse(res, 'Server error during login', 500);
  }
};

/**
 * @desc    Get HOD profile
 * @route   GET /api/hods/profile
 * @access  Private (HOD only)
 */
const getHODProfile = async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('-password -otp');
    if (!hod) {
      return errorResponse(res, 'HOD not found', 404);
    }

    return successResponse(res, { hod });

  } catch (error) {
    return errorResponse(res, 'Server error while fetching profile', 500);
  }
};

module.exports = {
  registerHOD,
  verifyOTPHandler,
  resendOTP,
  loginHOD,
  getHODProfile
};
