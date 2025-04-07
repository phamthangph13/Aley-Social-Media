const Post = require('../models/post.model');
const User = require('../models/user.model');
const multer = require('multer');
const sharp = require('sharp');

// In-memory storage for multer
const storage = multer.memoryStorage();

// Filter for file types
const fileFilter = (req, file, cb) => {
  // Accept images and videos only
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type'), false);
  }
};

// Set up multer upload
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 50MB max file size
  },
  fileFilter
});

// Middleware for handling file uploads
exports.uploadMedia = upload.array('media', 10); // Max 10 files

// Create a new post
exports.createPost = async (req, res) => {
  try {
    const { content, hashtags, emotion, privacy } = req.body;
    
    // Validate request
    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }
    
    // Create a new post
    const post = new Post({
      user: req.user.id,
      content,
      emotion: emotion || 'none',
      privacy: privacy || 'public',
    });
    
    // Add hashtags if provided
    if (hashtags) {
      const hashtagArray = Array.isArray(hashtags) 
        ? hashtags 
        : typeof hashtags === 'string'
          ? hashtags.split(',')
              .map(tag => tag.trim())
              .filter(tag => tag.length > 0)
          : [];
      
      post.hashtags = hashtagArray;
    }
    
    // Process uploaded files
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        if (file.mimetype.startsWith('image/')) {
          // Process and resize image
          const buffer = await sharp(file.buffer)
            .resize({ width: 1200, fit: 'inside' })
            .toBuffer();
          
          post.images.push({
            data: buffer,
            contentType: file.mimetype
          });
        } else if (file.mimetype.startsWith('video/')) {
          // Store video as is
          post.videos.push({
            data: file.buffer,
            contentType: file.mimetype
          });
        }
      }
    }
    
    // Save the post
    await post.save();
    
    // Populate user data for response
    await post.populate('user', 'firstName lastName avatarUrl');
    
    // Return formatted post
    res.status(201).json({
      message: 'Post created successfully',
      post: post.getFormattedPost()
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ message: 'Failed to create post', error: error.message });
  }
};

// Get all posts (with pagination)
exports.getPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10, userId, random = false } = req.query;
    const skip = (page - 1) * limit;
    
    // Lấy thông tin về người dùng hiện tại, bao gồm danh sách người đã chặn
    const currentUser = await User.findById(req.user.id);
    
    // Lấy danh sách ID người dùng đã bị chặn
    const blockedUserIds = currentUser.blockedUsers.map(id => id.toString());
    
    // Lấy danh sách ID người dùng đã chặn user hiện tại
    const usersWhoBlockedMe = await User.find(
      { blockedUsers: currentUser._id },
      { _id: 1 }
    );
    const blockedByUserIds = usersWhoBlockedMe.map(user => user._id.toString());
    
    // Kết hợp cả hai danh sách để lọc
    const excludedUserIds = [...blockedUserIds, ...blockedByUserIds];
    
    let query = {};
    
    // If userId is provided, get posts only from that user
    if (userId) {
      // Kiểm tra xem userId có trong danh sách chặn không
      if (excludedUserIds.includes(userId)) {
        return res.status(403).json({
          message: 'Không thể xem bài viết của người dùng này'
        });
      }
      query.user = userId;
    } else {
      // For regular feed, get public posts and posts from friends
      const friendIds = currentUser.friends || [];
      
      // Loại bỏ bạn bè đã chặn/bị chặn
      const validFriendIds = friendIds.filter(id => !excludedUserIds.includes(id.toString()));
      
      // Get posts that are either public, from friends (if privacy is 'friends'), or from the user themselves
      query = {
        $and: [
          { user: { $nin: excludedUserIds } }, // Loại bỏ bài viết từ người dùng đã chặn/bị chặn
          {
            $or: [
              { privacy: 'public' },
              { user: req.user.id },
              { user: { $in: validFriendIds }, privacy: { $in: ['public', 'friends'] } }
            ]
          }
        ]
      };
    }
    
    let posts;
    let totalPosts;
    
    // Count total posts for pagination
    totalPosts = await Post.countDocuments(query);

    if (random === 'true') {
      // Use aggregation with $sample to get random posts but with optimized lookup
      posts = await Post.aggregate([
        { $match: query },
        { $sample: { size: parseInt(limit) } },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'user',
            // Limit the fields from users to reduce data size
            pipeline: [
              { 
                $project: { 
                  firstName: 1, 
                  lastName: 1, 
                  avatar: 1, 
                  avatarType: 1
                } 
              }
            ]
          }
        },
        { $unwind: '$user' },
        // Optimize comments by limiting the number of comments loaded
        { $addFields: { 
            limitedComments: { $slice: ['$comments', 0, 5] } // Only take first 5 comments per post
        }},
        { $set: { comments: '$limitedComments' }},
        {
          $lookup: {
            from: 'users',
            localField: 'comments.user',
            foreignField: '_id',
            as: 'commentUsers',
            // Limit the fields from comment users
            pipeline: [
              { 
                $project: { 
                  _id: 1, 
                  firstName: 1, 
                  lastName: 1, 
                  avatar: 1, 
                  avatarType: 1
                } 
              }
            ]
          }
        }
      ]);
      
      // Process comments users
      posts = posts.map(post => {
        if (post.comments && post.comments.length > 0) {
          post.comments.forEach(comment => {
            const commentUser = post.commentUsers.find(
              u => u._id.toString() === comment.user.toString()
            );
            if (commentUser) {
              comment.user = {
                _id: commentUser._id,
                firstName: commentUser.firstName,
                lastName: commentUser.lastName,
                avatar: commentUser.avatar,
                avatarType: commentUser.avatarType
              };
            }
          });
        }
        delete post.commentUsers;
        return post;
      });
    } else {
      // Fetch posts with user information in chronological order
      posts = await Post.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate({
          path: 'user',
          select: 'firstName lastName avatar avatarType'
        })
        .populate({
          path: 'comments.user',
          select: 'firstName lastName avatar avatarType',
          // Limit the number of populated comments
          options: { limit: 5 } 
        });
    }
    
    // Format each post and ensure avatarUrl is included
    const formattedPosts = posts.map(post => {
      let formattedPost;
      
      if (random === 'true') {
        // For aggregation results, manually format
        formattedPost = {
          _id: post._id,
          content: post.content,
          likes: post.likes,
          comments: post.comments || [],
          hashtags: post.hashtags || [],
          emotion: post.emotion,
          privacy: post.privacy,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          user: {
            _id: post.user._id,
            firstName: post.user.firstName,
            lastName: post.user.lastName
          }
        };
        
        // Add image URLs if present
        if (post.images && post.images.length > 0) {
          formattedPost.imageUrls = post.images.map(img => 
            `data:${img.contentType};base64,${img.data.toString('base64')}`
          );
        }
        
        // Add video URLs if present
        if (post.videos && post.videos.length > 0) {
          formattedPost.videoUrls = post.videos.map(video => {
            if (video.path) {
              return video.path;
            } else if (video.data) {
              return `data:${video.contentType};base64,${video.data.toString('base64')}`;
            }
            return null;
          }).filter(url => url !== null);
        }
      } else {
        // Use existing method for normal find results
        formattedPost = post.getFormattedPost();
      }
      
      // Make sure user has avatarUrl
      if (post.user) {
        formattedPost.user.avatarUrl = post.user.avatar && post.user.avatarType 
          ? `data:${post.user.avatarType};base64,${post.user.avatar.toString('base64')}` 
          : '/assets/images/default-avatar.png';
      }
      
      // Make sure comment users have avatarUrl
      if (formattedPost.comments && formattedPost.comments.length > 0) {
        formattedPost.comments = formattedPost.comments.map(comment => {
          if (comment.user && comment.user.avatar && comment.user.avatarType) {
            comment.user.avatarUrl = `data:${comment.user.avatarType};base64,${comment.user.avatar.toString('base64')}`;
          } else if (comment.user) {
            comment.user.avatarUrl = '/assets/images/default-avatar.png';
          }
          return comment;
        });
      }
      
      return formattedPost;
    });
    
    res.status(200).json({
      posts: formattedPosts,
      totalPosts,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalPosts / limit)
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ message: 'Failed to fetch posts', error: error.message });
  }
};

// Get a specific post by ID
exports.getPostById = async (req, res) => {
  try {
    const postId = req.params.id;
    
    const post = await Post.findById(postId)
      .populate({
        path: 'user',
        select: 'firstName lastName avatar avatarType'
      })
      .populate({
        path: 'comments.user',
        select: 'firstName lastName avatar avatarType'
      });
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Check if user has permission to view this post
    const isOwner = post.user._id.toString() === req.user.id;
    const isPublic = post.privacy === 'public';
    const isFriend = post.privacy === 'friends' && 
      (await User.findById(req.user.id)).friends.includes(post.user._id);
    
    if (!isOwner && !isPublic && !isFriend) {
      return res.status(403).json({ message: 'You do not have permission to view this post' });
    }
    
    // Format post with proper avatarUrl
    const formattedPost = post.getFormattedPost();
    
    // Make sure user has avatarUrl
    if (post.user) {
      formattedPost.user.avatarUrl = post.user.avatar && post.user.avatarType 
        ? `data:${post.user.avatarType};base64,${post.user.avatar.toString('base64')}` 
        : '/assets/images/default-avatar.png';
    }
    
    // Make sure comment users have avatarUrl
    if (formattedPost.comments && formattedPost.comments.length > 0) {
      formattedPost.comments = formattedPost.comments.map(comment => {
        if (comment.user && comment.user.avatar && comment.user.avatarType) {
          comment.user.avatarUrl = `data:${comment.user.avatarType};base64,${comment.user.avatar.toString('base64')}`;
        } else if (comment.user) {
          comment.user.avatarUrl = '/assets/images/default-avatar.png';
        }
        return comment;
      });
    }
    
    res.status(200).json({ post: formattedPost });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ message: 'Failed to fetch post', error: error.message });
  }
};

// Update a post
exports.updatePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const { content, hashtags, emotion, privacy } = req.body;
    
    console.log('Update post request:', {
      postId,
      userId: req.user.id,
      content,
      privacy
    });
    
    // Find the post
    const post = await Post.findById(postId);
    
    if (!post) {
      console.log('Post not found');
      return res.status(404).json({ message: 'Post not found' });
    }
    
    console.log('Post found:', {
      postId: post._id,
      postUserId: post.user.toString(),
      requestUserId: req.user.id,
      requestUserIdToString: req.user.id.toString(),
      isOwner: post.user.toString() === req.user.id.toString(),
      postUserType: typeof post.user,
      requestUserIdType: typeof req.user.id
    });
    
    // Check ownership
    if (post.user.toString() !== req.user.id.toString()) {
      console.log('Authorization failed: User does not own this post');
      return res.status(403).json({ message: 'You can only update your own posts' });
    }
    
    // Update fields if provided
    if (content) post.content = content;
    if (emotion) post.emotion = emotion;
    if (privacy) post.privacy = privacy;
    
    // Update hashtags if provided
    if (hashtags) {
      const hashtagArray = Array.isArray(hashtags) 
        ? hashtags 
        : typeof hashtags === 'string'
          ? hashtags.split(',')
              .map(tag => tag.trim())
              .filter(tag => tag.length > 0)
          : [];
      
      post.hashtags = hashtagArray;
    }
    
    // Update timestamp
    post.updatedAt = Date.now();
    
    // Save the updated post
    await post.save();
    console.log('Post updated successfully');
    
    // Populate user data
    await post.populate('user', 'firstName lastName avatarUrl');
    
    res.status(200).json({
      message: 'Post updated successfully',
      post: post.getFormattedPost()
    });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ message: 'Failed to update post', error: error.message });
  }
};

// Update a post with media
exports.updatePostWithMedia = async (req, res) => {
  try {
    const postId = req.params.id;
    const { content, hashtags, emotion, privacy } = req.body;
    
    console.log('Update post with media request:', {
      postId,
      userId: req.user.id,
      content,
      privacy,
      filesCount: req.files ? req.files.length : 0
    });
    
    // Find the post
    const post = await Post.findById(postId);
    
    if (!post) {
      console.log('Post not found');
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Check ownership
    if (post.user.toString() !== req.user.id.toString()) {
      console.log('Authorization failed: User does not own this post');
      return res.status(403).json({ message: 'You can only update your own posts' });
    }
    
    // Update fields if provided
    if (content) post.content = content;
    if (emotion) post.emotion = emotion;
    if (privacy) post.privacy = privacy;
    
    // Update hashtags if provided
    if (hashtags) {
      const hashtagArray = Array.isArray(hashtags) 
        ? hashtags 
        : typeof hashtags === 'string'
          ? hashtags.split(',')
              .map(tag => tag.trim())
              .filter(tag => tag.length > 0)
          : [];
      
      post.hashtags = hashtagArray;
    }
    
    // Clear existing media if new files are uploaded
    if (req.files && req.files.length > 0) {
      post.images = [];
      post.videos = [];
      
      // Process uploaded files
      for (const file of req.files) {
        if (file.mimetype.startsWith('image/')) {
          // Process and resize image
          const buffer = await sharp(file.buffer)
            .resize({ width: 1200, fit: 'inside' })
            .toBuffer();
          
          post.images.push({
            data: buffer,
            contentType: file.mimetype
          });
        } else if (file.mimetype.startsWith('video/')) {
          // Store video as is
          post.videos.push({
            data: file.buffer,
            contentType: file.mimetype
          });
        }
      }
    }
    
    // Update timestamp
    post.updatedAt = Date.now();
    
    // Save the updated post
    await post.save();
    console.log('Post updated successfully with media');
    
    // Populate user data
    await post.populate('user', 'firstName lastName avatarUrl');
    
    res.status(200).json({
      message: 'Post updated successfully',
      post: post.getFormattedPost()
    });
  } catch (error) {
    console.error('Error updating post with media:', error);
    res.status(500).json({ message: 'Failed to update post', error: error.message });
  }
};

// Delete a post
exports.deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    
    console.log('Delete post request:', {
      postId,
      userId: req.user.id
    });
    
    // Find the post
    const post = await Post.findById(postId);
    
    if (!post) {
      console.log('Post not found');
      return res.status(404).json({ message: 'Post not found' });
    }
    
    console.log('Post found:', {
      postId: post._id,
      postUserId: post.user.toString(),
      requestUserId: req.user.id,
      requestUserIdToString: req.user.id.toString(),
      isOwner: post.user.toString() === req.user.id.toString(),
      postUserType: typeof post.user,
      requestUserIdType: typeof req.user.id
    });
    
    // Check ownership
    if (post.user.toString() !== req.user.id.toString()) {
      console.log('Authorization failed: User does not own this post');
      return res.status(403).json({ message: 'You can only delete your own posts' });
    }
    
    // Delete the post
    await Post.findByIdAndDelete(postId);
    console.log('Post deleted successfully');
    
    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ message: 'Failed to delete post', error: error.message });
  }
};

// Like/unlike a post
exports.toggleLike = async (req, res) => {
  try {
    const postId = req.params.id;
    
    // Find the post
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Check if user is the owner of the post (always allowed to interact with own posts)
    const isOwner = post.user.toString() === req.user.id;
    
    // If not owner, check privacy settings
    if (!isOwner) {
      const isPublic = post.privacy === 'public';
      const isFriend = post.privacy === 'friends' && 
        (await User.findById(req.user.id)).friends.includes(post.user);
      
      if (!isPublic && !isFriend) {
        return res.status(403).json({ message: 'You do not have permission to interact with this post' });
      }
    }
    
    // Check if user already liked the post
    const likeIndex = post.likes.indexOf(req.user.id);
    
    if (likeIndex > -1) {
      // User already liked the post, so unlike it
      post.likes.splice(likeIndex, 1);
    } else {
      // User hasn't liked the post, so add like
      post.likes.push(req.user.id);
      
      // Create a notification for the post owner if the liker is not the owner
      if (post.user.toString() !== req.user.id) {
        const notificationController = require('./notifications.controller');
        await notificationController.createNotification(
          post.user, // recipient (post owner)
          req.user.id, // sender (current user)
          'like', // notification type
          post._id // post ID
        );
      }
    }
    
    // Save the updated post
    await post.save();
    
    res.status(200).json({
      message: likeIndex > -1 ? 'Post unliked successfully' : 'Post liked successfully',
      likes: post.likes.length
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ message: 'Failed to update like status', error: error.message });
  }
};

// Add comment to a post
exports.addComment = async (req, res) => {
  try {
    const postId = req.params.id;
    const { text } = req.body;
    
    if (!text || text.trim() === '') {
      return res.status(400).json({ message: 'Comment text is required' });
    }
    
    // Find the post
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Check if user is the owner of the post (always allowed to interact with own posts)
    const isOwner = post.user.toString() === req.user.id;
    
    // If not owner, check privacy settings
    if (!isOwner) {
      const isPublic = post.privacy === 'public';
      const isFriend = post.privacy === 'friends' && 
        (await User.findById(req.user.id)).friends.includes(post.user);
      
      if (!isPublic && !isFriend) {
        return res.status(403).json({ message: 'You do not have permission to comment on this post' });
      }
    }
    
    // Add comment
    const newComment = {
      user: req.user.id,
      text,
      createdAt: Date.now()
    };
    
    post.comments.push(newComment);
    
    // Save the updated post
    await post.save();
    
    // Create a notification for the post owner if the commenter is not the owner
    if (post.user.toString() !== req.user.id) {
      const notificationController = require('./notifications.controller');
      await notificationController.createNotification(
        post.user, // recipient (post owner)
        req.user.id, // sender (current user)
        'comment', // notification type
        post._id, // post ID
        post.comments[post.comments.length - 1]._id // comment ID
      );
    }
    
    // Get the new comment and populate user data
    const addedComment = post.comments[post.comments.length - 1];
    await Post.populate(post, {
      path: 'comments.user',
      select: 'firstName lastName avatarUrl',
      model: 'User'
    });
    
    // Find the populated comment
    const populatedComment = post.comments.find(c => 
      c._id.toString() === addedComment._id.toString()
    );
    
    res.status(201).json({
      message: 'Comment added successfully',
      comment: populatedComment
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Failed to add comment', error: error.message });
  }
};

// Get user posts for profile page with privacy handling
exports.getUserProfilePosts = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const targetUserId = req.params.userId;
    const currentUserId = req.user.id;
    
    // Check if the user exists
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    let query = { user: targetUserId };
    
    // If viewing own profile, show all posts (convert to string to ensure proper comparison)
    if (targetUserId.toString() === currentUserId.toString()) {
      // No additional filters needed - show all posts
      console.log("Viewing own profile, showing all posts");
    } 
    // If viewing another user's profile
    else {
      const currentUser = await User.findById(currentUserId);
      
      // Check if they are friends (convert to string for comparison)
      const isFriend = currentUser.friends.some(friendId => 
        friendId.toString() === targetUserId.toString()
      );
      
      if (isFriend) {
        // For friends, show public and friends-only posts
        query.privacy = { $in: ['public', 'friends'] };
        console.log("Viewing friend's profile, showing public and friends-only posts");
      } else {
        // For non-friends, show only public posts
        query.privacy = 'public';
        console.log("Viewing non-friend's profile, showing only public posts");
      }
    }
    
    // Log the query for debugging
    console.log("Posts query:", JSON.stringify(query));
    
    // Fetch posts with user information
    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate({
        path: 'user',
        select: 'firstName lastName avatar avatarType'
      })
      .populate({
        path: 'comments.user',
        select: 'firstName lastName avatar avatarType'
      });
    
    // Count total posts for pagination
    const totalPosts = await Post.countDocuments(query);
    
    // Log the number of posts found
    console.log(`Found ${posts.length} posts out of ${totalPosts} total`);
    
    // Format each post and ensure avatarUrl is included
    const formattedPosts = posts.map(post => {
      const formattedPost = post.getFormattedPost();
      
      // Make sure user has avatarUrl
      if (post.user) {
        formattedPost.user.avatarUrl = post.user.avatar && post.user.avatarType 
          ? `data:${post.user.avatarType};base64,${post.user.avatar.toString('base64')}` 
          : '/assets/images/default-avatar.png';
      }
      
      // Make sure comment users have avatarUrl
      if (formattedPost.comments && formattedPost.comments.length > 0) {
        formattedPost.comments = formattedPost.comments.map(comment => {
          if (comment.user && comment.user.avatar && comment.user.avatarType) {
            comment.user.avatarUrl = `data:${comment.user.avatarType};base64,${comment.user.avatar.toString('base64')}`;
          } else if (comment.user) {
            comment.user.avatarUrl = '/assets/images/default-avatar.png';
          }
          return comment;
        });
      }
      
      return formattedPost;
    });
    
    res.status(200).json({
      posts: formattedPosts,
      totalPosts,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalPosts / limit)
    });
  } catch (error) {
    console.error('Error fetching user profile posts:', error);
    res.status(500).json({ message: 'Failed to fetch posts', error: error.message });
  }
}; 