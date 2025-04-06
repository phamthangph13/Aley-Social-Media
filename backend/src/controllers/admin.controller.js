const User = require('../models/user.model');
const Report = require('../models/report.model');
const UserReport = require('../models/user-report.model');
const Post = require('../models/post.model');
const mongoose = require('mongoose');

// User Management Controllers
exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status || null;
    const role = req.query.role || null;
    const search = req.query.search || null;

    // Build query based on filters
    const query = {};
    if (status) {
      query.status = status;
    }
    if (role) {
      query.role = role;
    }
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Get users with pagination
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalUsers = await User.countDocuments(query);
    
    // Get post counts for each user
    const usersWithPostCounts = await Promise.all(
      users.map(async (user) => {
        const postCount = await Post.countDocuments({ user: user._id });
        return {
          ...user._doc,
          postCount
        };
      })
    );

    return res.status(200).json({
      success: true,
      users: usersWithPostCounts,
      currentPage: page,
      totalPages: Math.ceil(totalUsers / limit),
      totalUsers
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get user post count
    const postCount = await Post.countDocuments({ user: userId });
    
    // Get report information
    const reportCount = await Report.countDocuments({ reportedBy: userId });
    const reportedCount = await UserReport.countDocuments({ reportedUser: userId });
    
    return res.status(200).json({
      success: true,
      user: {
        ...user._doc,
        postCount,
        reportCount,
        reportedCount
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, status } = req.body;
    
    // Check if user with this email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    // Create new user
    const user = new User({
      firstName,
      lastName,
      email,
      password,
      role: role || 'user',
      status: status || 'active'
    });
    
    await user.save();
    
    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        ...user._doc,
        password: undefined
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { firstName, lastName, email, role } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update user fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    if (role) user.role = role;
    
    await user.save();
    
    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: {
        ...user._doc,
        password: undefined
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['active', 'inactive', 'suspended'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    user.status = status;
    await user.save();
    
    return res.status(200).json({
      success: true,
      message: 'User status updated successfully',
      user: {
        ...user._doc,
        password: undefined
      }
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    await User.findByIdAndDelete(userId);
    
    return res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Report Management Controllers
exports.getAllPostReports = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status || null;
    const priority = req.query.priority || null;

    // Build query based on filters
    const query = {};
    if (status) {
      query.status = status;
    }
    if (priority) {
      query.priority = priority;
    }

    // Get reports with pagination
    const reports = await Report.find(query)
      .populate('post', 'content')
      .populate('reportedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalReports = await Report.countDocuments(query);

    return res.status(200).json({
      success: true,
      reports,
      currentPage: page,
      totalPages: Math.ceil(totalReports / limit),
      totalReports
    });
  } catch (error) {
    console.error('Error fetching post reports:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

exports.getAllUserReports = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status || null;
    const priority = req.query.priority || null;

    // Build query based on filters
    const query = {};
    if (status) {
      query.status = status;
    }
    if (priority) {
      query.priority = priority;
    }

    // Get reports with pagination
    const reports = await UserReport.find(query)
      .populate('reportedUser', 'firstName lastName email')
      .populate('reportedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalReports = await UserReport.countDocuments(query);

    return res.status(200).json({
      success: true,
      reports,
      currentPage: page,
      totalPages: Math.ceil(totalReports / limit),
      totalReports
    });
  } catch (error) {
    console.error('Error fetching user reports:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

exports.updatePostReportStatus = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, adminNotes, priority } = req.body;

    // Validate status
    const validStatuses = ['pending', 'reviewed', 'resolved', 'rejected'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Update report
    if (status) report.status = status;
    if (adminNotes) report.adminNotes = adminNotes;
    if (priority) report.priority = priority;
    
    await report.save();

    return res.status(200).json({
      success: true,
      message: 'Report updated successfully',
      report
    });
  } catch (error) {
    console.error('Error updating post report:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

exports.updateUserReportStatus = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, adminNotes, priority } = req.body;

    // Validate status
    const validStatuses = ['pending', 'reviewed', 'resolved', 'rejected'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const report = await UserReport.findById(reportId);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Update report
    if (status) report.status = status;
    if (adminNotes) report.adminNotes = adminNotes;
    if (priority) report.priority = priority;
    
    await report.save();

    return res.status(200).json({
      success: true,
      message: 'Report updated successfully',
      report
    });
  } catch (error) {
    console.error('Error updating user report:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

exports.deletePostReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    
    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    await Report.findByIdAndDelete(reportId);
    
    return res.status(200).json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting post report:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

exports.deleteUserReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    
    const report = await UserReport.findById(reportId);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    await UserReport.findByIdAndDelete(reportId);
    
    return res.status(200).json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user report:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Dashboard Statistics
exports.getDashboardStatistics = async (req, res) => {
  try {
    // Get user statistics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const newUsersToday = await User.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });
    
    // Get report statistics
    const totalPostReports = await Report.countDocuments();
    const pendingPostReports = await Report.countDocuments({ status: 'pending' });
    const totalUserReports = await UserReport.countDocuments();
    const pendingUserReports = await UserReport.countDocuments({ status: 'pending' });
    
    // Get content statistics
    const totalPosts = await Post.countDocuments();
    
    return res.status(200).json({
      success: true,
      statistics: {
        users: {
          total: totalUsers,
          active: activeUsers,
          newToday: newUsersToday
        },
        reports: {
          posts: {
            total: totalPostReports,
            pending: pendingPostReports
          },
          users: {
            total: totalUserReports,
            pending: pendingUserReports
          }
        },
        content: {
          totalPosts
        }
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Post Management Controllers
exports.getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const privacy = req.query.privacy || null;
    const emotion = req.query.emotion || null;
    const search = req.query.search || null;
    const userId = req.query.userId || null;
    const dateFilter = req.query.dateFilter || null;

    // Build query based on filters
    const query = {};
    
    if (privacy) {
      query.privacy = privacy;
    }
    
    if (emotion) {
      query.emotion = emotion;
    }
    
    if (userId) {
      query.user = userId;
    }
    
    if (search) {
      query.$or = [
        { content: { $regex: search, $options: 'i' } },
        { hashtags: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Date filter
    if (dateFilter) {
      const now = new Date();
      let startDate;
      
      switch(dateFilter) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        default:
          startDate = null;
      }
      
      if (startDate) {
        query.createdAt = { $gte: startDate };
      }
    }
    
    // Get posts with pagination
    const posts = await Post.find(query)
      .populate({
        path: 'user',
        select: 'firstName lastName avatar avatarType'
      })
      .populate({
        path: 'comments.user',
        select: 'firstName lastName avatar avatarType'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const totalPosts = await Post.countDocuments(query);
    
    // Format posts for response
    const formattedPosts = posts.map(post => {
      const formattedPost = post.getFormattedPost();
      
      // Add user avatar URL
      if (post.user) {
        formattedPost.user.avatarUrl = post.user.avatar && post.user.avatarType 
          ? `data:${post.user.avatarType};base64,${post.user.avatar.toString('base64')}` 
          : '/assets/images/default-avatar.png';
      }
      
      // Add comment avatars
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
    
    return res.status(200).json({
      success: true,
      posts: formattedPosts,
      currentPage: page,
      totalPages: Math.ceil(totalPosts / limit),
      totalPosts
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

exports.getPostById = async (req, res) => {
  try {
    const { postId } = req.params;
    
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
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    // Format post for response
    const formattedPost = post.getFormattedPost();
    
    // Add user avatar URL
    if (post.user) {
      formattedPost.user.avatarUrl = post.user.avatar && post.user.avatarType 
        ? `data:${post.user.avatarType};base64,${post.user.avatar.toString('base64')}` 
        : '/assets/images/default-avatar.png';
    }
    
    // Add comment avatars
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
    
    return res.status(200).json({
      success: true,
      post: formattedPost
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

exports.updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, hashtags, privacy, emotion } = req.body;
    
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    // Update post fields
    if (content) post.content = content;
    if (privacy) post.privacy = privacy;
    if (emotion) post.emotion = emotion;
    
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
    
    // Update timestamps
    post.updatedAt = Date.now();
    
    await post.save();
    
    // Return updated post
    await post.populate([
      { path: 'user', select: 'firstName lastName avatar avatarType' },
      { path: 'comments.user', select: 'firstName lastName avatar avatarType' }
    ]);
    
    // Format post for response
    const formattedPost = post.getFormattedPost();
    
    // Add user avatar URL
    if (post.user) {
      formattedPost.user.avatarUrl = post.user.avatar && post.user.avatarType 
        ? `data:${post.user.avatarType};base64,${post.user.avatar.toString('base64')}` 
        : '/assets/images/default-avatar.png';
    }
    
    return res.status(200).json({
      success: true,
      message: 'Post updated successfully',
      post: formattedPost
    });
  } catch (error) {
    console.error('Error updating post:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    await Post.findByIdAndDelete(postId);
    
    return res.status(200).json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}; 