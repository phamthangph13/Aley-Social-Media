const express = require('express');
const router = express.Router();
const messagesController = require('../controllers/messages.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all conversations
router.get('/conversations', messagesController.getConversations);

// Get messages for a specific conversation
router.get('/:conversationId', messagesController.getMessages);

// Send message in an existing conversation
router.post('/send', messagesController.sendMessage);

// Create a new conversation with initial message
router.post('/conversation', messagesController.createConversation);

// Get potential recipients (friends) for new conversations
router.get('/recipients/friends', messagesController.getPotentialRecipients);

module.exports = router; 