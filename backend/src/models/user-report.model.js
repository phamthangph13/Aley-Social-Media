const mongoose = require('mongoose');

const userReportSchema = new mongoose.Schema({
  reportedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  violationType: {
    type: String,
    enum: [
      'fake_account',
      'inappropriate_content',
      'harassment',
      'hate_speech',
      'spam',
      'impersonation',
      'privacy_violation',
      'intellectual_property',
      'illegal_activity',
      'other'
    ],
    required: true
  },
  additionalDetails: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved', 'rejected'],
    default: 'pending'
  },
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

const UserReport = mongoose.model('UserReport', userReportSchema);

module.exports = UserReport; 