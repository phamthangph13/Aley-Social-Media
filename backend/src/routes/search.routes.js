const express = require('express');
const router = express.Router();
const searchController = require('../controllers/search.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Apply authentication to all search routes
router.use(authMiddleware);

// Search for everything (users and posts)
router.get('/', searchController.searchAll);

// Search by specific type
router.get('/users', searchController.searchUsers);
router.get('/posts', searchController.searchPosts);

module.exports = router; 