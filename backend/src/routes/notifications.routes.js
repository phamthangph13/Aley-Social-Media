const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notifications.controller');
const auth = require('../middlewares/auth.middleware');

// Get all notifications for the authenticated user
router.get('/', auth, notificationsController.getUserNotifications);

// Get unread notification count
router.get('/unread-count', auth, notificationsController.getUnreadCount);

// Mark a notification as read
router.patch('/:id/read', auth, notificationsController.markAsRead);

// Mark all notifications as read
router.patch('/mark-all-read', auth, notificationsController.markAllAsRead);

module.exports = router; 