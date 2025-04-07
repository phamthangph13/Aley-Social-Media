const express = require('express');
const router = express.Router();
const llamaController = require('../controllers/llama.controller');
// const authMiddleware = require('../../backend/src/middlewares/auth.middleware');

// Apply authentication middleware to all routes
// router.use(authMiddleware);

// Send a message to Llama
router.post('/send', llamaController.sendMessage);

// Get conversation history
router.get('/history/:id', llamaController.getConversationHistory);

// Get all conversations
router.get('/conversations', llamaController.getConversations);

module.exports = router; 