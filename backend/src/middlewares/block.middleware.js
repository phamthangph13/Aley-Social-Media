const User = require('../models/user.model');

/**
 * Middleware to check if there is a blocking relationship between users
 * @param {string} userIdParamName - The parameter name that contains the user ID to check against
 * @returns {Function} Middleware function
 */
const checkBlockStatus = (userIdParamName = 'userId') => {
  return async (req, res, next) => {
    try {
      const currentUserId = req.user.id;
      const targetUserId = req.params[userIdParamName];
      
      if (!targetUserId) {
        return next();
      }
      
      // Skip check if it's the same user
      if (currentUserId === targetUserId) {
        return next();
      }
      
      // Get both users
      const [currentUser, targetUser] = await Promise.all([
        User.findById(currentUserId),
        User.findById(targetUserId)
      ]);
      
      if (!currentUser || !targetUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Check if current user has blocked target user
      const hasBlockedTarget = currentUser.blockedUsers.some(
        id => id.toString() === targetUserId
      );
      
      // Check if target user has blocked current user
      const isBlockedByTarget = targetUser.blockedUsers.some(
        id => id.toString() === currentUserId
      );
      
      // If either user has blocked the other, prevent interaction
      if (hasBlockedTarget || isBlockedByTarget) {
        return res.status(403).json({
          success: false,
          message: 'Cannot interact with this user due to blocking',
          blocked: hasBlockedTarget,
          blockedBy: isBlockedByTarget
        });
      }
      
      // No blocking relationship, proceed
      next();
    } catch (error) {
      console.error('Block middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

module.exports = checkBlockStatus; 