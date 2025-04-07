const User = require('../models/user.model');
const Report = require('../models/report.model');
const UserReport = require('../models/user-report.model');
const Post = require('../models/post.model');
const mongoose = require('mongoose');
const Fundraising = require('../models/fundraising.model');

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

// Fundraising Management Methods

/**
 * Get all fundraising campaigns
 */
exports.getAllFundraisingCampaigns = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', category = '', status = '' } = req.query;
    
    // Build query filters
    const filter = {};
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (status) {
      if (status === 'active') {
        filter.isActive = true;
        filter.endDate = { $gt: new Date() };
      } else if (status === 'ended') {
        filter.endDate = { $lt: new Date() };
      } else if (status === 'inactive') {
        filter.isActive = false;
      }
    }
    
    // Get campaigns with pagination
    const campaigns = await Fundraising.find(filter)
      .populate('createdBy', 'firstName lastName email profilePicture')
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    
    // Get total count for pagination
    const total = await Fundraising.countDocuments(filter);
    
    return res.status(200).json({
      success: true,
      data: campaigns,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error in getAllFundraisingCampaigns:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching fundraising campaigns',
      error: error.message
    });
  }
};

/**
 * Get fundraising campaign by ID
 */
exports.getFundraisingCampaignById = async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const campaign = await Fundraising.findById(campaignId)
      .populate('createdBy', 'firstName lastName email profilePicture')
      .populate('donors.userId', 'firstName lastName email profilePicture');
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Fundraising campaign not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: campaign
    });
  } catch (error) {
    console.error('Error in getFundraisingCampaignById:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching fundraising campaign',
      error: error.message
    });
  }
};

/**
 * Create new fundraising campaign
 */
exports.createFundraisingCampaign = async (req, res) => {
  try {
    const { title, description, goal, startDate, endDate, category, userId } = req.body;
    
    // Validate required fields
    if (!title || !description || !goal || !endDate || !category) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Create new campaign
    const newCampaign = new Fundraising({
      title,
      description,
      goal: parseFloat(goal),
      startDate: startDate || new Date(),
      endDate,
      category,
      createdBy: userId || req.body.createdBy,
      raised: 0,
      isActive: true
    });
    
    // Handle image if provided
    if (req.body.image && req.body.imageType) {
      newCampaign.image = Buffer.from(req.body.image, 'base64');
      newCampaign.imageType = req.body.imageType;
    }
    
    await newCampaign.save();
    
    return res.status(201).json({
      success: true,
      message: 'Fundraising campaign created successfully',
      data: newCampaign
    });
  } catch (error) {
    console.error('Error in createFundraisingCampaign:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating fundraising campaign',
      error: error.message
    });
  }
};

/**
 * Update fundraising campaign
 */
exports.updateFundraisingCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { title, description, goal, startDate, endDate, category, isActive } = req.body;
    
    const campaign = await Fundraising.findById(campaignId);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Fundraising campaign not found'
      });
    }
    
    // Update fields
    if (title) campaign.title = title;
    if (description) campaign.description = description;
    if (goal) campaign.goal = parseFloat(goal);
    if (startDate) campaign.startDate = startDate;
    if (endDate) campaign.endDate = endDate;
    if (category) campaign.category = category;
    if (isActive !== undefined) campaign.isActive = isActive;
    
    // Handle image if provided
    if (req.body.image && req.body.imageType) {
      campaign.image = Buffer.from(req.body.image, 'base64');
      campaign.imageType = req.body.imageType;
    }
    
    await campaign.save();
    
    return res.status(200).json({
      success: true,
      message: 'Fundraising campaign updated successfully',
      data: campaign
    });
  } catch (error) {
    console.error('Error in updateFundraisingCampaign:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating fundraising campaign',
      error: error.message
    });
  }
};

/**
 * Delete fundraising campaign
 */
exports.deleteFundraisingCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const campaign = await Fundraising.findByIdAndDelete(campaignId);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Fundraising campaign not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Fundraising campaign deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteFundraisingCampaign:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting fundraising campaign',
      error: error.message
    });
  }
};

/**
 * Get campaign donations
 */
exports.getCampaignDonations = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const campaign = await Fundraising.findById(campaignId)
      .populate('donors.userId', 'firstName lastName email profilePicture');
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Fundraising campaign not found'
      });
    }
    
    // Paginate donors
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedDonors = campaign.donors.slice(startIndex, endIndex);
    
    return res.status(200).json({
      success: true,
      data: paginatedDonors,
      pagination: {
        total: campaign.donors.length,
        page: parseInt(page),
        pages: Math.ceil(campaign.donors.length / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error in getCampaignDonations:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching campaign donations',
      error: error.message
    });
  }
};

/**
 * Add donation to campaign
 */
exports.addDonation = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { userId, amount, message, isAnonymous = false } = req.body;
    
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid donation amount'
      });
    }
    
    const campaign = await Fundraising.findById(campaignId);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Fundraising campaign not found'
      });
    }
    
    // Create donation object
    const donation = {
      userId: userId || null,
      amount: parseFloat(amount),
      message: message || '',
      date: new Date(),
      isAnonymous
    };
    
    // Add donation to campaign
    campaign.donors.push(donation);
    campaign.raised += parseFloat(amount);
    
    await campaign.save();
    
    return res.status(200).json({
      success: true,
      message: 'Donation added successfully',
      data: {
        donation,
        campaignRaised: campaign.raised,
        percentageRaised: campaign.percentageRaised
      }
    });
  } catch (error) {
    console.error('Error in addDonation:', error);
    return res.status(500).json({
      success: false,
      message: 'Error adding donation',
      error: error.message
    });
  }
};

/**
 * Remove donation from campaign
 */
exports.removeDonation = async (req, res) => {
  try {
    const { campaignId, donationId } = req.params;
    
    const campaign = await Fundraising.findById(campaignId);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Fundraising campaign not found'
      });
    }
    
    // Find donation
    const donationIndex = campaign.donors.findIndex(d => d._id.toString() === donationId);
    
    if (donationIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }
    
    const donationAmount = campaign.donors[donationIndex].amount;
    
    // Remove donation
    campaign.donors.splice(donationIndex, 1);
    campaign.raised = Math.max(0, campaign.raised - donationAmount);
    
    await campaign.save();
    
    return res.status(200).json({
      success: true,
      message: 'Donation removed successfully',
      data: {
        campaignRaised: campaign.raised,
        percentageRaised: campaign.percentageRaised
      }
    });
  } catch (error) {
    console.error('Error in removeDonation:', error);
    return res.status(500).json({
      success: false,
      message: 'Error removing donation',
      error: error.message
    });
  }
};

/**
 * Get fundraising statistics
 */
exports.getFundraisingStatistics = async (req, res) => {
  try {
    // Total campaigns
    const totalCampaigns = await Fundraising.countDocuments();
    
    // Active campaigns
    const activeCampaigns = await Fundraising.countDocuments({
      isActive: true,
      endDate: { $gt: new Date() }
    });
    
    // Ended campaigns
    const endedCampaigns = await Fundraising.countDocuments({
      endDate: { $lt: new Date() }
    });
    
    // Total amount raised
    const campaigns = await Fundraising.find();
    const totalRaised = campaigns.reduce((sum, campaign) => sum + campaign.raised, 0);
    
    // Average donation
    const allDonations = campaigns.flatMap(campaign => campaign.donors);
    const avgDonation = allDonations.length ? 
      allDonations.reduce((sum, donation) => sum + donation.amount, 0) / allDonations.length : 0;
    
    // Campaign success rate (reached goal)
    const successfulCampaigns = campaigns.filter(c => c.raised >= c.goal).length;
    const successRate = totalCampaigns ? (successfulCampaigns / totalCampaigns) * 100 : 0;
    
    // Categories breakdown
    const categories = ['education', 'health', 'environment', 'disaster', 'community', 'other'];
    const categoryStats = {};
    
    for (const category of categories) {
      const count = await Fundraising.countDocuments({ category });
      const campaignsInCategory = await Fundraising.find({ category });
      const raisedInCategory = campaignsInCategory.reduce((sum, c) => sum + c.raised, 0);
      
      categoryStats[category] = {
        count,
        raised: raisedInCategory
      };
    }
    
    return res.status(200).json({
      success: true,
      data: {
        totalCampaigns,
        activeCampaigns,
        endedCampaigns,
        totalRaised,
        avgDonation,
        successfulCampaigns,
        successRate,
        categoryStats
      }
    });
  } catch (error) {
    console.error('Error in getFundraisingStatistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching fundraising statistics',
      error: error.message
    });
  }
};

// Make sure to export all controller functions
module.exports = {
  // User Management Controllers
  getAllUsers: exports.getAllUsers,
  getUserById: exports.getUserById,
  createUser: exports.createUser,
  updateUser: exports.updateUser,
  deleteUser: exports.deleteUser,
  updateUserStatus: exports.updateUserStatus,
  
  // Post Management Controllers
  getAllPosts: exports.getAllPosts,
  getPostById: exports.getPostById,
  updatePost: exports.updatePost,
  deletePost: exports.deletePost,
  
  // Report Management Controllers
  getAllPostReports: exports.getAllPostReports,
  getAllUserReports: exports.getAllUserReports,
  updatePostReportStatus: exports.updatePostReportStatus,
  updateUserReportStatus: exports.updateUserReportStatus,
  deletePostReport: exports.deletePostReport,
  deleteUserReport: exports.deleteUserReport,
  
  // Dashboard Statistics
  getDashboardStatistics: exports.getDashboardStatistics,
  
  // Fundraising Management Controllers
  getAllFundraisingCampaigns: exports.getAllFundraisingCampaigns,
  getFundraisingCampaignById: exports.getFundraisingCampaignById,
  createFundraisingCampaign: exports.createFundraisingCampaign,
  updateFundraisingCampaign: exports.updateFundraisingCampaign,
  deleteFundraisingCampaign: exports.deleteFundraisingCampaign,
  getCampaignDonations: exports.getCampaignDonations,
  addDonation: exports.addDonation,
  removeDonation: exports.removeDonation,
  getFundraisingStatistics: exports.getFundraisingStatistics
}; 