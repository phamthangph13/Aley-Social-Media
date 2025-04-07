const express = require('express');
const router = express.Router();
const fundraisingController = require('../controllers/fundraising.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Setup multer for file uploads in memory
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function(req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    
    cb(new Error('Only images are allowed (jpeg, jpg, png, gif)'));
  }
});

// Test route for debugging
router.get('/test', (req, res) => {
  res.status(200).json({ message: 'Fundraising API is working' });
});

// Public routes
router.get('/campaigns', fundraisingController.getAllCampaigns);
router.get('/campaigns/:id', fundraisingController.getCampaignById);
router.get('/campaigns/:id/image', fundraisingController.getCampaignImage);

// Protected routes - require authentication
router.post('/campaigns', authMiddleware, upload.single('image'), fundraisingController.createCampaign);
router.put('/campaigns/:id', authMiddleware, upload.single('image'), fundraisingController.updateCampaign);
router.delete('/campaigns/:id', authMiddleware, fundraisingController.deleteCampaign);
router.post('/campaigns/:id/donate', authMiddleware, fundraisingController.makeDonation);
router.get('/user/campaigns', authMiddleware, fundraisingController.getUserCampaigns);
router.get('/user/donations', authMiddleware, fundraisingController.getUserDonations);

module.exports = router; 