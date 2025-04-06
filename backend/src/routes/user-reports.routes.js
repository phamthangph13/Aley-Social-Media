const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const userReportsController = require('../controllers/user-reports.controller');

// Create a new user report
router.post('/', auth, userReportsController.createUserReport);

// Get all user reports (admin only)
router.get('/', auth, userReportsController.getAllUserReports);

// Update user report status (admin only)
router.put('/:reportId', auth, userReportsController.updateUserReportStatus);

// Get reports created by the current user
router.get('/submitted', auth, userReportsController.getUserSubmittedReports);

module.exports = router; 