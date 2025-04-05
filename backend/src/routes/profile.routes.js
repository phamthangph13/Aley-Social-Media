const express = require('express');
const profileController = require('../controllers/profile.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const uploadMiddleware = require('../middlewares/upload.middleware');
const router = express.Router();

/**
 * @route GET /api/profile
 * @desc Get current user profile
 * @access Private
 */
router.get('/', authMiddleware, profileController.getProfile);

/**
 * @route GET /api/profile/:userId
 * @desc Get profile by user ID
 * @access Public
 */
router.get('/:userId', profileController.getProfileById);

/**
 * @route GET /api/profile/:userId/avatar
 * @desc Get user avatar by user ID
 * @access Public
 */
router.get('/:userId/avatar', profileController.getUserAvatar);

/**
 * @route GET /api/profile/:userId/cover
 * @desc Get user cover image by user ID
 * @access Public
 */
router.get('/:userId/cover', profileController.getUserCover);

/**
 * @route PUT /api/profile
 * @desc Update user profile
 * @access Private
 */
router.put('/', authMiddleware, profileController.updateProfile);

/**
 * @route PUT /api/profile/avatar
 * @desc Upload/Update avatar
 * @access Private
 */
router.put(
  '/avatar',
  authMiddleware,
  uploadMiddleware.uploadAvatar,
  uploadMiddleware.handleUploadError,
  profileController.updateAvatar
);

/**
 * @route DELETE /api/profile/avatar
 * @desc Delete avatar (reset to default)
 * @access Private
 */
router.delete('/avatar', authMiddleware, profileController.deleteAvatar);

/**
 * @route PUT /api/profile/cover
 * @desc Upload/Update cover image
 * @access Private
 */
router.put(
  '/cover',
  authMiddleware,
  uploadMiddleware.uploadCoverImage,
  uploadMiddleware.handleUploadError,
  profileController.updateCoverImage
);

/**
 * @route DELETE /api/profile/cover
 * @desc Delete cover image (reset to default)
 * @access Private
 */
router.delete('/cover', authMiddleware, profileController.deleteCoverImage);

module.exports = router; 