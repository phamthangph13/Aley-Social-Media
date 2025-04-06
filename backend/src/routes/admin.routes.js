const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');

// Admin routes - Authentication not required per project requirements

// User management routes
router.get('/users', adminController.getAllUsers);
router.post('/users', adminController.createUser);
router.get('/users/:userId', adminController.getUserById);
router.put('/users/:userId', adminController.updateUser);
router.delete('/users/:userId', adminController.deleteUser);
router.put('/users/:userId/status', adminController.updateUserStatus);

// Post management routes
router.get('/posts', adminController.getAllPosts);
router.get('/posts/:postId', adminController.getPostById);
router.put('/posts/:postId', adminController.updatePost);
router.delete('/posts/:postId', adminController.deletePost);

// Report management routes
router.get('/reports/posts', adminController.getAllPostReports);
router.get('/reports/users', adminController.getAllUserReports);
router.put('/reports/posts/:reportId', adminController.updatePostReportStatus);
router.put('/reports/users/:reportId', adminController.updateUserReportStatus);
router.delete('/reports/posts/:reportId', adminController.deletePostReport);
router.delete('/reports/users/:reportId', adminController.deleteUserReport);

// Dashboard statistics
router.get('/statistics', adminController.getDashboardStatistics);

module.exports = router; 