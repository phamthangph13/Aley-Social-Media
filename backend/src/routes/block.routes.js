const express = require('express');
const router = express.Router();
const blockController = require('../controllers/block.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Apply authentication to all block routes
router.use(authMiddleware);

/**
 * @route GET /api/block
 * @desc Get list of blocked users
 * @access Private
 */
router.get('/', blockController.getBlockedUsers);

/**
 * @route GET /api/block/check/:userId
 * @desc Check if a user is blocked
 * @access Private
 */
router.get('/check/:userId', blockController.checkIfBlocked);

/**
 * @route POST /api/block/:userId
 * @desc Block a user
 * @access Private
 */
router.post('/:userId', blockController.blockUser);

/**
 * @route DELETE /api/block/:userId
 * @desc Unblock a user
 * @access Private
 */
router.delete('/:userId', blockController.unblockUser);

module.exports = router; 