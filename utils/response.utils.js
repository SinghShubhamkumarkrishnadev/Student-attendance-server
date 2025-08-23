/**
 * Send a standardized success response
 * @param {Object} res - Express response object
 * @param {Object|Array} data - Data to send in response
 * @param {Number} statusCode - HTTP status code (default: 200)
 */
const successResponse = (res, data, statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      ...data
    });
  };
  
  /**
   * Send a standardized error response
   * @param {Object} res - Express response object
   * @param {String} message - Error message
   * @param {Number} statusCode - HTTP status code (default: 400)
   */
  const errorResponse = (res, message, statusCode = 400) => {
    return res.status(statusCode).json({
      success: false,
      error: message
    });
  };
  
  module.exports = {
    successResponse,
    errorResponse
  };
  