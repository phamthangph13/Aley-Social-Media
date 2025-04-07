const Fundraising = require('../models/fundraising.model');
const User = require('../models/user.model');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Get all active fundraising campaigns
exports.getAllCampaigns = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const filter = { isActive: true };
    
    // Add category filter if provided
    if (req.query.category && req.query.category !== 'all') {
      filter.category = req.query.category;
    }
    
    // Add search filter if provided
    if (req.query.search) {
      filter.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const campaigns = await Fundraising.find(filter)
      .populate('createdBy', 'username firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Fundraising.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      data: campaigns,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error in getAllCampaigns:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách chiến dịch gây quỹ',
      error: error.message
    });
  }
};

// Get a specific campaign by ID
exports.getCampaignById = async (req, res) => {
  try {
    const campaign = await Fundraising.findById(req.params.id)
      .populate('createdBy', 'username firstName lastName')
      .populate('donors.userId', 'username firstName lastName');
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy chiến dịch gây quỹ'
      });
    }
    
    res.status(200).json({
      success: true,
      data: campaign
    });
  } catch (error) {
    console.error('Error in getCampaignById:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin chiến dịch gây quỹ',
      error: error.message
    });
  }
};

// Create a new fundraising campaign
exports.createCampaign = async (req, res) => {
  try {
    const { title, description, goal, endDate, category } = req.body;
    
    if (!title || !description || !goal || !endDate || !category) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin chiến dịch'
      });
    }
    
    const campaign = new Fundraising({
      title,
      description,
      goal: parseFloat(goal),
      endDate,
      category,
      createdBy: req.user.id
    });
    
    // Handle image upload if exists
    if (req.file) {
      campaign.image = req.file.buffer;
      campaign.imageType = req.file.mimetype;
    }
    
    await campaign.save();
    
    res.status(201).json({
      success: true,
      message: 'Tạo chiến dịch gây quỹ thành công',
      data: campaign
    });
  } catch (error) {
    console.error('Error in createCampaign:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo chiến dịch gây quỹ',
      error: error.message
    });
  }
};

// Update a campaign
exports.updateCampaign = async (req, res) => {
  try {
    const { title, description, goal, endDate, category, isActive } = req.body;
    const campaignId = req.params.id;
    
    const campaign = await Fundraising.findById(campaignId);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy chiến dịch gây quỹ'
      });
    }
    
    // Check if user is the creator of the campaign
    if (campaign.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền cập nhật chiến dịch này'
      });
    }
    
    // Update campaign details
    if (title) campaign.title = title;
    if (description) campaign.description = description;
    if (goal) campaign.goal = parseFloat(goal);
    if (endDate) campaign.endDate = endDate;
    if (category) campaign.category = category;
    if (isActive !== undefined) campaign.isActive = isActive;
    
    // Handle image upload if exists
    if (req.file) {
      campaign.image = req.file.buffer;
      campaign.imageType = req.file.mimetype;
    }
    
    await campaign.save();
    
    res.status(200).json({
      success: true,
      message: 'Cập nhật chiến dịch gây quỹ thành công',
      data: campaign
    });
  } catch (error) {
    console.error('Error in updateCampaign:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật chiến dịch gây quỹ',
      error: error.message
    });
  }
};

// Delete a campaign
exports.deleteCampaign = async (req, res) => {
  try {
    const campaignId = req.params.id;
    
    const campaign = await Fundraising.findById(campaignId);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy chiến dịch gây quỹ'
      });
    }
    
    // Check if user is the creator of the campaign
    if (campaign.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa chiến dịch này'
      });
    }
    
    await Fundraising.findByIdAndDelete(campaignId);
    
    res.status(200).json({
      success: true,
      message: 'Xóa chiến dịch gây quỹ thành công'
    });
  } catch (error) {
    console.error('Error in deleteCampaign:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa chiến dịch gây quỹ',
      error: error.message
    });
  }
};

// Make a donation to a campaign
exports.makeDonation = async (req, res) => {
  try {
    const { amount, message, isAnonymous } = req.body;
    const campaignId = req.params.id;
    
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp số tiền quyên góp hợp lệ'
      });
    }
    
    const campaign = await Fundraising.findById(campaignId);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy chiến dịch gây quỹ'
      });
    }
    
    if (!campaign.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Chiến dịch này đã kết thúc'
      });
    }
    
    // Create donation record
    const donation = {
      userId: req.user.id,
      amount: parseFloat(amount),
      message: message || '',
      isAnonymous: isAnonymous || false,
      date: new Date()
    };
    
    // Update campaign with new donation
    campaign.donors.push(donation);
    campaign.raised += parseFloat(amount);
    
    await campaign.save();
    
    // Send notification to campaign creator
    if (global.io) {
      const notification = {
        type: 'donation',
        message: `${isAnonymous ? 'Một người ẩn danh' : 'Bạn'} đã ủng hộ ${amount.toLocaleString('vi-VN')}đ cho chiến dịch "${campaign.title}"`,
        link: `/dashboard/fundraising/${campaignId}`,
        createdAt: new Date()
      };
      
      global.io.to(campaign.createdBy.toString()).emit('receiveNotification', notification);
    }
    
    res.status(200).json({
      success: true,
      message: 'Quyên góp thành công',
      data: campaign
    });
  } catch (error) {
    console.error('Error in makeDonation:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi thực hiện quyên góp',
      error: error.message
    });
  }
};

// Get user's created campaigns
exports.getUserCampaigns = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const campaigns = await Fundraising.find({ createdBy: userId })
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: campaigns
    });
  } catch (error) {
    console.error('Error in getUserCampaigns:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách chiến dịch của người dùng',
      error: error.message
    });
  }
};

// Get user's donations
exports.getUserDonations = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find all campaigns where user has donated
    const campaigns = await Fundraising.find({
      'donors.userId': mongoose.Types.ObjectId(userId)
    }).populate('createdBy', 'username profileImage');
    
    // Extract only the donations made by this user
    const donations = campaigns.map(campaign => {
      const userDonations = campaign.donors.filter(
        donor => donor.userId && donor.userId.toString() === userId
      );
      
      return {
        campaignId: campaign._id,
        campaignTitle: campaign.title,
        campaignImage: campaign.image,
        createdBy: campaign.createdBy,
        donations: userDonations
      };
    });
    
    res.status(200).json({
      success: true,
      data: donations
    });
  } catch (error) {
    console.error('Error in getUserDonations:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách quyên góp của người dùng',
      error: error.message
    });
  }
};

// Get campaign image
exports.getCampaignImage = async (req, res) => {
  try {
    const campaign = await Fundraising.findById(req.params.id);
    
    if (!campaign || !campaign.image) {
      // Return default image if no image found
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }
    
    // Set the appropriate content type
    res.set('Content-Type', campaign.imageType);
    
    // Send the image data
    res.send(campaign.image);
  } catch (error) {
    console.error('Error in getCampaignImage:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy hình ảnh chiến dịch',
      error: error.message
    });
  }
}; 