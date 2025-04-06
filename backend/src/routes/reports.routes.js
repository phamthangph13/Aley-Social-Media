const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const reportsController = require('../controllers/reports.controller');

// Create a new report
router.post('/', auth, reportsController.createReport);

// Get all reports (admin only)
router.get('/', auth, reportsController.getAllReports);

// Update report status (admin only)
router.put('/:reportId', auth, reportsController.updateReportStatus);

// Get reports created by the current user
router.get('/user', auth, reportsController.getUserReports);

module.exports = router; 