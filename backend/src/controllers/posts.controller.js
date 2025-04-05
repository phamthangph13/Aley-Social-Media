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
    fileSize: 10 * 1024 * 1024, // 10MB max file size
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
      // Convert string of hashtags to array and clean them
      const hashtagArray = hashtags.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
      
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
    const { page = 1, limit = 10, userId } = req.query;
    const skip = (page - 1) * limit;
    
    let query = {};
    
    // If userId is provided, get posts only from that user
    if (userId) {
      query.user = userId;
    } else {
      // For regular feed, get public posts and posts from friends
      const currentUser = await User.findById(req.user.id);
      const friendIds = currentUser.friends || [];
      
      // Get posts that are either public, from friends (if privacy is 'friends'), or from the user themselves
      query = {
        $or: [
          { privacy: 'public' },
          { user: req.user.id },
          { user: { $in: friendIds }, privacy: { $in: ['public', 'friends'] } }
        ]
      };
    }
    
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
    
    // Find the post
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Check ownership
    if (post.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only update your own posts' });
    }
    
    // Update fields if provided
    if (content) post.content = content;
    if (emotion) post.emotion = emotion;
    if (privacy) post.privacy = privacy;
    
    // Update hashtags if provided
    if (hashtags) {
      const hashtagArray = hashtags.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
      
      post.hashtags = hashtagArray;
    }
    
    // Update timestamp
    post.updatedAt = Date.now();
    
    // Save the updated post
    await post.save();
    
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

// Delete a post
exports.deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    
    // Find the post
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Check ownership
    if (post.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own posts' });
    }
    
    // Delete the post
    await Post.findByIdAndDelete(postId);
    
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
    
    // Check if user has permission to view/like this post
    const isOwner = post.user.toString() === req.user.id;
    const isPublic = post.privacy === 'public';
    const isFriend = post.privacy === 'friends' && 
      (await User.findById(req.user.id)).friends.includes(post.user);
    
    if (!isOwner && !isPublic && !isFriend) {
      return res.status(403).json({ message: 'You do not have permission to interact with this post' });
    }
    
    // Check if user already liked the post
    const likeIndex = post.likes.indexOf(req.user.id);
    
    if (likeIndex > -1) {
      // User already liked the post, so unlike it
      post.likes.splice(likeIndex, 1);
    } else {
      // User hasn't liked the post, so add like
      post.likes.push(req.user.id);
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
    
    // Check if user has permission to view/comment on this post
    const isOwner = post.user.toString() === req.user.id;
    const isPublic = post.privacy === 'public';
    const isFriend = post.privacy === 'friends' && 
      (await User.findById(req.user.id)).friends.includes(post.user);
    
    if (!isOwner && !isPublic && !isFriend) {
      return res.status(403).json({ message: 'You do not have permission to comment on this post' });
    }
    
    // Add comment
    post.comments.push({
      user: req.user.id,
      text,
      createdAt: Date.now()
    });
    
    // Save the updated post
    await post.save();
    
    // Get the new comment and populate user data
    const newComment = post.comments[post.comments.length - 1];
    await Post.populate(post, {
      path: 'comments.user',
      select: 'firstName lastName avatarUrl',
      model: 'User'
    });
    
    // Find the populated comment
    const populatedComment = post.comments.find(c => 
      c._id.toString() === newComment._id.toString()
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