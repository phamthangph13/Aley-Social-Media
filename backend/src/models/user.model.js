const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  avatar: {
    type: Buffer,
    default: null
  },
  avatarType: {
    type: String,
    default: null
  },
  coverImage: {
    type: Buffer,
    default: null
  },
  coverImageType: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: ''
  },
  website: {
    type: String,
    default: ''
  },
  phoneNumber: {
    type: String,
    default: ''
  },
  interests: [{
    type: String
  }],
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: {
    type: String
  },
  verificationTokenExpires: {
    type: Date
  },
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  friendRequests: [{
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  sentFriendRequests: [{
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  blockedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  const user = this;
  
  // Only hash the password if it's modified (or new)
  if (!user.isModified('password')) return next();
  
  try {
    // Generate salt
    const salt = await bcrypt.genSalt(10);
    
    // Hash the password with the new salt
    user.password = await bcrypt.hash(user.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password for login
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Virtual for avatar URL with default if not set
userSchema.virtual('avatarUrl').get(function() {
  if (this.avatar && this.avatarType) {
    return `data:${this.avatarType};base64,${this.avatar.toString('base64')}`;
  }
  return '/assets/images/default-avatar.png';
});

// Virtual for cover image URL with default if not set
userSchema.virtual('coverImageUrl').get(function() {
  if (this.coverImage && this.coverImageType) {
    return `data:${this.coverImageType};base64,${this.coverImage.toString('base64')}`;
  }
  return '/assets/images/default-cover.jpg';
});

// Add a method to get user profile (excluding sensitive data)
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  
  delete userObject.password;
  delete userObject.verificationToken;
  delete userObject.verificationTokenExpires;
  delete userObject.resetPasswordToken;
  delete userObject.resetPasswordExpires;
  
  // Calculate and add avatar and cover URLs
  if (this.avatar && this.avatarType) {
    userObject.avatarUrl = `data:${this.avatarType};base64,${this.avatar.toString('base64')}`;
  } else {
    userObject.avatarUrl = '/assets/images/default-avatar.png';
  }
  
  if (this.coverImage && this.coverImageType) {
    userObject.coverImageUrl = `data:${this.coverImageType};base64,${this.coverImage.toString('base64')}`;
  } else {
    userObject.coverImageUrl = '/assets/images/default-cover.jpg';
  }
  
  // Remove binary data to reduce response size
  delete userObject.avatar;
  delete userObject.coverImage;
  
  return userObject;
};

const User = mongoose.model('User', userSchema);

module.exports = User; 