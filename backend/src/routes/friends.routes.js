const express = require('express');
const router = express.Router();
const friendsController = require('../controllers/friends.controller');
const auth = require('../middlewares/auth.middleware');
const checkBlockStatus = require('../middlewares/block.middleware');

// Get all friends
router.get('/', auth, friendsController.getFriends);

// Get friend requests
router.get('/requests', auth, friendsController.getFriendRequests);

// Get sent friend requests
router.get('/sent-requests', auth, friendsController.getSentFriendRequests);

// Get friend suggestions
router.get('/suggestions', auth, friendsController.getFriendSuggestions);

// Send friend request
router.post('/request/:userId', auth, checkBlockStatus('userId'), friendsController.sendFriendRequest);

// Cancel specific friend request (by recipient ID)
router.delete('/request-to/:userId', auth, checkBlockStatus('userId'), friendsController.cancelFriendRequestByRecipient);

// Accept friend request
router.post('/accept/:requestId', auth, friendsController.acceptFriendRequest);

// Reject/cancel friend request
router.delete('/request/:requestId', auth, friendsController.rejectFriendRequest);

// Remove friend
router.delete('/:friendId', auth, checkBlockStatus('friendId'), friendsController.removeFriend);

module.exports = router; 