const User = require('../models/user.model');

/**
 * @desc    Get user profile
 * @route   GET /api/profile
 * @access  Private
 */
exports.getProfile = async (req, res) => {
  try {
    // req.user is set from the auth middleware
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return user profile (excluding sensitive information)
    res.json(user.getPublicProfile());
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Get profile by user ID (for viewing other profiles)
 * @route   GET /api/profile/:userId
 * @access  Public
 */
exports.getProfileById = async (req, res) => {
  try {
    // Special case - handle non-ID routes
    const specialRoutes = ['blocked-users', 'settings', 'help-center'];
    if (specialRoutes.includes(req.params.userId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid user ID, this appears to be a route name' 
      });
    }
    
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return public profile
    res.json(user.getPublicProfile());
  } catch (error) {
    console.error('Error fetching profile by ID:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/profile
 * @access  Private
 */
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, bio, location, website, phoneNumber, interests } = req.body;
    
    // Find user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (bio !== undefined) user.bio = bio;
    if (location !== undefined) user.location = location;
    if (website !== undefined) user.website = website;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (interests) user.interests = interests;
    
    await user.save();
    
    res.json(user.getPublicProfile());
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Upload/Update avatar
 * @route   PUT /api/profile/avatar
 * @access  Private
 */
exports.updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Save image to user document
    user.avatar = req.file.buffer;
    user.avatarType = req.file.mimetype;
    
    await user.save();
    
    res.json({ 
      message: 'Avatar updated successfully',
      avatarUrl: user.avatarUrl
    });
  } catch (error) {
    console.error('Error updating avatar:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Delete avatar (reset to default)
 * @route   DELETE /api/profile/avatar
 * @access  Private
 */
exports.deleteAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Remove avatar
    user.avatar = null;
    user.avatarType = null;
    
    await user.save();
    
    res.json({ 
      message: 'Avatar removed successfully',
      avatarUrl: user.avatarUrl
    });
  } catch (error) {
    console.error('Error deleting avatar:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Upload/Update cover image
 * @route   PUT /api/profile/cover
 * @access  Private
 */
exports.updateCoverImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Save image to user document
    user.coverImage = req.file.buffer;
    user.coverImageType = req.file.mimetype;
    
    await user.save();
    
    res.json({ 
      message: 'Cover image updated successfully',
      coverImageUrl: user.coverImageUrl
    });
  } catch (error) {
    console.error('Error updating cover image:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Delete cover image (reset to default)
 * @route   DELETE /api/profile/cover
 * @access  Private
 */
exports.deleteCoverImage = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Remove cover image
    user.coverImage = null;
    user.coverImageType = null;
    
    await user.save();
    
    res.json({ 
      message: 'Cover image removed successfully',
      coverImageUrl: user.coverImageUrl
    });
  } catch (error) {
    console.error('Error deleting cover image:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Get user avatar by user ID
 * @route   GET /api/profile/:userId/avatar
 * @access  Public
 */
exports.getUserAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('avatar avatarType');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If user has no avatar, return a 404 or redirect to default avatar
    if (!user.avatar || !user.avatarType) {
      return res.redirect('/assets/images/default-avatar.png');
    }

    // Set the content type and send the avatar
    res.set('Content-Type', user.avatarType);
    return res.send(user.avatar);
  } catch (error) {
    console.error('Error fetching avatar:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Get user cover image by user ID
 * @route   GET /api/profile/:userId/cover
 * @access  Public
 */
exports.getUserCover = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('coverImage coverImageType');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If user has no cover image, return a 404 or redirect to default cover
    if (!user.coverImage || !user.coverImageType) {
      return res.redirect('/assets/images/default-cover.jpg');
    }

    // Set the content type and send the cover image
    res.set('Content-Type', user.coverImageType);
    return res.send(user.coverImage);
  } catch (error) {
    console.error('Error fetching cover image:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 