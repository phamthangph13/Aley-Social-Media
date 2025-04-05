const jwt = require('jsonwebtoken');

/**
 * Generate JWT token
 * @param {Object} payload - Data to be included in token
 * @returns {string} JWT token
 */
const generateToken = (payload) => {
  // If JWT_EXPIRES_IN is set, include it; otherwise, token will not expire
  const options = process.env.JWT_EXPIRES_IN
    ? { expiresIn: process.env.JWT_EXPIRES_IN }
    : {};
    
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    options
  );
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object|null} Decoded token payload or null if invalid
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateToken,
  verifyToken
}; 