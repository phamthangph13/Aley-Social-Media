const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FundraisingSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  goal: {
    type: Number,
    required: true,
    min: 0
  },
  raised: {
    type: Number,
    default: 0,
    min: 0
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  image: {
    type: Buffer,
    default: null
  },
  imageType: {
    type: String,
    default: null
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  donors: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    amount: {
      type: Number,
      required: true
    },
    message: String,
    date: {
      type: Date,
      default: Date.now
    },
    isAnonymous: {
      type: Boolean,
      default: false
    }
  }],
  category: {
    type: String,
    enum: ['education', 'health', 'environment', 'disaster', 'community', 'other'],
    required: true
  }
}, { timestamps: true });

// Virtual for calculating percentage raised
FundraisingSchema.virtual('percentageRaised').get(function() {
  return this.goal > 0 ? Math.min(Math.round((this.raised / this.goal) * 100), 100) : 0;
});

// Virtual for getting the image URL in base64 format
FundraisingSchema.virtual('imageUrl').get(function() {
  if (this.image && this.imageType) {
    return `data:${this.imageType};base64,${this.image.toString('base64')}`;
  }
  return 'assets/images/default-campaign.png';
});

// Set toJSON and toObject to include virtuals
FundraisingSchema.set('toJSON', { virtuals: true });
FundraisingSchema.set('toObject', { virtuals: true });

const Fundraising = mongoose.model('Fundraising', FundraisingSchema);

module.exports = Fundraising; 