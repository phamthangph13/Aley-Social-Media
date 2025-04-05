const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  images: [{
    data: {
      type: Buffer
    },
    contentType: {
      type: String
    }
  }],
  videos: [{
    data: {
      type: Buffer
    },
    contentType: {
      type: String
    }
  }],
  hashtags: [{
    type: String,
    trim: true
  }],
  emotion: {
    type: String,
    enum: ['happy', 'sad', 'angry', 'excited', 'surprised', 'loved', 'none'],
    default: 'none'
  },
  privacy: {
    type: String,
    enum: ['public', 'friends', 'private'],
    default: 'public'
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    text: {
      type: String,
      required: true,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Method to generate URLs for images
postSchema.methods.getImageUrls = function() {
  return this.images.map(image => {
    if (image.data && image.contentType) {
      return `data:${image.contentType};base64,${image.data.toString('base64')}`;
    }
    return null;
  }).filter(url => url !== null);
};

// Method to generate URLs for videos
postSchema.methods.getVideoUrls = function() {
  return this.videos.map(video => {
    if (video.data && video.contentType) {
      return `data:${video.contentType};base64,${video.data.toString('base64')}`;
    }
    return null;
  }).filter(url => url !== null);
};

// Method to get formatted post data (excluding sensitive data)
postSchema.methods.getFormattedPost = function() {
  const postObject = this.toObject();
  
  // Replace binary data with URLs
  postObject.imageUrls = this.getImageUrls();
  postObject.videoUrls = this.getVideoUrls();
  
  // Remove binary data from the output
  delete postObject.images;
  delete postObject.videos;
  
  return postObject;
};

const Post = mongoose.model('Post', postSchema);

module.exports = Post; 