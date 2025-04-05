const User = require('../models/user.model');
const Post = require('../models/post.model');

/**
 * Search for users and posts based on a query
 * @route GET /api/search
 * @access Private
 */
exports.searchAll = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim() === '') {
      return res.status(400).json({ message: 'Search query is required' });
    }

    // Perform the searches in parallel
    const [users, posts] = await Promise.all([
      searchUsers(q, req.user.id),
      searchPosts(q, req.user.id)
    ]);

    return res.status(200).json({
      users,
      posts
    });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ message: 'Server error during search' });
  }
};

/**
 * Search for users based on a query
 * @route GET /api/search/users
 * @access Private
 */
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim() === '') {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const users = await searchUsers(q, req.user.id);

    return res.status(200).json({ users });
  } catch (error) {
    console.error('User search error:', error);
    return res.status(500).json({ message: 'Server error during user search' });
  }
};

/**
 * Search for posts based on a query
 * @route GET /api/search/posts
 * @access Private
 */
exports.searchPosts = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim() === '') {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const posts = await searchPosts(q, req.user.id);

    return res.status(200).json({ posts });
  } catch (error) {
    console.error('Post search error:', error);
    return res.status(500).json({ message: 'Server error during post search' });
  }
};

/**
 * Helper function to search for users
 * @private
 */
async function searchUsers(query, currentUserId) {
  try {
    // Lấy thông tin người dùng hiện tại và danh sách chặn
    const currentUser = await User.findById(currentUserId)
      .select('friends blockedUsers');
    
    if (!currentUser) {
      console.log(`Current user with ID ${currentUserId} not found`);
      return [];
    }
    
    // Lấy danh sách ID người dùng đã bị chặn
    const blockedUserIds = currentUser.blockedUsers.map(id => id.toString());
    
    // Lấy danh sách ID người dùng đã chặn user hiện tại
    const usersWhoBlockedMe = await User.find(
      { blockedUsers: currentUserId },
      { _id: 1 }
    );
    const blockedByUserIds = usersWhoBlockedMe.map(user => user._id.toString());
    
    // Kết hợp cả hai danh sách để lọc
    const excludedUserIds = [...blockedUserIds, ...blockedByUserIds];
    
    // Create a regex for the search query (case insensitive)
    const searchRegex = new RegExp(query, 'i');
    
    // Find users matching the search criteria
    const users = await User.find({
      $and: [
        { _id: { $ne: currentUserId } }, // Exclude current user
        { _id: { $nin: excludedUserIds } }, // Exclude blocked/blocking users
        {
          $or: [
            { firstName: searchRegex },
            { lastName: searchRegex },
            { email: searchRegex },
            { bio: searchRegex },
            { location: searchRegex }
          ]
        }
      ]
    })
    .select('_id firstName lastName avatar avatarType bio location friends friendRequests sentFriendRequests')
    .limit(10);

    // Check if there are any users
    if (!users || users.length === 0) {
      return [];
    }

    // Process user results to add common friends info
    const processedUsers = await Promise.all(users.map(async (user) => {
      // Get the public profile without sensitive data
      const userProfile = user.getPublicProfile();
      
      // Find common friends - make sure all arrays exist
      const commonFriendsCount = currentUser.friends && user.friends ? 
        currentUser.friends.filter(friendId => 
          user.friends.some(userFriendId => userFriendId.equals(friendId))
        ).length : 0;
      
      // Add common friends count
      userProfile.commonFriendsCount = commonFriendsCount;
      
      // Check if there's a pending friend request (safely)
      const isPendingRequest = user.friendRequests && Array.isArray(user.friendRequests) ? 
        user.friendRequests.some(req => 
          req.from && req.from.toString() === currentUserId.toString()
        ) : false;
      
      const hasSentRequest = user.sentFriendRequests && Array.isArray(user.sentFriendRequests) ? 
        user.sentFriendRequests.some(req => 
          req.to && req.to.toString() === currentUserId.toString()
        ) : false;
      
      // Check if already friends (safely)
      const isFriend = user.friends && Array.isArray(user.friends) ?
        user.friends.some(friendId => 
          friendId && friendId.toString() === currentUserId.toString()
        ) : false;
      
      userProfile.friendshipStatus = isFriend 
        ? 'friends' 
        : (isPendingRequest 
            ? 'pending' 
            : (hasSentRequest ? 'received' : 'none'));
      
      return userProfile;
    }));

    return processedUsers;
  } catch (error) {
    console.error('Error in searchUsers function:', error);
    return [];
  }
}

/**
 * Helper function to search for posts
 * @private
 */
async function searchPosts(query, currentUserId) {
  try {
    // Lấy thông tin người dùng hiện tại và danh sách chặn
    const currentUser = await User.findById(currentUserId);
    
    // Lấy danh sách ID người dùng đã bị chặn
    const blockedUserIds = currentUser.blockedUsers.map(id => id.toString());
    
    // Lấy danh sách ID người dùng đã chặn user hiện tại
    const usersWhoBlockedMe = await User.find(
      { blockedUsers: currentUserId },
      { _id: 1 }
    );
    const blockedByUserIds = usersWhoBlockedMe.map(user => user._id.toString());
    
    // Kết hợp cả hai danh sách để lọc
    const excludedUserIds = [...blockedUserIds, ...blockedByUserIds];
    
    // Create a regex for the search query (case insensitive)
    const searchRegex = new RegExp(query, 'i');
    
    // Get friend IDs safely
    const allFriendIds = await getFriendIds(currentUserId);
    
    // Lọc bỏ bạn bè đã chặn/bị chặn
    const friendIds = allFriendIds.filter(id => !excludedUserIds.includes(id));
    
    // Find posts matching the search criteria
    const posts = await Post.find({
      $and: [
        { user: { $nin: excludedUserIds } }, // Loại bỏ bài viết từ người dùng đã chặn/bị chặn
        {
          // Only include posts that are public or from friends
          $or: [
            { privacy: 'public' },
            {
              $and: [
                { privacy: 'friends' },
                { user: { $in: friendIds } }
              ]
            },
            // Include user's own posts regardless of privacy
            { user: currentUserId }
          ]
        },
        {
          // Match content or hashtags
          $or: [
            { content: searchRegex },
            { hashtags: searchRegex }
          ]
        }
      ]
    })
    .populate({
      path: 'user',
      select: 'firstName lastName avatar avatarType'
    })
    .sort({ createdAt: -1 })
    .limit(10);

    // Format each post
    return posts.map(post => {
      const formattedPost = post.toObject();
      
      // Ensure user has avatarUrl
      if (post.user) {
        formattedPost.user.avatarUrl = post.user.avatar && post.user.avatarType 
          ? `data:${post.user.avatarType};base64,${post.user.avatar.toString('base64')}` 
          : '/assets/images/default-avatar.png';
          
        // Remove binary data to reduce response size
        delete formattedPost.user.avatar;
        delete formattedPost.user.avatarType;
      }
      
      // Process image URLs
      formattedPost.imageUrls = [];
      if (post.images && post.images.length > 0) {
        formattedPost.imageUrls = post.images.map(img => 
          `data:${img.contentType};base64,${img.data.toString('base64')}`
        );
      }
      delete formattedPost.images;
      
      // Process video URLs (in a real app, you'd use a proper URL)
      formattedPost.videoUrls = [];
      if (post.videos && post.videos.length > 0) {
        // For the purpose of this example, we'll just indicate there are videos
        // In reality, you would generate proper URLs to the video content
        formattedPost.videoUrls = post.videos.map((_, index) => `video_${index}`);
      }
      delete formattedPost.videos;
      
      return formattedPost;
    });
  } catch (error) {
    console.error('Error in searchPosts function:', error);
    return [];
  }
}

/**
 * Helper function to get friend IDs for a user
 * @private
 */
async function getFriendIds(userId) {
  try {
    const user = await User.findById(userId).select('friends');
    return user && user.friends ? user.friends : [];
  } catch (error) {
    console.error('Error getting friend IDs:', error);
    return [];
  }
} 