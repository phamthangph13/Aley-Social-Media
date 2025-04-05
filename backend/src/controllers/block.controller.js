const User = require('../models/user.model');
const mongoose = require('mongoose');

/**
 * @desc    Block a user
 * @route   POST /api/block/:userId
 * @access  Private
 */
exports.blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Validate that userId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid user ID' 
      });
    }
    
    // Check if trying to block themselves
    if (userId === req.user.id) {
      return res.status(400).json({ 
        success: false,
        message: 'You cannot block yourself' 
      });
    }
    
    // Find target user
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    // Find current user
    const currentUser = await User.findById(req.user.id);
    
    // Check if already blocked
    if (currentUser.blockedUsers.includes(userId)) {
      return res.status(400).json({ 
        success: false,
        message: 'User is already blocked' 
      });
    }
    
    // Remove from friends if they are friends
    currentUser.friends = currentUser.friends.filter(
      friend => friend.toString() !== userId
    );
    
    // Remove any friend requests between the users
    currentUser.friendRequests = currentUser.friendRequests.filter(
      request => request.from.toString() !== userId
    );
    
    currentUser.sentFriendRequests = currentUser.sentFriendRequests.filter(
      request => request.to.toString() !== userId
    );
    
    // Add to blocked users list
    currentUser.blockedUsers.push(userId);
    
    await currentUser.save();
    
    res.status(200).json({ 
      success: true,
      message: 'User blocked successfully' 
    });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

/**
 * @desc    Unblock a user
 * @route   DELETE /api/block/:userId
 * @access  Private
 */
exports.unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Validate that userId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid user ID' 
      });
    }
    
    // Find current user
    const currentUser = await User.findById(req.user.id);
    
    // Check if user is blocked
    if (!currentUser.blockedUsers.includes(userId)) {
      return res.status(400).json({ 
        success: false,
        message: 'User is not blocked' 
      });
    }
    
    // Remove from blocked users list
    currentUser.blockedUsers = currentUser.blockedUsers.filter(
      blockedId => blockedId.toString() !== userId
    );
    
    await currentUser.save();
    
    res.status(200).json({ 
      success: true,
      message: 'User unblocked successfully' 
    });
  } catch (error) {
    console.error('Error unblocking user:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

/**
 * @desc    Get list of blocked users
 * @route   GET /api/block
 * @access  Private
 */
exports.getBlockedUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('blockedUsers', 'firstName lastName avatar avatarType');
    
    res.status(200).json({
      success: true,
      blockedUsers: user.blockedUsers.map(blockedUser => ({
        id: blockedUser._id,
        firstName: blockedUser.firstName,
        lastName: blockedUser.lastName,
        avatarUrl: blockedUser.avatarUrl
      }))
    });
  } catch (error) {
    console.error('Error fetching blocked users:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

/**
 * @desc    Check if a user is blocked
 * @route   GET /api/block/check/:userId
 * @access  Private
 */
exports.checkIfBlocked = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Validate that userId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid user ID' 
      });
    }
    
    const currentUser = await User.findById(req.user.id);
    const isBlocked = currentUser.blockedUsers.includes(userId);
    
    // Also check if the target user has blocked current user
    const targetUser = await User.findById(userId);
    const isBlockedBy = targetUser ? targetUser.blockedUsers.includes(req.user.id) : false;
    
    res.status(200).json({
      success: true,
      isBlocked,
      isBlockedBy
    });
  } catch (error) {
    console.error('Error checking block status:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
}; 