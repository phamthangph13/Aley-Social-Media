const multer = require('multer');

// Configure storage for file uploads in memory
const storage = multer.memoryStorage();

// File filter to only allow image files
const imageFilter = (req, file, cb) => {
  // Accept image files only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

// File filter to allow both images and videos
const mediaFilter = (req, file, cb) => {
  // Accept image and video files
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image and video files are allowed'), false);
  }
};

// Configure upload options for avatars
const avatarUpload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: imageFilter,
});

// Configure upload options for cover images
const coverUpload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: imageFilter,
});

// Configure upload options for post media (images/videos)
const postUpload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size for videos
  },
  fileFilter: mediaFilter,
});

// Middleware for handling avatar upload
exports.uploadAvatar = avatarUpload.single('avatar');

// Middleware for handling cover image upload
exports.uploadCoverImage = coverUpload.single('coverImage');

// Middleware for handling post media uploads (multiple files)
exports.uploadPostMedia = postUpload.array('media', 10); // Max 10 files

// Error handling middleware for multer errors
exports.handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 5MB for avatars, 10MB for cover images, and 50MB for videos.' });
    }
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  } else if (err) {
    // An unknown error occurred
    return res.status(400).json({ message: err.message });
  }
  
  // No error
  next();
}; 