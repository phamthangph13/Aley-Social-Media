const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const postsController = require('../controllers/posts.controller');

// Create a new post with media upload
router.post('/', auth, postsController.uploadMedia, postsController.createPost);

// Get all posts (feed)
router.get('/', auth, postsController.getPosts);

// Get posts for a user profile
router.get('/user/:userId', auth, postsController.getUserProfilePosts);

// Get a specific post by ID
router.get('/:id', auth, postsController.getPostById);

// Update a post
router.put('/:id', auth, postsController.updatePost);

// Delete a post
router.delete('/:id', auth, postsController.deletePost);

// Like/unlike a post
router.post('/:id/like', auth, postsController.toggleLike);

// Add a comment to a post
router.post('/:id/comments', auth, postsController.addComment);

module.exports = router; 