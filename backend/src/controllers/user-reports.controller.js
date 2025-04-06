const UserReport = require('../models/user-report.model');
const User = require('../models/user.model');
const mongoose = require('mongoose');

// Create a new user report
exports.createUserReport = async (req, res) => {
  try {
    const { userId, violationType, additionalDetails } = req.body;
    const reportedById = req.user.id;

    // Check if reported user exists
    const reportedUser = await User.findById(userId);
    if (!reportedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is reporting themselves
    if (userId === reportedById) {
      return res.status(400).json({
        success: false,
        message: 'You cannot report yourself'
      });
    }

    // Check if user has already reported this user
    const existingReport = await UserReport.findOne({
      reportedUser: userId,
      reportedBy: reportedById
    });

    if (existingReport) {
      return res.status(400).json({
        success: false,
        message: 'You have already reported this user'
      });
    }

    // Create new report
    const report = new UserReport({
      reportedUser: userId,
      reportedBy: reportedById,
      violationType,
      additionalDetails
    });

    await report.save();

    return res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      report
    });
  } catch (error) {
    console.error('Error creating user report:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all user reports (admin only)
exports.getAllUserReports = async (req, res) => {
  try {
    // Check if admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status || null;

    // Build query based on filters
    const query = {};
    if (status) {
      query.status = status;
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

// Update user report status (admin only)
exports.updateUserReportStatus = async (req, res) => {
  try {
    // Check if admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const { reportId } = req.params;
    const { status, adminNotes } = req.body;

    // Validate status
    const validStatuses = ['pending', 'reviewed', 'resolved', 'rejected'];
    if (!validStatuses.includes(status)) {
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
    report.status = status;
    if (adminNotes) {
      report.adminNotes = adminNotes;
    }
    
    await report.save();

    return res.status(200).json({
      success: true,
      message: 'Report status updated successfully',
      report
    });
  } catch (error) {
    console.error('Error updating user report status:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get reports created by the current user
exports.getUserSubmittedReports = async (req, res) => {
  try {
    const userId = req.user.id;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get user's reports
    const reports = await UserReport.find({ reportedBy: userId })
      .populate('reportedUser', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalReports = await UserReport.countDocuments({ reportedBy: userId });

    return res.status(200).json({
      success: true,
      reports,
      currentPage: page,
      totalPages: Math.ceil(totalReports / limit),
      totalReports
    });
  } catch (error) {
    console.error('Error fetching user submitted reports:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}; 