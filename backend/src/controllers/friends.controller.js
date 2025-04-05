const User = require('../models/user.model');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

// Get all friends
exports.getFriends = async (req, res) => {
  try {
    // Lấy thông tin người dùng với danh sách bạn bè và người chặn
    const user = await User.findById(req.user.id)
      .populate('friends', 'firstName lastName avatar avatarType')
      .select('friends blockedUsers');

    // Lấy danh sách ID người dùng đã bị chặn
    const blockedUserIds = user.blockedUsers.map(id => id.toString());
    
    // Lấy danh sách ID người dùng đã chặn user hiện tại
    const usersWhoBlockedMe = await User.find(
      { blockedUsers: req.user.id },
      { _id: 1 }
    );
    const blockedByUserIds = usersWhoBlockedMe.map(user => user._id.toString());
    
    // Kết hợp cả hai danh sách để lọc
    const excludedUserIds = [...blockedUserIds, ...blockedByUserIds];
    
    // Lọc danh sách bạn bè để loại bỏ người đã chặn/bị chặn
    const filteredFriends = user.friends.filter(friend => 
      !excludedUserIds.includes(friend._id.toString())
    );

    // Format friend data to include avatarUrl
    const formattedFriends = filteredFriends.map(friend => {
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
      .select('friendRequests blockedUsers');

    // Lấy danh sách ID người dùng đã bị chặn
    const blockedUserIds = user.blockedUsers.map(id => id.toString());
    
    // Lấy danh sách ID người dùng đã chặn user hiện tại
    const usersWhoBlockedMe = await User.find(
      { blockedUsers: req.user.id },
      { _id: 1 }
    );
    const blockedByUserIds = usersWhoBlockedMe.map(user => user._id.toString());
    
    // Kết hợp cả hai danh sách để lọc
    const excludedUserIds = [...blockedUserIds, ...blockedByUserIds];
    
    // Lọc danh sách lời mời kết bạn để loại bỏ người đã chặn/bị chặn
    const filteredRequests = user.friendRequests.filter(request => {
      const fromUserId = request.from?._id?.toString();
      return fromUserId && !excludedUserIds.includes(fromUserId);
    });

    // Format friend requests data to include avatarUrl
    const formattedRequests = filteredRequests.map(request => {
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
    // Get current user with friends list and blocked users
    const currentUser = await User.findById(req.user.id).select('friends blockedUsers');
    
    // Get current user's friend IDs
    const friendIds = currentUser.friends.map(id => id.toString());
    friendIds.push(req.user.id); // Add current user to excluded list
    
    // Lấy danh sách ID người dùng đã bị chặn
    const blockedUserIds = currentUser.blockedUsers.map(id => id.toString());
    
    // Lấy danh sách ID người dùng đã chặn user hiện tại
    const usersWhoBlockedMe = await User.find(
      { blockedUsers: req.user.id },
      { _id: 1 }
    );
    const blockedByUserIds = usersWhoBlockedMe.map(user => user._id.toString());
    
    // Kết hợp tất cả danh sách để loại trừ
    const excludedUserIds = [...friendIds, ...blockedUserIds, ...blockedByUserIds];
    
    // Find users who are not friends with current user and not in blocked lists
    const suggestions = await User.find({
      _id: { $nin: excludedUserIds }
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
    
    // Create a notification for the request recipient
    const notificationController = require('./notifications.controller');
    await notificationController.createNotification(
      userId, // recipient (user receiving the friend request)
      req.user.id, // sender (current user sending the request)
      'friend_request' // notification type
    );
    
    return res.status(200).json({
      success: true,
      message: 'Đã gửi lời mời kết bạn'
    });
  } catch (error) {
    console.error('Error sending friend request:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi gửi lời mời kết bạn',
      error: error.message
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
      .select('sentFriendRequests blockedUsers');

    // Lấy danh sách ID người dùng đã bị chặn
    const blockedUserIds = user.blockedUsers.map(id => id.toString());
    
    // Lấy danh sách ID người dùng đã chặn user hiện tại
    const usersWhoBlockedMe = await User.find(
      { blockedUsers: req.user.id },
      { _id: 1 }
    );
    const blockedByUserIds = usersWhoBlockedMe.map(user => user._id.toString());
    
    // Kết hợp cả hai danh sách để lọc
    const excludedUserIds = [...blockedUserIds, ...blockedByUserIds];
    
    // Lọc danh sách lời mời đã gửi để loại bỏ người đã chặn/bị chặn
    const filteredRequests = user.sentFriendRequests.filter(request => {
      const toUserId = request.to?._id?.toString();
      return toUserId && !excludedUserIds.includes(toUserId);
    });

    // Format sent friend requests data to include avatarUrl
    const formattedRequests = filteredRequests.map(request => {
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