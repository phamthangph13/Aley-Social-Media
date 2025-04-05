const User = require('../models/user.model');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

// Get all friends
exports.getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('friends', 'firstName lastName avatar avatarType')
      .select('friends');

    // Format friend data to include avatarUrl
    const formattedFriends = user.friends.map(friend => {
      const formattedFriend = friend.toObject();
      
      // Calculate avatarUrl
      if (friend.avatar && friend.avatarType) {
        formattedFriend.avatarUrl = `data:${friend.avatarType};base64,${friend.avatar.toString('base64')}`;
      } else {
        formattedFriend.avatarUrl = '/assets/images/default-avatar.png';
      }
      
      // Remove binary data
      delete formattedFriend.avatar;
      delete formattedFriend.avatarType;
      
      return formattedFriend;
    });

    res.json({
      success: true,
      data: formattedFriends
    });
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi tải danh sách bạn bè'
    });
  }
};

// Get friend requests
exports.getFriendRequests = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: 'friendRequests.from',
        select: 'firstName lastName avatar avatarType'
      })
      .select('friendRequests');

    // Format friend requests data to include avatarUrl
    const formattedRequests = user.friendRequests.map(request => {
      const formattedRequest = request.toObject();
      
      if (request.from && request.from.avatar && request.from.avatarType) {
        formattedRequest.from.avatarUrl = `data:${request.from.avatarType};base64,${request.from.avatar.toString('base64')}`;
      } else if (request.from) {
        formattedRequest.from.avatarUrl = '/assets/images/default-avatar.png';
      }
      
      // Remove binary data
      if (formattedRequest.from) {
        delete formattedRequest.from.avatar;
        delete formattedRequest.from.avatarType;
      }
      
      return formattedRequest;
    });

    res.json({
      success: true,
      data: formattedRequests
    });
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi tải lời mời kết bạn'
    });
  }
};

// Get friend suggestions
exports.getFriendSuggestions = async (req, res) => {
  try {
    // Get current user with friends list
    const currentUser = await User.findById(req.user.id).select('friends');
    
    // Get current user's friend IDs
    const friendIds = currentUser.friends.map(id => id.toString());
    friendIds.push(req.user.id); // Add current user to excluded list
    
    // Find users who are not friends with current user
    const suggestions = await User.find({
      _id: { $nin: friendIds }
    })
    .select('firstName lastName avatar avatarType')
    .limit(10);
    
    // Format suggestions to include avatarUrl
    const formattedSuggestions = suggestions.map(suggestion => {
      const formattedSuggestion = suggestion.toObject();
      
      // Calculate avatarUrl
      if (suggestion.avatar && suggestion.avatarType) {
        formattedSuggestion.avatarUrl = `data:${suggestion.avatarType};base64,${suggestion.avatar.toString('base64')}`;
      } else {
        formattedSuggestion.avatarUrl = '/assets/images/default-avatar.png';
      }
      
      // Remove binary data
      delete formattedSuggestion.avatar;
      delete formattedSuggestion.avatarType;
      
      // Add random mutual friends count for UI display (this would be calculated properly in a real app)
      formattedSuggestion.mutualFriendsCount = Math.floor(Math.random() * 5);
      formattedSuggestion.commonInterestsCount = Math.floor(Math.random() * 3);
      
      return formattedSuggestion;
    });
    
    res.json({
      success: true,
      data: formattedSuggestions
    });
  } catch (error) {
    console.error('Error fetching friend suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi tải gợi ý kết bạn'
    });
  }
};

// Send friend request
exports.sendFriendRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user exists
    const receivingUser = await User.findById(userId);
    if (!receivingUser) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }
    
    // Check if already friends
    const currentUser = await User.findById(req.user.id);
    if (currentUser.friends.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Đã là bạn bè'
      });
    }
    
    // Check if request already sent
    const alreadySent = currentUser.sentFriendRequests.some(req => req.to.toString() === userId);
    if (alreadySent) {
      return res.status(400).json({
        success: false,
        message: 'Đã gửi lời mời kết bạn trước đó'
      });
    }
    
    // Check if there's already a request from the other user
    const pendingRequest = currentUser.friendRequests.find(req => req.from.toString() === userId);
    if (pendingRequest) {
      // Accept the request instead
      await User.findByIdAndUpdate(req.user.id, {
        $pull: { friendRequests: { from: userId } },
        $addToSet: { friends: userId }
      });
      
      await User.findByIdAndUpdate(userId, {
        $pull: { sentFriendRequests: { to: req.user.id } },
        $addToSet: { friends: req.user.id }
      });
      
      return res.json({
        success: true,
        message: 'Đã chấp nhận lời mời kết bạn'
      });
    }
    
    // Add friend request
    await User.findByIdAndUpdate(userId, {
      $addToSet: {
        friendRequests: {
          from: req.user.id,
          createdAt: new Date()
        }
      }
    });
    
    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: {
        sentFriendRequests: {
          to: userId,
          createdAt: new Date()
        }
      }
    });
    
    res.json({
      success: true,
      message: 'Đã gửi lời mời kết bạn'
    });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi gửi lời mời kết bạn'
    });
  }
};

// Accept friend request
exports.acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    
    // Find the request
    const user = await User.findById(req.user.id);
    const request = user.friendRequests.id(requestId);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lời mời kết bạn'
      });
    }
    
    const senderId = request.from;
    
    // Accept the request
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { friendRequests: { _id: requestId } },
      $addToSet: { friends: senderId }
    });
    
    await User.findByIdAndUpdate(senderId, {
      $pull: { sentFriendRequests: { to: req.user.id } },
      $addToSet: { friends: req.user.id }
    });
    
    res.json({
      success: true,
      message: 'Đã chấp nhận lời mời kết bạn'
    });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi chấp nhận lời mời kết bạn'
    });
  }
};

// Reject/cancel friend request
exports.rejectFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    
    // Check if this is a received request or sent request
    const user = await User.findById(req.user.id);
    const receivedRequest = user.friendRequests.id(requestId);
    
    if (receivedRequest) {
      // This is a received request - reject it
      const senderId = receivedRequest.from;
      
      await User.findByIdAndUpdate(req.user.id, {
        $pull: { friendRequests: { _id: requestId } }
      });
      
      await User.findByIdAndUpdate(senderId, {
        $pull: { sentFriendRequests: { to: req.user.id } }
      });
      
      return res.json({
        success: true,
        message: 'Đã từ chối lời mời kết bạn'
      });
    } else {
      // This might be a sent request - cancel it
      const sentRequest = user.sentFriendRequests.id(requestId);
      
      if (!sentRequest) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy lời mời kết bạn'
        });
      }
      
      const receiverId = sentRequest.to;
      
      await User.findByIdAndUpdate(req.user.id, {
        $pull: { sentFriendRequests: { _id: requestId } }
      });
      
      await User.findByIdAndUpdate(receiverId, {
        $pull: { friendRequests: { from: req.user.id } }
      });
      
      return res.json({
        success: true,
        message: 'Đã hủy lời mời kết bạn'
      });
    }
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi từ chối lời mời kết bạn'
    });
  }
};

// Remove friend
exports.removeFriend = async (req, res) => {
  try {
    const { friendId } = req.params;
    
    // Remove from both users' friends lists
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { friends: friendId }
    });
    
    await User.findByIdAndUpdate(friendId, {
      $pull: { friends: req.user.id }
    });
    
    res.json({
      success: true,
      message: 'Đã xóa khỏi danh sách bạn bè'
    });
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi xóa bạn bè'
    });
  }
};

// Get sent friend requests
exports.getSentFriendRequests = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: 'sentFriendRequests.to',
        select: 'firstName lastName avatar avatarType'
      })
      .select('sentFriendRequests');

    // Format sent friend requests data to include avatarUrl
    const formattedRequests = user.sentFriendRequests.map(request => {
      const formattedRequest = request.toObject();
      
      if (request.to && request.to.avatar && request.to.avatarType) {
        formattedRequest.to.avatarUrl = `data:${request.to.avatarType};base64,${request.to.avatar.toString('base64')}`;
      } else if (request.to) {
        formattedRequest.to.avatarUrl = '/assets/images/default-avatar.png';
      }
      
      // Remove binary data
      if (formattedRequest.to) {
        delete formattedRequest.to.avatar;
        delete formattedRequest.to.avatarType;
      }
      
      return formattedRequest;
    });

    res.json({
      success: true,
      data: formattedRequests
    });
  } catch (error) {
    console.error('Error fetching sent friend requests:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi tải danh sách lời mời đã gửi'
    });
  }
};

// Cancel friend request by recipient
exports.cancelFriendRequestByRecipient = async (req, res) => {
  try {
    const { userId } = req.params; // userId is the recipient's ID
    
    // Remove from current user's sent requests
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { sentFriendRequests: { to: userId } }
    });
    
    // Remove from recipient's received requests
    await User.findByIdAndUpdate(userId, {
      $pull: { friendRequests: { from: req.user.id } }
    });
    
    res.json({
      success: true,
      message: 'Đã hủy lời mời kết bạn'
    });
  } catch (error) {
    console.error('Error cancelling friend request:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi hủy lời mời kết bạn'
    });
  }
}; 